import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Payment successful:', session.id);
        
        // Here you would typically:
        // 1. Update user subscription in your database
        // 2. Send confirmation email
        // 3. Grant access to premium features
        // 4. Update user's plan in your system
        
        // Example: Update user subscription
        // await updateUserSubscription({
        //   userId: session.metadata.userId,
        //   planId: session.metadata.planId,
        //   isAnnual: session.metadata.isAnnual === 'true',
        //   stripeCustomerId: session.customer,
        //   stripeSubscriptionId: session.subscription,
        // });
        
        break;

      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription updated:', subscription.id);
        
        // Handle subscription changes (upgrade/downgrade/cancellation)
        // await updateUserSubscriptionStatus(subscription);
        
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription;
        console.log('Subscription cancelled:', deletedSubscription.id);
        
        // Handle subscription cancellation
        // await cancelUserSubscription(deletedSubscription);
        
        break;

      case 'invoice.payment_failed':
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Payment failed for invoice:', invoice.id);
        
        // Handle failed payments
        // await handleFailedPayment(invoice);
        
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
