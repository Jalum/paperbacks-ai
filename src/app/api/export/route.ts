import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { BookDetails, DesignData } from '@/types'
import prisma from '@/lib/prisma'
import { generateCoverCanvas } from '@/lib/serverCanvas'
import { PDFDocument } from 'pdf-lib'

interface ExportRequest {
  projectId?: string
  format: 'png' | 'pdf'
  dpi?: number
  bookDetails: BookDetails
  designData: DesignData
  coverImageUrl?: string
  aiBackImageUrl?: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('Export API: Starting export request')
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      console.log('Export API: No user session')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('Export API: User authenticated:', session.user.email)
    const body = await request.json() as ExportRequest
    console.log('Export API: Request body received:', {
      format: body.format,
      dpi: body.dpi,
      hasBookDetails: !!body.bookDetails,
      hasDesignData: !!body.designData
    })
    
    // Validate request
    if (!body.format || !['png', 'pdf'].includes(body.format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be png or pdf' },
        { status: 400 }
      )
    }

    if (!body.bookDetails || !body.designData) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      )
    }

    // Find user for credit checking
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check credit balance (basic implementation)
    const requiredCredits = body.format === 'pdf' ? 5 : 3 // PDF costs more
    if (user.creditBalance < requiredCredits) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 402 }
      )
    }

    console.log('Export API: Starting export generation')
    const dpi = body.dpi || 300
    const exportData = await generateCoverExport(body, dpi)
    console.log('Export API: Export data generated, size:', exportData.length, 'bytes')

    const filename = generateFilename(body.bookDetails, body.format, dpi)
    
    // Deduct credits and track download
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { creditBalance: { decrement: requiredCredits } }
      }),
      prisma.download.create({
        data: {
          userId: user.id,
          projectId: body.projectId || null,
          fileType: body.format.toUpperCase(),
          creditsUsed: requiredCredits,
          fileSize: Buffer.byteLength(exportData),
          fileName: filename
        }
      })
    ])

    // Return the file
    const contentType = body.format === 'pdf' ? 'application/pdf' : 'image/png'
    
    return new NextResponse(exportData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(exportData).toString()
      }
    })

  } catch (error) {
    console.error('Export API: Fatal error:', error)
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Export API: Error message:', error.message)
      console.error('Export API: Error stack:', error.stack)
    }
    
    return NextResponse.json(
      { 
        error: 'Export failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function generateCoverExport(
  data: ExportRequest, 
  dpi: number
): Promise<Buffer> {
  console.log('generateCoverExport: Starting canvas generation')
  
  try {
    if (data.format === 'png') {
      // Generate PNG using node-canvas
      const pngBuffer = await generateCoverCanvas({
        bookDetails: data.bookDetails,
        designData: data.designData,
        coverImageUrl: data.coverImageUrl,
        aiBackImageUrl: data.aiBackImageUrl,
        dpi
      })
      console.log('generateCoverExport: PNG generated, size:', pngBuffer.length, 'bytes')
      return pngBuffer
    } else {
      // Generate PDF from PNG using pdf-lib
      const pngBuffer = await generateCoverCanvas({
        bookDetails: data.bookDetails,
        designData: data.designData,
        coverImageUrl: data.coverImageUrl,
        aiBackImageUrl: data.aiBackImageUrl,
        dpi
      })
      
      // Convert PNG to PDF
      const pdfDoc = await PDFDocument.create()
      const pngImage = await pdfDoc.embedPng(pngBuffer)
      
      // Calculate PDF dimensions
      const pdfDimensions = calculatePDFDimensions(data.bookDetails)
      const page = pdfDoc.addPage([pdfDimensions.width, pdfDimensions.height])
      
      // Add the PNG to the PDF page
      page.drawImage(pngImage, {
        x: 0,
        y: 0,
        width: pdfDimensions.width,
        height: pdfDimensions.height
      })
      
      const pdfBytes = await pdfDoc.save()
      console.log('generateCoverExport: PDF generated, size:', pdfBytes.length, 'bytes')
      return Buffer.from(pdfBytes)
    }
  } catch (error) {
    console.error('generateCoverExport: Canvas generation error:', error)
    throw error
  }
}


function calculatePDFDimensions(bookDetails: BookDetails) {
  const [frontWidth, frontHeight] = bookDetails.trimSize.split('x').map(d => parseFloat(d))
  const spineWidth = calculateSpineWidthMM(bookDetails.pageCount, bookDetails.paperType) / 25.4
  const bleedInches = 0.125
  
  const totalWidthPt = ((frontWidth * 2) + spineWidth + (bleedInches * 2)) * 72 // Convert inches to points
  const totalHeightPt = (frontHeight + (bleedInches * 2)) * 72 // Convert inches to points
  
  return { width: totalWidthPt, height: totalHeightPt }
}

function calculateSpineWidthMM(pageCount: number, paperType: string): number {
  // Same logic as client-side calculateSpineWidth function
  const pageThickness = paperType === 'cream' ? 0.0025 : 0.002252 // inches per page
  const coverThickness = 0.0102 // inches for cover
  const spineWidthInches = (pageCount * pageThickness) + coverThickness
  return spineWidthInches * 25.4 // Convert to mm
}


function generateFilename(bookDetails: BookDetails, format: string, dpi: number): string {
  const title = bookDetails.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
  const timestamp = new Date().toISOString().split('T')[0]
  return `${title}_${dpi}dpi_${timestamp}.${format}`
}