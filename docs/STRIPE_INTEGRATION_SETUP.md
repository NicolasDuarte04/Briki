# Stripe Integration Setup Guide

This guide will help you set up Stripe payments for your Briki pricing module.

## 1. Stripe Account Setup

1. **Create a Stripe Account**: Go to [stripe.com](https://stripe.com) and create an account
2. **Get API Keys**: Navigate to [Dashboard > API Keys](https://dashboard.stripe.com/apikeys)
3. **Create Products and Prices**: In your Stripe Dashboard, create products for each plan:
   - Starter Plan (Monthly & Annual)
   - Pro Plan (Monthly & Annual) 
   - Team Plan (Monthly & Annual)
   - Enterprise Plan (Monthly & Annual)

## 2. Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Your domain for success/cancel URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe Price IDs (get these from your Stripe Dashboard)
STRIPE_STARTER_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_STARTER_YEARLY_PRICE_ID=price_xxxxx
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_PRO_YEARLY_PRICE_ID=price_xxxxx
STRIPE_TEAM_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_TEAM_YEARLY_PRICE_ID=price_xxxxx
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_xxxxx
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_xxxxx
```

## 3. Webhook Setup

1. **Create Webhook Endpoint**: In Stripe Dashboard, go to Webhooks
2. **Add Endpoint**: `https://yourdomain.com/api/stripe/webhook`
3. **Select Events**:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. **Copy Webhook Secret**: Add to your environment variables

## 4. Usage

### Basic Usage (with Stripe integration)

```tsx
import { PricingModule } from '@/components/ui/pricing-module';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'For independent brokers',
    priceMonthly: 49,
    priceYearly: 39, // 20% discount
    users: 'Up to 2 seats',
    features: [
      { label: '500 AI messages/month', included: true },
      { label: '200 PDF pages/month', included: true },
      // ... more features
    ],
  },
  // ... other plans
];

<PricingModule
  title="Pricing Plans"
  subtitle="Choose a plan that fits your needs"
  plans={plans}
  defaultAnnual={false}
  userId="user_123" // Optional: pass user ID for tracking
/>
```

### Custom Handler Usage

```tsx
<PricingModule
  plans={plans}
  onPlanSelect={(planId, isAnnual) => {
    // Custom logic instead of Stripe
    console.log('Selected plan:', planId, isAnnual);
  }}
/>
```

## 5. Database Integration

You'll need to update your database schema to track subscriptions:

```sql
-- Add to your existing user table or create a subscriptions table
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN subscription_status TEXT;
ALTER TABLE users ADD COLUMN current_plan TEXT;
ALTER TABLE users ADD COLUMN plan_billing TEXT; -- 'monthly' or 'annual'
```

## 6. Webhook Handler Implementation

The webhook handler is already set up in `/api/stripe/webhook/route.ts`. You'll need to implement the actual database updates:

```typescript
// Example implementation in the webhook handler
case 'checkout.session.completed':
  const session = event.data.object as Stripe.Checkout.Session;
  
  await updateUserSubscription({
    userId: session.metadata.userId,
    planId: session.metadata.planId,
    isAnnual: session.metadata.isAnnual === 'true',
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
  });
  break;
```

## 7. Testing

1. **Test Mode**: Use Stripe test keys (pk_test_... and sk_test_...)
2. **Test Cards**: Use Stripe's test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
3. **Test Webhooks**: Use Stripe CLI for local testing:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

## 8. Production Deployment

1. **Switch to Live Keys**: Replace test keys with live keys
2. **Update Webhook URL**: Point to your production domain
3. **SSL Certificate**: Ensure your domain has valid SSL
4. **Environment Variables**: Set production environment variables

## 9. Security Considerations

- Never expose secret keys in client-side code
- Validate webhook signatures
- Use HTTPS in production
- Implement proper error handling
- Log all payment events for audit

## 10. Monitoring

- Set up Stripe Dashboard alerts
- Monitor failed payments
- Track subscription metrics
- Set up error logging for webhook failures

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**: Check URL and SSL certificate
2. **Invalid signature**: Verify webhook secret
3. **Price ID not found**: Ensure price IDs are correct in environment variables
4. **CORS errors**: Check API route configuration

### Debug Mode

Enable debug logging by adding to your environment:
```bash
STRIPE_DEBUG=true
```

This will log all Stripe API calls and responses.
