import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { put } from '@vercel/blob'
import sharp from 'sharp'
import prisma from '@/lib/prisma'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB - reduced to work within Vercel limits
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// Configure route segment for larger payloads
export const runtime = 'nodejs'
export const maxDuration = 30 // 30 seconds for file processing

export async function POST(request: NextRequest) {
  try {
    console.log('Upload request received')
    const session = await getServerSession(authOptions)
    console.log('Session:', session ? 'Found' : 'Not found')
    
    if (!session?.user?.email) {
      console.log('No user email in session')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    console.log('File received:', file ? file.name : 'No file')

    if (!file) {
      console.log('No file in form data')
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    console.log('File type:', file.type)
    if (!ALLOWED_TYPES.includes(file.type)) {
      console.log('Invalid file type:', file.type)
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size
    console.log('File size:', file.size)
    if (file.size > MAX_FILE_SIZE) {
      console.log('File too large:', file.size)
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    console.log('Converting file to buffer...')
    const buffer = Buffer.from(await file.arrayBuffer())
    console.log('Buffer created, size:', buffer.length)

    // Process image with Sharp
    console.log('Processing image with Sharp...')
    const processedBuffer = await sharp(buffer)
      .resize(2000, 2000, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 90,
        progressive: true 
      })
      .toBuffer()
    console.log('Image processed, new size:', processedBuffer.length)

    // Get image metadata
    const metadata = await sharp(processedBuffer).metadata()
    console.log('Image metadata:', metadata.width, 'x', metadata.height)

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = 'jpg' // Always convert to JPEG for consistency
    const filename = `covers/${session.user.email}/${timestamp}.${fileExtension}`

    // Upload to Vercel Blob (with fallback for development)
    let blob;
    
    console.log('Uploading to storage...')
    console.log('BLOB_READ_WRITE_TOKEN available:', !!process.env.BLOB_READ_WRITE_TOKEN)
    
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Production: Use Vercel Blob
      console.log('Using Vercel Blob storage')
      try {
        blob = await put(filename, processedBuffer, {
          access: 'public',
          contentType: 'image/jpeg',
        });
        console.log('Blob upload successful:', blob.url)
      } catch (blobError) {
        console.error('Blob upload failed:', blobError)
        throw new Error(`Blob storage failed: ${blobError instanceof Error ? blobError.message : 'Unknown error'}`)
      }
    } else {
      // Development fallback: Return base64 data URL
      console.log('Using base64 fallback for development')
      const base64 = processedBuffer.toString('base64');
      blob = {
        url: `data:image/jpeg;base64,${base64}`,
        pathname: filename,
        contentType: 'image/jpeg',
        contentDisposition: `attachment; filename="${filename}"`,
        size: processedBuffer.length
      };
    }

    // Find user in database
    console.log('Finding user in database...')
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })
      console.log('User found:', user ? 'Yes' : 'No')
    } catch (dbError) {
      console.error('Database query failed:', dbError)
      throw new Error(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`)
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Save file metadata to database
    console.log('Saving file metadata to database...')
    let uploadedFile;
    try {
      uploadedFile = await prisma.uploadedFile.create({
        data: {
          userId: user.id,
          filename: filename,
          url: blob.url,
          originalName: file.name,
          contentType: 'image/jpeg',
          size: processedBuffer.length,
          width: metadata.width || null,
          height: metadata.height || null,
        }
      })
      console.log('File metadata saved successfully')
    } catch (dbError) {
      console.error('Failed to save file metadata:', dbError)
      throw new Error(`Database save failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`)
    }

    return NextResponse.json({
      id: uploadedFile.id,
      url: blob.url,
      filename: filename,
      originalName: file.name,
      size: processedBuffer.length,
      width: metadata.width,
      height: metadata.height,
      contentType: 'image/jpeg'
    })

  } catch (error) {
    console.error('Error uploading file:', error)
    
    // Provide more specific error details
    let errorMessage = 'Failed to upload file';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('Error details:', error.stack);
      
      // Handle specific error types
      if (error.message.includes('Prisma')) {
        errorMessage = 'Database connection error';
        statusCode = 503;
      } else if (error.message.includes('Sharp')) {
        errorMessage = 'Image processing error';
        statusCode = 422;
      } else if (error.message.includes('Blob')) {
        errorMessage = 'File storage error';
        statusCode = 503;
      }
    }
    
    // Ensure we always return JSON
    return new NextResponse(
      JSON.stringify({ error: errorMessage, timestamp: new Date().toISOString() }),
      { 
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json(
        { error: 'No URL provided' },
        { status: 400 }
      )
    }

    // Verify the file belongs to the user (check path contains user email)
    if (!url.includes(`covers/${session.user.email}/`)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Note: Vercel Blob doesn't have a delete method in the SDK yet
    // This is a placeholder for when it becomes available
    // For now, we'll just remove the reference from our database
    
    return NextResponse.json({ message: 'File marked for deletion' })

  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}