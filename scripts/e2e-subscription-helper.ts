/**
 * E2E Subscription Helper
 * 
 * Utilities for testing subscription flows
 */

import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { serverEnv } from '@/lib/env';

const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

interface SubState {
  planCode: string;
  status: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date | null;
}

/**
 * Get current subscription state
 */
export async function getSubscriptionState(userId: string): Promise<SubState | null> {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const sub = profile?.subscriptions?.[0];
  if (!sub) return null;

  return {
    planCode: sub.planCode,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    trialEnd: sub.trialEnd,
  };
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      status: {
        in: ['active', 'trialing'],
      },
    },
  });

  return !!sub;
}

/**
 * Simulate webhook event (for testing)
 */
export async function simulateWebhookEvent(
  eventType: 'checkout.session.completed' | 'customer.subscription.updated' | 'customer.subscription.deleted',
  subscriptionId?: string
) {
  console.log(`\n🔔 Simulating webhook: ${eventType}`);
  
  // Get a test subscription if not provided
  if (!subscriptionId) {
    const testSub = await prisma.subscription.findFirst();
    if (!testSub) {
      console.error('No subscription found to simulate webhook');
      return;
    }
    subscriptionId = testSub.stripeSubscriptionId;
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

    const customer = await stripe.customers.retrieve(customerId);
    const userId = typeof customer !== 'deleted' && 'metadata' in customer
      ? customer.metadata.user_id
      : null;

    if (!userId) {
      console.error('No user_id in customer metadata');
      return;
    }

    console.log(`Found user: ${userId}`);
    console.log(`Subscription: ${subscriptionId}`);
    console.log(`Status: ${subscription.status}`);

    // Import webhook handler directly
    const { syncSubscriptionFromStripe } = await import('@/lib/subscription');
    
    switch (eventType) {
      case 'checkout.session.completed':
      case 'customer.subscription.updated':
        await syncSubscriptionFromStripe(stripe, subscriptionId, userId);
        console.log('✅ Synced subscription to DB');
        break;
      
      case 'customer.subscription.deleted':
        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscriptionId },
          data: {
            status: 'canceled',
            canceledAt: new Date(),
          },
        });
        console.log('✅ Marked subscription as canceled');
        break;
    }

    console.log('✅ Webhook simulation complete');
  } catch (error) {
    console.error('❌ Error simulating webhook:', error);
  }
}

/**
 * Clean up test data (use with caution!)
 */
export async function cleanupTestSubscriptions(userId: string) {
  console.log('\n🧹 Cleaning up test subscriptions...');
  
  const deleted = await prisma.subscription.deleteMany({
    where: { userId },
  });

  await prisma.profile.update({
    where: { id: userId },
    data: { stripeCustomerId: null },
  });

  console.log(`✅ Deleted ${deleted.count} subscriptions`);
}

/**
 * Print detailed subscription info
 */
export async function printSubscriptionInfo(userId: string) {
  const sub = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (!sub) {
    console.log('No subscription found');
    return;
  }

  console.log('\n📋 Subscription Details:');
  console.log('========================');
  console.log(`Plan: ${sub.planCode}`);
  console.log(`Status: ${sub.status}`);
  console.log(`Period Start: ${sub.currentPeriodStart}`);
  console.log(`Period End: ${sub.currentPeriodEnd}`);
  console.log(`Cancel at Period End: ${sub.cancelAtPeriodEnd}`);
  console.log(`Canceled At: ${sub.canceledAt || 'N/A'}`);
  console.log(`Trial End: ${sub.trialEnd || 'N/A'}`);
  console.log(`Stripe Subscription ID: ${sub.stripeSubscriptionId}`);
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  try {
    switch (command) {
      case 'state':
        if (!args[0]) {
          console.error('Usage: state <userId>');
          process.exit(1);
        }
        const state = await getSubscriptionState(args[0]);
        console.log(JSON.stringify(state, null, 2));
        break;

      case 'simulate':
        const eventType = args[0] as any;
        const subId = args[1];
        await simulateWebhookEvent(eventType, subId);
        break;

      case 'cleanup':
        if (!args[0]) {
          console.error('Usage: cleanup <userId>');
          process.exit(1);
        }
        await cleanupTestSubscriptions(args[0]);
        break;

      case 'info':
        if (!args[0]) {
          console.error('Usage: info <userId>');
          process.exit(1);
        }
        await printSubscriptionInfo(args[0]);
        break;

      default:
        console.log(`
Usage: pnpm tsx scripts/e2e-subscription-helper.ts <command>

Commands:
  state <userId>            Get subscription state
  simulate <eventType> [subId]   Simulate webhook event
  cleanup <userId>         Clean up test data (CAUTION!)
  info <userId>            Print subscription details

Example:
  pnpm tsx scripts/e2e-subscription-helper.ts state abc123
  pnpm tsx scripts/e2e-subscription-helper.ts simulate checkout.session.completed
        `);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { getSubscriptionState, hasActiveSubscription, simulateWebhookEvent, cleanupTestSubscriptions, printSubscriptionInfo };

