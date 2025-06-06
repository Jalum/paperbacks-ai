import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { BookDetails, DesignData } from '@/types'

interface CreateProjectRequest {
  name?: string
  bookData: BookDetails
  designData: DesignData
  coverImageUrl?: string
  aiBackImageUrl?: string
}

// GET /api/projects - List user's projects
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Find user first
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      take: limit,
      skip: offset,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        bookData: true,
        designData: true,
        coverImageUrl: true,
        aiBackImageUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    const totalCount = await prisma.project.count({
      where: { userId: user.id }
    })

    return NextResponse.json({
      projects,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + projects.length < totalCount
      }
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json() as CreateProjectRequest

    if (!body.bookData || !body.designData) {
      return NextResponse.json(
        { error: 'bookData and designData are required' },
        { status: 400 }
      )
    }

    // Find user first
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const project = await prisma.project.create({
      data: {
        name: body.name || 'Untitled Project',
        bookData: body.bookData as object,
        designData: body.designData as object,
        coverImageUrl: body.coverImageUrl,
        aiBackImageUrl: body.aiBackImageUrl,
        status: 'DRAFT',
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        bookData: true,
        designData: true,
        coverImageUrl: true,
        aiBackImageUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}