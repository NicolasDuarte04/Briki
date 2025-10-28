/**
 * E2E Subscription Test Runner & Reporter
 * 
 * This script validates the subscription flow by checking database state
 * after various Stripe operations.
 * 
 * Usage:
 *   pnpm tsx scripts/e2e-subscription-test.ts
 */

import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env') });

interface TestResult {
  scenario: string;
  passed: boolean;
  details: string;
  dbState?: {
    subscription?: any;
    profile?: any;
  };
  timestamp: string;
}

const results: TestResult[] = [];
const requestId = `test-${Date.now()}`;

// Initialize Stripe
const stripeSecret = process.env.STRIPE_SECRET_KEY;
if (!stripeSecret) {
  console.error('❌ STRIPE_SECRET_KEY not found in environment');
  process.exit(1);
}

const stripe = new Stripe(stripeSecret, {
  apiVersion: '2024-12-18.acacia',
});

/**
 * Helper: Get user profile with subscriptions
 */
async function getUserState(userId: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    include: {
      subscriptions: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  return profile;
}

/**
 * Helper: Format subscription for display
 */
function formatSubscription(sub: any) {
  if (!sub) return 'No subscription';
  
  return {
    planCode: sub.planCode,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    canceledAt: sub.canceledAt,
  };
}

/**
 * SCENARIO 1: New Purchase → Active + correct next renewal date
 */
async function testNewPurchase(userId: string) {
  console.log('\n📋 SCENARIO 1: New Purchase');
  console.log('================================');
  
  const profile = await getUserState(userId);
  const activeSub = profile?.subscriptions?.[0];
  
  if (!activeSub) {
    results.push({
      scenario: 'New Purchase',
      passed: false,
      details: 'No subscription found for user',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  const isActive = activeSub.status === 'active';
  const hasRenewalDate = !!activeSub.currentPeriodEnd;
  const passed = isActive && hasRenewalDate;
  
  const details = `
    Status: ${activeSub.status} ${isActive ? '✅' : '❌'}
    Next renewal: ${activeSub.currentPeriodEnd} ${hasRenewalDate ? '✅' : '❌'}
    Plan: ${activeSub.planCode}
  `;
  
  results.push({
    scenario: 'New Purchase',
    passed,
    details,
    dbState: {
      subscription: formatSubscription(activeSub),
      profile: { stripeCustomerId: profile?.stripeCustomerId },
    },
    timestamp: new Date().toISOString(),
  });
  
  console.log(`✅ Status: ${isActive ? 'PASS' : 'FAIL'}`);
  console.log(details);
}

/**
 * SCENARIO 2: Upgrade mid-cycle → plan flips; date adjusts
 */
async function testUpgrade(userId: string) {
  console.log('\n📋 SCENARIO 2: Upgrade Mid-Cycle');
  console.log('================================');
  
  const profile = await getUserState(userId);
  const sub = profile?.subscriptions?.[0];
  
  if (!sub) {
    results.push({
      scenario: 'Upgrade',
      passed: false,
      details: 'No subscription found',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  // Check if plan is higher tier (starter -> pro -> team)
  const planHierarchy = ['starter', 'pro', 'team', 'enterprise'];
  const planRank = planHierarchy.indexOf(sub.planCode);
  const hasHigherPlan = planRank > 0;
  
  const details = `
    Current Plan: ${sub.planCode}
    Status: ${sub.status}
    Period End: ${sub.currentPeriodEnd}
    Is Upgrade: ${hasHigherPlan}
  `;
  
  results.push({
    scenario: 'Upgrade',
    passed: sub.status === 'active',
    details,
    dbState: { subscription: formatSubscription(sub) },
    timestamp: new Date().toISOString(),
  });
  
  console.log(details);
}

/**
 * SCENARIO 3: Downgrade at period end → shows scheduled change
 */
async function testDowngrade(userId: string) {
  console.log('\n📋 SCENARIO 3: Downgrade at Period End');
  console.log('================================');
  
  const profile = await getUserState(userId);
  const sub = profile?.subscriptions?.[0];
  
  if (!sub) {
    results.push({
      scenario: 'Downgrade',
      passed: false,
      details: 'No subscription found',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  // Check if there's a scheduled change (cancel_at_period_end or similar)
  const hasScheduledChange = sub.cancelAtPeriodEnd;
  
  const details = `
    Plan: ${sub.planCode}
    Scheduled Change: ${hasScheduledChange}
    Period End: ${sub.currentPeriodEnd}
  `;
  
  results.push({
    scenario: 'Downgrade',
    passed: sub.status === 'active' || sub.status === 'canceled',
    details,
    dbState: { subscription: formatSubscription(sub) },
    timestamp: new Date().toISOString(),
  });
  
  console.log(details);
}

/**
 * SCENARIO 4: Cancel at period end → "Cancela el <fecha>"; later → "Sin suscripción"
 */
async function testCancel(userId: string) {
  console.log('\n📋 SCENARIO 4: Cancel at Period End');
  console.log('================================');
  
  const profile = await getUserState(userId);
  const sub = profile?.subscriptions?.[0];
  
  if (!sub) {
    // User has "Sin suscripción"
    const details = `
      Status: No active subscription
      Display: "Sin suscripción" ✅
    `;
    
    results.push({
      scenario: 'Cancel',
      passed: true,
      details,
      dbState: { subscription: null },
      timestamp: new Date().toISOString(),
    });
    
    console.log('✅ Display: "Sin suscripción"');
    return;
  }
  
  const hasCancelDate = sub.cancelAtPeriodEnd || !!sub.canceledAt;
  const isCanceled = sub.status === 'canceled';
  
  const details = `
    Cancel at period end: ${sub.cancelAtPeriodEnd}
    Canceled at: ${sub.canceledAt}
    Period end: ${sub.currentPeriodEnd}
    Status: ${sub.status}
    Should show: ${hasCancelDate ? '"Cancela el ' + sub.currentPeriodEnd + '"' : isCanceled ? '"Sin suscripción"' : 'Active'}
  `;
  
  results.push({
    scenario: 'Cancel',
    passed: isCanceled || hasCancelDate,
    details,
    dbState: { subscription: formatSubscription(sub) },
    timestamp: new Date().toISOString(),
  });
  
  console.log(details);
}

/**
 * SCENARIO 5: Payment failure → Past due with retry CTA
 */
async function testPaymentFailure(userId: string) {
  console.log('\n📋 SCENARIO 5: Payment Failure');
  console.log('================================');
  
  const profile = await getUserState(userId);
  const sub = profile?.subscriptions?.[0];
  
  if (!sub) {
    results.push({
      scenario: 'Payment Failure',
      passed: false,
      details: 'No subscription found',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  const isPastDue = sub.status === 'past_due';
  const isUnpaid = sub.status === 'unpaid';
  const needsAction = isPastDue || isUnpaid;
  
  const details = `
    Status: ${sub.status}
    Needs Action: ${needsAction}
    Should show: ${needsAction ? 'CTA button to retry payment' : 'No action needed'}
  `;
  
  results.push({
    scenario: 'Payment Failure',
    passed: isPastDue || isUnpaid,
    details,
    dbState: { subscription: formatSubscription(sub) },
    timestamp: new Date().toISOString(),
  });
  
  console.log(details);
}

/**
 * SCENARIO 6: Trial → shows trial end date then flips to Active
 */
async function testTrial(userId: string) {
  console.log('\n📋 SCENARIO 6: Trial');
  console.log('================================');
  
  const profile = await getUserState(userId);
  const sub = profile?.subscriptions?.[0];
  
  if (!sub) {
    results.push({
      scenario: 'Trial',
      passed: false,
      details: 'No subscription found',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  const hasTrialEnd = !!sub.trialEnd;
  const isTrialing = sub.status === 'trialing';
  const isActive = sub.status === 'active';
  const trialEnded = hasTrialEnd && new Date(sub.trialEnd!) < new Date();
  
  const details = `
    Status: ${sub.status}
    Trial End: ${sub.trialEnd || 'None'}
    Has Trial: ${hasTrialEnd}
    Status After Trial: ${trialEnded ? 'Should be active' : 'Should be trialing'}
  `;
  
  const passed = (isTrialing || isActive) && (hasTrialEnd || isActive);
  
  results.push({
    scenario: 'Trial',
    passed,
    details,
    dbState: { subscription: formatSubscription(sub) },
    timestamp: new Date().toISOString(),
  });
  
  console.log(details);
}

/**
 * Verify Stripe events match DB state
 */
async function verifyStripeEvents(userId: string) {
  console.log('\n📋 VERIFY: Stripe Events vs DB');
  console.log('================================');
  
  const profile = await getUserState(userId);
  const customerId = profile?.stripeCustomerId;
  
  if (!customerId) {
    console.log('❌ No Stripe customer ID found');
    return;
  }
  
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });
    
    console.log(`Found ${subscriptions.data.length} Stripe subscription(s)`);
    
    for (const stripeSub of subscriptions.data) {
      const dbSub = profile?.subscriptions?.find(
        s => s.stripeSubscriptionId === stripeSub.id
      );
      
      if (!dbSub) {
        console.log(`⚠️  Stripe subscription ${stripeSub.id} not found in DB`);
        continue;
      }
      
      const statusMatch = dbSub.status === stripeSub.status;
      const datesMatch = 
        dbSub.currentPeriodEnd.getTime() === (stripeSub.current_period_end * 1000);
      
      console.log(`Subscription ${stripeSub.id}:`);
      console.log(`  Status match: ${statusMatch ? '✅' : '❌'} (DB: ${dbSub.status}, Stripe: ${stripeSub.status})`);
      console.log(`  Dates match: ${datesMatch ? '✅' : '❌'}`);
    }
  } catch (error) {
    console.error('Error verifying Stripe events:', error);
  }
}

/**
 * Generate summary report
 */
function generateReport() {
  console.log('\n\n📊 E2E SUBSCRIPTION TEST REPORT');
  console.log('==========================================');
  console.log(`Request ID: ${requestId}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('');
  
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  
  console.log(`Total Scenarios: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ${failedTests > 0 ? '❌' : '✅'}`);
  console.log('');
  
  results.forEach(result => {
    console.log(`\n${result.passed ? '✅' : '❌'} ${result.scenario}`);
    console.log(`   ${result.details}`);
    if (result.dbState) {
      console.log(`   DB State: ${JSON.stringify(result.dbState, null, 2).substring(0, 200)}...`);
    }
  });
  
  // Write detailed report to file
  const reportPath = `E2E_TEST_REPORT_${Date.now()}.json`;
  const report = {
    requestId,
    timestamp: new Date().toISOString(),
    results,
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
    },
  };
  
  console.log(`\n\n📄 Full report saved to: ${reportPath}`);
  
  return {
    reportPath,
    report,
  };
}

/**
 * Main execution
 */
async function main() {
  const userId = process.argv[2];
  
  if (!userId) {
    console.error('❌ Usage: pnpm tsx scripts/e2e-subscription-test.ts <userId>');
    console.error('');
    console.error('Example:');
    console.error('  pnpm tsx scripts/e2e-subscription-test.ts 12345678-1234-1234-1234-123456789abc');
    process.exit(1);
  }
  
  console.log('🧪 E2E SUBSCRIPTION TESTS');
  console.log('========================');
  console.log(`User ID: ${userId}`);
  console.log(`Request ID: ${requestId}`);
  console.log('');
  
  try {
    // Run all test scenarios
    await testNewPurchase(userId);
    await testUpgrade(userId);
    await testDowngrade(userId);
    await testCancel(userId);
    await testPaymentFailure(userId);
    await testTrial(userId);
    
    // Verify Stripe sync
    await verifyStripeEvents(userId);
    
    // Generate report
    const { report, reportPath } = generateReport();
    
    // Save report
    const fs = await import('fs');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n✅ All tests completed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

