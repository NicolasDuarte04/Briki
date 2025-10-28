import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  syncSubscriptionFromStripe,
  updateProfileWithCustomerId,
} from '@/lib/subscription';
import {
  checkEventProcessed,
  recordEventProcessed,
  getUserIdFromCustomer,
  extractSubscriptionId,
} from '@/lib/webhook-idempotency';
import { logRequest } from '@/lib/api-logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const ROUTE_NAME = '/api/stripe/webhook';

/**
 * Status transition rules for subscriptions
 * Based on Stripe's subscription lifecycle
 */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  trialing: ['active', 'past_due', 'canceled'],
  active: ['past_due', 'canceled', 'unpaid'],
  past_due: ['active', 'canceled', 'unpaid'],
  unpaid: ['canceled'],
  canceled: [], // Terminal state
  incomplete: ['incomplete_expired', 'active'],
  incomplete_expired: [], // Terminal state
};

/**
 * Validates and processes checkout.session.completed events
 */
async function handleCheckoutSessionCompleted(
  event: Stripe.Event,
  session: Stripe.Checkout.Session
): Promise<{ success: boolean; userId?: string; subscriptionId?: string; error?: string }> {
  const userId = session.metadata?.userId;

  if (!userId || userId === 'anonymous') {
    return {
      success: false,
      error: 'No userId in session metadata',
    };
  }

  // Link customer to profile if available
  if (session.customer && typeof session.customer === 'string') {
    try {
      await updateProfileWithCustomerId(userId, session.customer);
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to link customer: ${error.message}`,
      };
    }
  }

  // Sync subscription if created
  if (session.subscription) {
    const subscriptionId = extractSubscriptionId(session);
    if (subscriptionId) {
      try {
        await syncSubscriptionFromStripe(stripe, subscriptionId, userId);
        revalidatePath('/profile', 'layout');
        return { success: true, userId, subscriptionId };
      } catch (error: any) {
        return {
          success: false,
          error: `Failed to sync subscription: ${error.message}`,
          subscriptionId,
        };
      }
    }
  }

  return { success: true, userId };
}

/**
 * Handles subscription created/updated events
 */
async function handleSubscriptionEvent(
  event: Stripe.Event,
  subscription: Stripe.Subscription
): Promise<{ success: boolean; userId?: string; subscriptionId: string; error?: string }> {
  const subscriptionId = subscription.id;
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

  // Get userId from customer metadata
  const userId = await getUserIdFromCustomer(stripe, customerId);

  if (!userId) {
    return {
      success: false,
      error: `Could not find userId for subscription ${subscriptionId}`,
      subscriptionId,
    };
  }

  try {
    await syncSubscriptionFromStripe(stripe, subscriptionId, userId);
    revalidatePath('/profile', 'layout');
    return { success: true, userId, subscriptionId };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to sync subscription: ${error.message}`,
      userId,
      subscriptionId,
    };
  }
}

/**
 * Handles subscription deleted events
 */
async function handleSubscriptionDeleted(
  event: Stripe.Event,
  subscription: Stripe.Subscription
): Promise<{ success: boolean; userId?: string; subscriptionId: string; error?: string }> {
  const subscriptionId = subscription.id;
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

  const userId = await getUserIdFromCustomer(stripe, customerId);

  try {
    const { prisma } = await import('@/lib/prisma');
    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (dbSubscription) {
      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: {
          status: 'canceled',
          canceledAt: new Date(),
          updatedAt: new Date(),
        },
      });
      revalidatePath('/profile', 'layout');
      return { success: true, userId: userId || undefined, subscriptionId };
    }

    // Subscription not found in DB - log but don't error
    return {
      success: true,
      subscriptionId,
      error: 'Subscription not found in database',
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to cancel subscription: ${error.message}`,
      userId: userId || undefined,
      subscriptionId,
    };
  }
}

/**
 * Handles invoice.paid events
 */
async function handleInvoicePaid(
  event: Stripe.Event,
  invoice: Stripe.Invoice
): Promise<{ success: boolean; userId?: string; subscriptionId?: string; error?: string }> {
  const subscriptionId = extractSubscriptionId(invoice);

  if (!subscriptionId) {
    return { success: false, error: 'No subscription ID in invoice' };
  }

  const customerId =
    typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

  if (!customerId) {
    return { success: false, error: 'No customer ID in invoice', subscriptionId };
  }

  const userId = await getUserIdFromCustomer(stripe, customerId);

  if (!userId) {
    return {
      success: false,
      error: 'Could not find userId for invoice customer',
      subscriptionId,
    };
  }

  try {
    // Sync subscription to ensure status is updated to active if it was past_due
    await syncSubscriptionFromStripe(stripe, subscriptionId, userId);
    revalidatePath('/profile', 'layout');
    return { success: true, userId, subscriptionId };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to sync subscription after payment: ${error.message}`,
      userId,
      subscriptionId,
    };
  }
}

/**
 * Handles invoice.payment_failed events
 */
