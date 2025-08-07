import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify webhook signature (PayMongo webhook verification)
    const signature = req.headers['paymongo-signature'] as string;
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
    
    if (webhookSecret && signature) {
      const computedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');
      
      if (signature !== computedSignature) {
        console.error('Invalid webhook signature');
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }

    const event = req.body;
    console.log('PayMongo webhook received:', event.data.type);

    switch (event.data.type) {
      case 'checkout_session.payment.paid':
        await handleSuccessfulPayment(event.data.attributes);
        break;
      case 'checkout_session.payment.failed':
        await handleFailedPayment(event.data.attributes);
        break;
      default:
        console.log(`Unhandled event type: ${event.data.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

interface PayMongoCheckoutSession {
  id: string;
  metadata: {
    user_id: string;
    plan: string;
    service: string;
  };
  line_items: Array<{
    name: string;
    amount: number;
    currency: string;
  }>;
}

async function handleSuccessfulPayment(checkoutSession: PayMongoCheckoutSession) {
  try {
    const { metadata } = checkoutSession;
    const { user_id, plan } = metadata;

    if (!user_id || !plan) {
      console.error('Missing user_id or plan in metadata');
      return;
    }

    // Calculate subscription end date (30 days from now)
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30);

    // Update user subscription
    const { error } = await supabase
      .from('users')
      .update({
        subscription_tier: plan,
        subscription_status: 'active',
        subscription_end_date: subscriptionEndDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id);

    if (error) {
      console.error('Error updating user subscription:', error);
      return;
    }

    // Send welcome notification
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id,
        title: `Welcome to ${plan.charAt(0).toUpperCase() + plan.slice(1)}!`,
        message: `Your ${plan} subscription is now active. You'll receive premium trading signals for the next 30 days.`,
        type: 'subscription',
        is_read: false,
        created_at: new Date().toISOString()
      });

    if (notifError) {
      console.error('Error creating welcome notification:', notifError);
    }

    // Log successful upgrade
    console.log(`✅ User ${user_id} successfully upgraded to ${plan} plan via PayMongo`);

    // TODO: Send welcome email
    // await emailNotificationService.sendWelcomeEmail(user_id, plan);

  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
}

async function handleFailedPayment(checkoutSession: PayMongoCheckoutSession) {
  try {
    const { metadata } = checkoutSession;
    const { user_id, plan } = metadata;

    if (!user_id) {
      console.error('Missing user_id in metadata for failed payment');
      return;
    }

    // Send failure notification
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id,
        title: 'Payment Failed',
        message: `Your payment for the ${plan} plan could not be processed. Please try again or contact support.`,
        type: 'payment',
        is_read: false,
        created_at: new Date().toISOString()
      });

    if (notifError) {
      console.error('Error creating payment failure notification:', notifError);
    }

    console.log(`❌ Payment failed for user ${user_id} attempting to upgrade to ${plan}`);

  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
}
