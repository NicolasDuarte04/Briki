import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { serverEnv } from '@/lib/env';

/**
 * Initialize Stripe client with validated key
 */
function getStripeClient(): Stripe {
  if (!serverEnv.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  
  return new Stripe(serverEnv.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
  });
}

/**
 * Get or create a Stripe customer for the authenticated user.
 * Returns the Stripe customer ID and updates the profile if a new customer was created.
 */
async function getOrCreateStripeCustomer(userId: string, email?: string | null) {
  const stripe = getStripeClient();
  try {
    // First, try to get existing customer ID from database
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (profile?.stripeCustomerId) {
      console.log(`[Stripe Portal] Using existing customer: ${profile.stripeCustomerId}`);
      
      // Verify the customer still exists in Stripe
      try {
        await stripe.customers.retrieve(profile.stripeCustomerId);
        return profile.stripeCustomerId;
      } catch (error) {
        console.warn(`[Stripe Portal] Customer ${profile.stripeCustomerId} not found in Stripe, creating new customer`);
        // Customer doesn't exist in Stripe, create a new one below
      }
    }

    // Create a new Stripe customer
    console.log(`[Stripe Portal] Creating new customer for user: ${userId}`);
    
    const customer = await stripe.customers.create({
      email: email || undefined,
      metadata: {
        user_id: userId,
        created_by: 'billing_portal',
      },
    });

    console.log(`[Stripe Portal] Created new customer: ${customer.id}`);

    // Save the customer ID to the database
    await prisma.profile.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    console.log(`[Stripe Portal] Saved customer ID to profile for user: ${userId}`);

    return customer.id;
  } catch (error) {
    console.error(`[Stripe Portal] Error in getOrCreateStripeCustomer:`, error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error('[Stripe Portal] Unauthorized: No user found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate Stripe is configured
    if (!serverEnv.STRIPE_SECRET_KEY) {
      console.error('[Stripe Portal] STRIPE_SECRET_KEY is not configured');
      return NextResponse.json(
        { error: 'Billing portal is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(user.id, user.email);

    // Validate we have a customer ID
    if (!customerId) {
      console.error('[Stripe Portal] Failed to obtain customer ID');
      return NextResponse.json(
        { error: 'Failed to create billing customer. Please contact support.' },
        { status: 500 }
      );
    }

    // Create Stripe billing portal session
    const stripe = getStripeClient();
    const returnUrl = `${serverEnv.NEXT_PUBLIC_SITE_URL || serverEnv.NEXT_PUBLIC_SUPABASE_URL}/profile?tab=billing&portal_return=true`;
    
    console.log(`[Stripe Portal] Creating portal session for customer: ${customerId}`);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    console.log(`[Stripe Portal] Portal session created: ${session.id}`);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[Stripe Portal] Error creating portal session:', error);
    
    // Provide more specific error messages
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Payment error: ${error.message}` },
        { status: error.statusCode || 500 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to open billing portal: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}

