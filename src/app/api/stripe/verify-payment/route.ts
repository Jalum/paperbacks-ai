import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Check if transaction is completed
    const transaction = await prisma.transaction.findFirst({
      where: {
        stripeSessionId: sessionId,
        userId: session.user.id,
      },
      include: {
        creditPackage: true,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    if (transaction.status !== 'COMPLETED') {
      return NextResponse.json(
        { 
          error: 'Payment is still being processed. Please wait a moment and refresh the page.',
          status: transaction.status,
        },
        { status: 202 } // Accepted but not complete
      );
    }

    // Get updated user credit balance
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { creditBalance: true },
    });

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        credits: transaction.creditsAmount,
        amount: transaction.amountCents / 100,
        completedAt: transaction.completedAt,
        packageName: transaction.creditPackage.name,
      },
      creditBalance: user?.creditBalance || 0,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}