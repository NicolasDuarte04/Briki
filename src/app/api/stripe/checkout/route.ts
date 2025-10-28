import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { serverEnv } from '@/lib/env';
import { prisma } from '@/lib/prisma';
import { updateProfileWithCustomerId } from '@/lib/subscription';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { planId, isAnnual, userId, userEmail } = body;

    // Validate required fields
    if (!planId || typeof planId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid plan ID' },
        { status: 400 }
      );
    }

    if (typeof isAnnual !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing or invalid billing interval (isAnnual must be boolean)' },
        { status: 400 }
      );
    }

    // Validate Stripe is configured
    if (!serverEnv.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not configured');
      return NextResponse.json(
        { error: 'Payment processing is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Initialize Stripe client
    const stripe = new Stripe(serverEnv.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    });

    // Define your pricing plans with Stripe price IDs
    const plans = {
      starter: {
        monthly: serverEnv.STRIPE_STARTER_MONTHLY_PRICE_ID,
        yearly: serverEnv.STRIPE_STARTER_YEARLY_PRICE_ID,
      },
      pro: {
        monthly: serverEnv.STRIPE_PRO_MONTHLY_PRICE_ID,
        yearly: serverEnv.STRIPE_PRO_YEARLY_PRICE_ID,
      },
      team: {
        monthly: serverEnv.STRIPE_TEAM_MONTHLY_PRICE_ID,
        yearly: serverEnv.STRIPE_TEAM_YEARLY_PRICE_ID,
      },
      enterprise: {
        monthly: serverEnv.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
        yearly: serverEnv.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
      },
    };

    const priceId = plans[planId as keyof typeof plans]?.[isAnnual ? 'yearly' : 'monthly'];

    // Validate price ID exists
    if (!priceId) {
      return NextResponse.json(
        { error: `Pricing not configured for plan "${planId}" with ${isAnnual ? 'annual' : 'monthly'} billing` },
        { status: 400 }
      );
    }

    // Fetch and validate the price from Stripe
    let price: Stripe.Price;
    try {
      price = await stripe.prices.retrieve(priceId);
    } catch (stripeError) {
      console.error('Error retrieving price from Stripe:', stripeError);
      if (stripeError instanceof Stripe.errors.StripeError) {
        return NextResponse.json(
          { error: `Invalid price configuration: ${stripeError.message}` },
          { status: stripeError.statusCode || 400 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to validate price configuration' },
        { status: 500 }
      );
    }

    // Validate price is active
    if (!price.active) {
      return NextResponse.json(
        { error: `Price for ${planId} (${isAnnual ? 'annual' : 'monthly'}) is not active` },
        { status: 400 }
      );
    }

    // Validate price is recurring (required for subscription mode)
    if (price.type !== 'recurring') {
      return NextResponse.json(
        { error: `Price for ${planId} (${isAnnual ? 'annual' : 'monthly'}) must be recurring for subscription mode` },
        { status: 400 }
      );
    }

    // Get or create Stripe customer for better reconciliation
    let customerId: string | null = null;
    
    if (userId) {
      try {
        const profile = await prisma.profile.findUnique({
          where: { id: userId },
          select: { stripeCustomerId: true },
        });
        
        customerId = profile?.stripeCustomerId || null;
        
        // If no customer ID exists, create one
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: userEmail || undefined,
            metadata: {
              user_id: userId,
              plan_id: planId,
            },
          });
          customerId = customer.id;
          
          // Update profile with customer ID
          await updateProfileWithCustomerId(userId, customer.id);
          console.log(`[Checkout] Created and linked Stripe customer ${customer.id} to user ${userId}`);
        } else {
          console.log(`[Checkout] Using existing customer ${customerId} for user ${userId}`);
        }
      } catch (error) {
        console.error('[Checkout] Error managing customer:', error);
        // Continue without customer - will be created later by webhook
      }
    }

    // Create checkout session
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId || undefined,
        customer_email: userId ? undefined : (userEmail || undefined),
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${serverEnv.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${serverEnv.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL}/pricing`,
        metadata: {
          userId: userId || 'anonymous',
          planId,
          isAnnual: isAnnual.toString(),
          created_by: 'checkout_api',
        },
        allow_promotion_codes: true,
      });
    } catch (stripeError) {
      console.error('Error creating checkout session:', stripeError);
      if (stripeError instanceof Stripe.errors.StripeError) {
        return NextResponse.json(
          { error: stripeError.message },
          { status: stripeError.statusCode || 400 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    // Return session URL for direct navigation
    if (!session.url) {
      return NextResponse.json(
        { error: 'Checkout session created but no URL returned' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      ok: true, 
      sessionUrl: session.url 
    });
  } catch (error) {
    console.error('Error in checkout route:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
