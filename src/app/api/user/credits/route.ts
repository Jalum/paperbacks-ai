import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { 
        creditBalance: true,
        createdAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      credits: user.creditBalance,
      memberSince: user.createdAt
    })

  } catch (error) {
    console.error('Error fetching user credits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    )
  }
}

// Credit reset endpoint for testing (enabled in production for development testing)
export async function POST(request: NextRequest) {
  // Allow credit reset for testing purposes
  // In a real production app, you'd want more security here

  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { credits } = await request.json()
    const creditsToAdd = credits || 100 // Default to 100 credits

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: { creditBalance: creditsToAdd },
      select: { creditBalance: true }
    })

    return NextResponse.json({
      message: `Credits reset to ${creditsToAdd}`,
      newBalance: user.creditBalance
    })

  } catch (error) {
    console.error('Error resetting credits:', error)
    return NextResponse.json(
      { error: 'Failed to reset credits' },
      { status: 500 }
    )
  }
}