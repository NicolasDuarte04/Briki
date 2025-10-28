export interface CheckoutSessionData {
  planId: string;
  isAnnual: boolean;
  userId?: string | undefined;
}

export async function createCheckoutSession(data: CheckoutSessionData) {
  try {
    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    const { sessionUrl } = await response.json();
    
    if (!sessionUrl) {
      throw new Error('No checkout URL returned from server');
    }
    
    return sessionUrl;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

export async function redirectToCheckout(sessionUrl: string) {
  window.location.href = sessionUrl;
}
