/**
 * Subscription management utilities for Stripe webhook processing
 */

import { prisma } from './prisma';
import Stripe from 'stripe';

export interface CreateOrUpdateSubscriptionInput {
  userId: string;
  customerId: string;
  subscriptionId: string;
  status: string;
  priceId: string;
  productId: string;
  planCode: string;
  interval: string;
  currency: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd?: boolean;
  trialEnd?: Date | null;
  cancelAt?: Date | null;
  canceledAt?: Date | null;
}

/**
 * Creates or updates a subscription record in the database
 */
export async function createOrUpdateSubscription(
  input: CreateOrUpdateSubscriptionInput
) {
  try {
    // Check if subscription already exists
    const existingSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: input.subscriptionId },
    });

    if (existingSubscription) {
      console.log(`[Subscription] Updating existing subscription: ${input.subscriptionId}`);
      
      return await prisma.subscription.update({
        where: { stripeSubscriptionId: input.subscriptionId },
        data: {
          // Update all relevant fields to ensure DB matches Stripe state
          status: input.status,
          stripePriceId: input.priceId,
          stripeProductId: input.productId,
          planCode: input.planCode,
          interval: input.interval,
          currency: input.currency,
          currentPeriodStart: input.currentPeriodStart,
          currentPeriodEnd: input.currentPeriodEnd,
          cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
          trialEnd: input.trialEnd,
          cancelAt: input.cancelAt,
          canceledAt: input.canceledAt,
          updatedAt: new Date(),
        },
      });
    }

    console.log(`[Subscription] Creating new subscription: ${input.subscriptionId}`);

    // Create new subscription
    return await prisma.subscription.create({
      data: {
        userId: input.userId,
        stripeCustomerId: input.customerId,
        stripeSubscriptionId: input.subscriptionId,
        stripePriceId: input.priceId,
        stripeProductId: input.productId,
        planCode: input.planCode,
        status: input.status,
        interval: input.interval,
        currency: input.currency,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
        trialEnd: input.trialEnd,
        cancelAt: input.cancelAt,
        canceledAt: input.canceledAt,
      },
    });
  } catch (error) {
    console.error('[Subscription] Error creating/updating subscription:', error);
    throw error;
  }
}

/**
 * Gets subscription details from Stripe and creates/updates DB record
 */
export async function syncSubscriptionFromStripe(
  stripe: Stripe,
  subscriptionId: string,
  userId?: string
) {
  try {
    // Retrieve subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    console.log(`[Subscription] Retrieved subscription from Stripe: ${subscription.id}`);

    // Extract the price and product information
    const priceId = subscription.items.data[0]?.price?.id;
    const productId = subscription.items.data[0]?.price?.product as string;
    
    if (!priceId || !productId) {
      throw new Error(`Missing price or product ID in subscription ${subscription.id}`);
    }

    // Retrieve customer to get userId if not provided
    let finalUserId = userId;
    
    if (!finalUserId && subscription.customer) {
      const customer = await stripe.customers.retrieve(
        typeof subscription.customer === 'string' 
          ? subscription.customer 
          : subscription.customer.id
      );
      
      const customerUserId = typeof customer !== 'deleted' && 'metadata' in customer 
        ? customer.metadata.user_id 
        : null;
      
      if (customerUserId) {
        finalUserId = customerUserId;
      }
    }

    if (!finalUserId) {
      throw new Error(`Could not determine userId for subscription ${subscription.id}`);
    }

    // Determine plan code from price metadata or product name
    const price = await stripe.prices.retrieve(priceId);
    const planCode = 
      typeof price.metadata.plan_code === 'string' 
        ? price.metadata.plan_code 
        : typeof subscription.metadata.plan_code === 'string'
        ? subscription.metadata.plan_code
        : 'unknown';

    // Determine interval
    const interval = price.recurring?.interval || 'month';

    return await createOrUpdateSubscription({
      userId: finalUserId,
      customerId: typeof subscription.customer === 'string' 
        ? subscription.customer 
        : subscription.customer.id,
      subscriptionId: subscription.id,
      status: subscription.status,
      priceId,
      productId,
      planCode,
      interval,
      currency: subscription.currency,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    });
  } catch (error) {
    console.error('[Subscription] Error syncing subscription from Stripe:', error);
    throw error;
  }
}

/**
 * Updates user profile with Stripe customer ID
 */
export async function updateProfileWithCustomerId(
  userId: string,
  customerId: string
) {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (profile?.stripeCustomerId === customerId) {
      console.log(`[Subscription] Profile already has customer ID: ${customerId}`);
      return;
    }

    console.log(`[Subscription] Updating profile ${userId} with customer ID: ${customerId}`);

    await prisma.profile.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId },
    });

    console.log(`[Subscription] Profile updated successfully`);
  } catch (error) {
    console.error('[Subscription] Error updating profile:', error);
    throw error;
  }
}

/**
 * Gets active subscription for a user
 */
export async function getActiveSubscription(userId: string) {
  try {
    return await prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: ['active', 'trialing'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  } catch (error: any) {
    // Handle table not existing error gracefully
    if (error?.code === 'P2021') {
      console.error('[Subscription] Table does not exist. Please run migrations:', error);
      return null;
    }
    console.error('[Subscription] Error getting active subscription:', error);
    // Return null instead of throwing to allow page to render
    return null;
  }
}

