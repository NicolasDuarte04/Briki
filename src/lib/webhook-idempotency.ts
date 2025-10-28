/**
 * Webhook idempotency utilities for Stripe events
 * Ensures events are processed only once using Stripe event IDs
 */

import { prisma } from './prisma';
import Stripe from 'stripe';

export interface WebhookEventRecord {
  stripeEventId: string;
  eventType: string;
  subscriptionId?: string;
  userId?: string;
  success: boolean;
  errorMessage?: string;
}

/**
 * Checks if a webhook event has already been processed
 * Returns the existing record if found, null otherwise
 */
export async function checkEventProcessed(
  stripeEventId: string
): Promise<WebhookEventRecord | null> {
  try {
    const existing = await prisma.webhookEvent.findUnique({
      where: { stripeEventId },
    });

    if (!existing) {
      return null;
    }

    return {
      stripeEventId: existing.stripeEventId,
      eventType: existing.eventType,
      subscriptionId: existing.subscriptionId || undefined,
      userId: existing.userId || undefined,
      success: existing.success,
      errorMessage: existing.errorMessage || undefined,
    };
  } catch (error) {
    // If there's an error checking, we should proceed to avoid blocking webhooks
    // Log the error but don't throw
    console.error('[WebhookIdempotency] Error checking event:', error);
    return null;
  }
}

/**
 * Records that a webhook event has been processed
 * Call this AFTER successfully processing the event
 */
export async function recordEventProcessed(
  event: Stripe.Event,
  subscriptionId?: string,
  userId?: string,
  success: boolean = true,
  errorMessage?: string
): Promise<void> {
  try {
    await prisma.webhookEvent.create({
      data: {
        stripeEventId: event.id,
        eventType: event.type,
        subscriptionId: subscriptionId || null,
        userId: userId || null,
        success,
        errorMessage: errorMessage || null,
        processedAt: new Date(),
      },
    });
  } catch (error) {
    // Log but don't throw - event recording failure shouldn't block response
    console.error('[WebhookIdempotency] Error recording event:', error);
  }
}

/**
 * Gets user ID from Stripe customer metadata
 */
export async function getUserIdFromCustomer(
  stripe: Stripe,
  customerId: string | Stripe.Customer | Stripe.DeletedCustomer
): Promise<string | null> {
  try {
    const customerIdString =
      typeof customerId === 'string' ? customerId : customerId.id;

    const customer = await stripe.customers.retrieve(customerIdString);

    if (typeof customer === 'deleted' || !('metadata' in customer)) {
      return null;
    }

    return customer.metadata.user_id || null;
  } catch (error) {
    console.error('[WebhookIdempotency] Error retrieving customer:', error);
    return null;
  }
}

/**
 * Gets subscription ID from various Stripe objects
 */
export function extractSubscriptionId(
  object: Stripe.Subscription | Stripe.Checkout.Session | Stripe.Invoice
): string | null {
  if ('subscription' in object) {
    const sub = object.subscription;
    return typeof sub === 'string' ? sub : sub?.id || null;
  }
  if ('id' in object && object.object === 'subscription') {
    return object.id;
  }
  return null;
}

