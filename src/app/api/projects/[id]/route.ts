import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { BookDetails, DesignData } from '@/types'

interface UpdateProjectRequest {
  name?: string
  bookData?: BookDetails
  designData?: DesignData
  coverImageUrl?: string
  aiBackImageUrl?: string
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
}

// GET /api/projects/[id] - Get a specific project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
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

    const project = await prisma.project.findFirst({
      where: { 
        id: resolvedParams.id,
        userId: user.id 
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

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

// PUT /api/projects/[id] - Update a project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json() as UpdateProjectRequest

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

    // Check if project exists and belongs to user
    const existingProject = await prisma.project.findFirst({
      where: { 
        id: resolvedParams.id,
        userId: user.id 
      },
      select: { id: true }
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Update project
    const project = await prisma.project.update({
      where: { id: resolvedParams.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.bookData && { bookData: body.bookData as object }),
        ...(body.designData && { designData: body.designData as object }),
        ...(body.coverImageUrl !== undefined && { coverImageUrl: body.coverImageUrl }),
        ...(body.aiBackImageUrl !== undefined && { aiBackImageUrl: body.aiBackImageUrl }),
        ...(body.status && { status: body.status }),
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

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
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

    // Check if project exists and belongs to user
    const existingProject = await prisma.project.findFirst({
      where: { 
        id: resolvedParams.id,
        userId: user.id 
      },
      select: { id: true }
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Delete project
    await prisma.project.delete({
      where: { id: resolvedParams.id }
    })

    return NextResponse.json({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}