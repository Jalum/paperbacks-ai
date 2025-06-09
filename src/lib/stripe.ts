import Stripe from 'stripe';

// Initialize Stripe lazily to avoid build-time errors
let _stripe: Stripe | null = null;

export const stripe = new Proxy({} as Stripe, {
  get(target, prop) {
    if (!_stripe) {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('Missing STRIPE_SECRET_KEY environment variable');
      }
      _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-05-28.basil',
        typescript: true,
      });
    }
    return _stripe[prop as keyof Stripe];
  }
});

// Helper function to create checkout session
export async function createCheckoutSession({
  userId,
  creditPackageId,
  credits,
  priceInCents,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  creditPackageId: string;
  credits: number;
  priceInCents: number;
  successUrl: string;
  cancelUrl: string;
}) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${credits} Credits for Paperbacks.AI`,
            description: `Add ${credits} credits to your account for creating book covers`,
          },
          unit_amount: priceInCents,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      creditPackageId,
      credits: credits.toString(),
    },
  });

  return session;
}

// Helper function to verify webhook signature
export function constructStripeEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}