import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId } = request.body;

  if (!sessionId) {
    return response.status(400).json({ error: 'Session ID required' });
  }

  try {
    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    // Verify payment status
    if (session.payment_status !== 'paid') {
      return response.status(400).json({ 
        error: 'Payment not completed',
        payment_status: session.payment_status 
      });
    }

    // Get subscription details if it exists
    let subscriptionEndDate: string | null = null;
    let subscriptionId: string | null = null;
    
    if (session.subscription && typeof session.subscription === 'object') {
      const subscription = session.subscription as Stripe.Subscription & {
        current_period_end: number;
      };
      subscriptionEndDate = new Date(subscription.current_period_end * 1000).toISOString();
      subscriptionId = subscription.id;
    }

    // Return verified session data
    const verifiedData = {
      session_id: session.id,
      payment_status: session.payment_status,
      customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id,
      subscription_id: subscriptionId,
      subscription_end_date: subscriptionEndDate,
      amount_total: session.amount_total,
      currency: session.currency,
    };

    return response.status(200).json(verifiedData);

  } catch (error) {
    console.error('Session verification error:', error);
    return response.status(500).json({ 
      error: 'Session verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
