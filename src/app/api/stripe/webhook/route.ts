import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import { constructStripeEvent } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = (await headers()).get('stripe-signature') as string;

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = constructStripeEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Get metadata from session
        const userId = session.metadata?.userId;
        const creditPackageId = session.metadata?.creditPackageId;
        const credits = parseInt(session.metadata?.credits || '0');

        if (!userId || !creditPackageId || !credits) {
          console.error('Missing metadata in checkout session:', session.id);
          return NextResponse.json(
            { error: 'Invalid session metadata' },
            { status: 400 }
          );
        }

        // Start a transaction to update user credits and transaction record
        await prisma.$transaction(async (tx) => {
          // Find the transaction record
          const transaction = await tx.transaction.findFirst({
            where: {
              stripeSessionId: session.id,
              status: 'PENDING',
            },
          });

          if (!transaction) {
            throw new Error('Transaction not found');
          }

          // Update transaction status
          await tx.transaction.update({
            where: { id: transaction.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              stripePaymentIntentId: session.payment_intent as string,
            },
          });

          // Update user's credit balance
          await tx.user.update({
            where: { id: userId },
            data: {
              creditBalance: {
                increment: credits,
              },
            },
          });
        });

        console.log(`Payment successful for user ${userId}: ${credits} credits added`);
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Update transaction status to cancelled
        await prisma.transaction.updateMany({
          where: {
            stripeSessionId: session.id,
            status: 'PENDING',
          },
          data: {
            status: 'CANCELLED',
          },
        });

        console.log(`Checkout session expired: ${session.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}