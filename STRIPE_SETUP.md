# Stripe Payment Integration Setup

## Overview
The Stripe payment integration allows users to purchase credit packages to use for AI image generation and exports in Paperbacks.AI.

## Setup Instructions

### 1. Create Stripe Account
1. Sign up at [stripe.com](https://stripe.com)
2. Complete your business profile
3. Enable your account for live payments (when ready for production)

### 2. Get API Keys
1. In Stripe Dashboard, go to Developers > API keys
2. Copy your test keys (for development):
   - Publishable key (starts with `pk_test_`)
   - Secret key (starts with `sk_test_`)
3. For production, use live keys (starts with `pk_live_` and `sk_live_`)

### 3. Configure Environment Variables
Add these to your `.env.local`:
```
STRIPE_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 4. Set Up Webhook
1. In Stripe Dashboard, go to Developers > Webhooks
2. Click "Add endpoint"
3. Set endpoint URL:
   - Local testing: Use [ngrok](https://ngrok.com) or similar to expose localhost
   - Production: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `checkout.session.expired`
5. Copy the webhook signing secret and add to environment variables

### 5. Test the Integration
1. Use Stripe test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
2. Any future expiry date and CVC

## Credit System

### Credit Costs
- AI Image Generation: 10 credits
- PNG Export: 3 credits
- PDF Export: 5 credits

### Credit Packages
- Starter Pack: 50 credits for $4.99
- Creator Pack: 200 credits for $14.99 (Popular)
- Pro Pack: 500 credits for $29.99
- Enterprise Pack: 1000 credits for $49.99

### Initial Credits
New users receive 100 free credits upon sign up.

## API Endpoints

### `/api/stripe/checkout-session` (POST)
Creates a Stripe checkout session for purchasing credits.

### `/api/stripe/webhook` (POST)
Handles Stripe webhook events to confirm payments.

### `/api/stripe/verify-payment` (POST)
Verifies payment status after redirect from Stripe.

### `/api/credit-packages` (GET)
Returns available credit packages.

### `/api/user/transactions` (GET)
Returns user's transaction history.

## Database Schema

### Transaction Table
- Tracks all credit purchases
- Links to Stripe payment intent IDs
- Stores transaction status and amounts

### CreditPackage Table
- Defines available credit packages
- Configurable pricing and credit amounts

## Security Considerations
1. Always verify webhook signatures
2. Use HTTPS in production
3. Store sensitive keys securely (never commit to git)
4. Implement rate limiting on payment endpoints
5. Monitor for unusual purchase patterns

## Testing Checklist
- [ ] Create test purchase
- [ ] Verify webhook receives event
- [ ] Check credits are added to user account
- [ ] Test cancelled/expired sessions
- [ ] Verify transaction history updates
- [ ] Test insufficient credit scenarios
- [ ] Verify AI generation deducts credits