async function handleInvoicePaymentFailed(
  event: Stripe.Event,
  invoice: Stripe.Invoice
): Promise<{ success: boolean; userId?: string; subscriptionId?: string; error?: string }> {
  const subscriptionId = extractSubscriptionId(invoice);

  if (!subscriptionId) {
    return { success: false, error: 'No subscription ID in invoice' };
  }

  try {
    const { prisma } = await import('@/lib/prisma');
    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (dbSubscription) {
      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: {
          status: 'past_due',
          updatedAt: new Date(),
        },
      });
      revalidatePath('/profile', 'layout');
      return {
        success: true,
        userId: dbSubscription.userId,
        subscriptionId,
      };
    }

    return {
      success: false,
      error: 'Subscription not found in database',
      subscriptionId,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to update subscription status: ${error.message}`,
      subscriptionId,
    };
  }
}

/**
 * Handles customer.subscription.trial_will_end events
 * This is informational - we sync the subscription to ensure trial_end is accurate
 */
async function handleTrialWillEnd(
  event: Stripe.Event,
  subscription: Stripe.Subscription
): Promise<{ success: boolean; userId?: string; subscriptionId: string; error?: string }> {
  const subscriptionId = subscription.id;
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

  const userId = await getUserIdFromCustomer(stripe, customerId);

  if (!userId) {
    return {
      success: false,
      error: `Could not find userId for subscription ${subscriptionId}`,
      subscriptionId,
    };
  }

  try {
    // Sync to ensure trial_end date is accurate
    await syncSubscriptionFromStripe(stripe, subscriptionId, userId);
    return { success: true, userId, subscriptionId };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to sync subscription: ${error.message}`,
      userId,
      subscriptionId,
    };
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // Log request start
  logRequest({
    requestId,
    route: ROUTE_NAME,
    phase: 'start',
  });

  // Read raw body for signature verification
  const body = await request.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header', requestId },
      { status: 400 }
    );
  }

  // Verify webhook signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    const elapsedMs = Date.now() - startTime;
    logRequest({
      requestId,
      route: ROUTE_NAME,
      phase: 'error',
      elapsedMs,
      status: 400,
      error: {
        name: err.name || 'SignatureVerificationError',
        message: err.message || 'Invalid signature',
      },
    });

    return NextResponse.json(
      { error: 'Invalid signature', requestId },
      { status: 400 }
    );
  }

  // Check idempotency - if event already processed, return success
  const existingEvent = await checkEventProcessed(event.id);
  if (existingEvent) {
    const elapsedMs = Date.now() - startTime;
    logRequest({
      requestId,
      route: ROUTE_NAME,
      phase: 'success',
      elapsedMs,
      status: 200,
    });

    return NextResponse.json({
      received: true,
      requestId,
      message: 'Event already processed',
      eventId: event.id,
    });
  }

  // Process event based on type
  let result: {
    success: boolean;
    userId?: string;
    subscriptionId?: string;
    error?: string;
  };
  let userId: string | undefined;
  let subscriptionId: string | undefined;

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        result = await handleCheckoutSessionCompleted(
          event,
          event.data.object as Stripe.Checkout.Session
        );
        userId = result.userId;
        subscriptionId = result.subscriptionId;
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        result = await handleSubscriptionEvent(
          event,
          event.data.object as Stripe.Subscription
        );
        userId = result.userId;
        subscriptionId = result.subscriptionId || event.data.object.id;
        break;

      case 'customer.subscription.deleted':
        result = await handleSubscriptionDeleted(
          event,
          event.data.object as Stripe.Subscription
        );
        userId = result.userId;
        subscriptionId = result.subscriptionId;
        break;

      case 'invoice.paid':
        result = await handleInvoicePaid(event, event.data.object as Stripe.Invoice);
        userId = result.userId;
        subscriptionId = result.subscriptionId;
        break;

      case 'invoice.payment_failed':
        result = await handleInvoicePaymentFailed(
          event,
          event.data.object as Stripe.Invoice
        );
        userId = result.userId;
        subscriptionId = result.subscriptionId;
        break;

      case 'customer.subscription.trial_will_end':
        result = await handleTrialWillEnd(
          event,
          event.data.object as Stripe.Subscription
        );
        userId = result.userId;
        subscriptionId = result.subscriptionId;
        break;

      default:
        // Unhandled event type - log but don't error
        const elapsedMs = Date.now() - startTime;
        logRequest({
          requestId,
          route: ROUTE_NAME,
          phase: 'success',
          elapsedMs,
          status: 200,
        });

        // Record as processed even if unhandled
        await recordEventProcessed(event);

        return NextResponse.json({
          received: true,
          requestId,
          message: `Unhandled event type: ${event.type}`,
          eventId: event.id,
        });
    }

    // Record event processing result
    await recordEventProcessed(
      event,
      subscriptionId,
      userId,
      result.success,
      result.error
    );

    const elapsedMs = Date.now() - startTime;

    if (!result.success) {
      // Persistence failure - return non-2xx
      logRequest({
        requestId,
        route: ROUTE_NAME,
        phase: 'error',
        elapsedMs,
        status: 500,
        userId,
        error: {
          name: 'WebhookProcessingError',
          message: result.error || 'Failed to process webhook',
        },
      });

      return NextResponse.json(
        {
          error: result.error || 'Failed to process webhook',
          requestId,
          eventId: event.id,
          eventType: event.type,
        },
        { status: 500 }
      );
    }

    // Success
    logRequest({
      requestId,
      route: ROUTE_NAME,
      phase: 'success',
      elapsedMs,
      status: 200,
      userId,
    });

    return NextResponse.json({
      received: true,
      requestId,
      eventId: event.id,
      eventType: event.type,
    });
  } catch (error: any) {
    // Unexpected error during processing
    const elapsedMs = Date.now() - startTime;

    await recordEventProcessed(
      event,
      subscriptionId,
      userId,
      false,
      error.message || 'Unexpected error'
    );

    logRequest({
      requestId,
      route: ROUTE_NAME,
      phase: 'error',
      elapsedMs,
      status: 500,
      userId,
      error: {
        name: error.name || 'Error',
        message: error.message || 'Unexpected error processing webhook',
        stack: error.stack,
      },
    });

    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        requestId,
        eventId: event.id,
      },
      { status: 500 }
    );
  }
}
