#!/usr/bin/env tsx
/**
 * Developer utility to verify Stripe price configuration.
 * 
 * This script:
 * 1. Reads configured price IDs from environment variables
 * 2. Fetches each price from Stripe
 * 3. Displays key attributes (active, type, interval, currency)
 * 
 * Usage: pnpm stripe:check
 */

import Stripe from 'stripe';
import { config } from 'dotenv';

// Load environment variables from .env files (same order as Next.js)
config({ path: '.env.local' });
config({ path: '.env' });

interface PriceInfo {
  id: string;
  active: boolean;
  type: 'recurring' | 'one_time';
  interval?: string;
  intervalCount?: number;
  currency: string;
  unitAmount?: number | null;
  productId?: string;
  nickname?: string | null;
  error?: string;
}

const MAX_NAME_LENGTH = 20;

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? `${str.substring(0, maxLen - 3)}...` : str;
}

function formatPrice(amount: number | null | undefined, currency: string): string {
  if (!amount) return 'N/A';
  const major = amount / 100;
  return `${currency.toUpperCase()} ${major.toFixed(2)}`;
}

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
    console.error('\nMake sure you have a .env file with your Stripe secret key.');
    process.exit(1);
  }

  // Detect environment from key prefix
  const isTestMode = secretKey.startsWith('sk_test_');
  const modeLabel = isTestMode ? 'TEST MODE' : 'LIVE MODE';
  
  console.log(`\n🔍 Stripe Price Configuration Check (${modeLabel})`);
  console.log('=' .repeat(80));

  const stripe = new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia',
  });

  // Define plans that should be configured
  const plans = [
    { id: 'starter', name: 'Starter' },
    { id: 'pro', name: 'Pro' },
    { id: 'team', name: 'Team' },
    { id: 'enterprise', name: 'Enterprise' },
  ];

  const intervals = [
    { id: 'monthly', name: 'Monthly' },
    { id: 'yearly', name: 'Yearly' },
  ];

  const priceInfos: PriceInfo[] = [];

  // Fetch all configured prices
  for (const plan of plans) {
    for (const interval of intervals) {
      const envKey = `STRIPE_${plan.id.toUpperCase()}_${interval.id.toUpperCase()}_PRICE_ID`;
      const priceId = process.env[envKey];

      if (!priceId) {
        priceInfos.push({
          id: 'MISSING',
          active: false,
          type: 'one_time',
          currency: 'unknown',
          error: `Env var not set: ${envKey}`,
        });
        continue;
      }

      try {
        const price = await stripe.prices.retrieve(priceId);

        priceInfos.push({
          id: price.id,
          active: price.active,
          type: price.type,
          interval: price.type === 'recurring' ? price.recurring?.interval : undefined,
          intervalCount: price.type === 'recurring' ? price.recurring?.interval_count : undefined,
          currency: price.currency,
          unitAmount: price.unit_amount,
          productId: typeof price.product === 'string' ? price.product : price.product?.id,
          nickname: price.nickname,
        });
      } catch (error) {
        if (error instanceof Stripe.errors.StripeError) {
          priceInfos.push({
            id: priceId,
            active: false,
            type: 'one_time',
            currency: 'unknown',
            error: error.message,
          });
        }
      }
    }
  }

  // Display results in a table
  console.log('\n📊 Price Configuration Status:');
  console.log('-'.repeat(80));
  console.log(
    `  ${'Plan'.padEnd(12)} ${'Interval'.padEnd(10)} ${'Status'.padEnd(8)} ${'Type'.padEnd(10)} ${'Interval'.padEnd(10)} ${'Amount'.padEnd(12)} ${'Issues'.padEnd(20)}`
  );
  console.log('-'.repeat(80));

  let issues = 0;
  let rowIndex = 0;

  for (const plan of plans) {
    for (const interval of intervals) {
      const priceInfo = priceInfos[rowIndex];
      rowIndex++;

      const planDisplay = truncate(plan.name, 10);
      const intervalDisplay = interval.name;
      const statusDisplay = priceInfo.active ? '✓ Active' : '✗ Inactive';
      const typeDisplay = priceInfo.type === 'recurring' ? 'Recurring' : 'One-time';
      const intervalDetail = 
        priceInfo.type === 'recurring' && priceInfo.intervalCount
          ? `${priceInfo.interval}/${priceInfo.intervalCount}`
          : priceInfo.interval || '-';
      
      const amountDisplay = formatPrice(priceInfo.unitAmount, priceInfo.currency);
      const issuesDisplay = priceInfo.error || (priceInfo.type !== 'recurring' ? 'Not recurring!' : (!priceInfo.active ? 'Inactive!' : 'OK'));

      console.log(
        `  ${planDisplay.padEnd(12)} ${intervalDisplay.padEnd(10)} ${statusDisplay.padEnd(8)} ${typeDisplay.padEnd(10)} ${intervalDetail.padEnd(10)} ${amountDisplay.padEnd(12)} ${truncate(issuesDisplay, 18).padEnd(20)}`
      );

      if (priceInfo.error || priceInfo.type !== 'recurring' || !priceInfo.active) {
        issues++;
      }
    }
  }

  console.log('-'.repeat(80));
  console.log(`\n${issues === 0 ? '✅' : '⚠️ '} Found ${issues} issue(s) to address.`);

  // Summary
  console.log('\n📝 Summary:');
  console.log('─'.repeat(80));
  
  const activeRecurring = priceInfos.filter(p => p.active && p.type === 'recurring').length;
  const inactive = priceInfos.filter(p => !p.active && !p.error).length;
  const missing = priceInfos.filter(p => p.error?.includes('Env var not set')).length;
  const invalid = priceInfos.filter(p => p.error && !p.error.includes('Env var not set')).length;

  console.log(`  Active Recurring: ${activeRecurring}`);
  console.log(`  Inactive: ${inactive}`);
  console.log(`  Missing Config: ${missing}`);
  console.log(`  Invalid IDs: ${invalid}`);

  console.log('\n💡 Recommendations:');
  console.log('  1. All prices should be active and recurring for subscription mode');
  console.log('  2. Ensure test mode keys point to test prices and live keys to live prices');
  console.log('  3. Verify each STRIPE_*_PRICE_ID in your .env matches a price in Stripe Dashboard');
  console.log('  4. Enterprise prices are optional (sales-driven plans)\n');

  process.exit(issues > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

