import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createCheckoutSession } from '@/lib/stripe';

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
    const { creditPackageId } = body;

    if (!creditPackageId) {
      return NextResponse.json(
        { error: 'Credit package ID is required' },
        { status: 400 }
      );
    }

    // Get credit package details
    const creditPackage = await prisma.creditPackage.findUnique({
      where: { id: creditPackageId },
    });

    if (!creditPackage || !creditPackage.active) {
      return NextResponse.json(
        { error: 'Invalid credit package' },
        { status: 400 }
      );
    }

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        userId: session.user.id,
        creditPackageId: creditPackage.id,
        creditsAmount: creditPackage.credits,
        amountCents: creditPackage.priceCents,
        currency: creditPackage.currency,
        status: 'PENDING',
      },
    });

    // Create Stripe checkout session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
    const stripeSession = await createCheckoutSession({
      userId: session.user.id,
      creditPackageId: creditPackage.id,
      credits: creditPackage.credits,
      priceInCents: creditPackage.priceCents,
      successUrl: `${baseUrl}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/credits`,
    });

    // Update transaction with Stripe session ID
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { stripeSessionId: stripeSession.id },
    });

    return NextResponse.json({ 
      checkoutUrl: stripeSession.url,
      sessionId: stripeSession.id,
    });
  } catch (error) {
    console.error('Stripe checkout session error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}