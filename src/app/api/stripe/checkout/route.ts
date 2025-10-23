import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const { planId, isAnnual, userId } = await request.json();

    // Define your pricing plans with Stripe price IDs
    const plans = {
      starter: {
        monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
        yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
      },
      pro: {
        monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
        yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
      },
      team: {
        monthly: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
        yearly: process.env.STRIPE_TEAM_YEARLY_PRICE_ID,
      },
      enterprise: {
        monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
        yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
      },
    };

    const priceId = plans[planId as keyof typeof plans]?.[isAnnual ? 'yearly' : 'monthly'];

    if (!priceId) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: {
        userId: userId || 'anonymous',
        planId,
        isAnnual: isAnnual.toString(),
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
