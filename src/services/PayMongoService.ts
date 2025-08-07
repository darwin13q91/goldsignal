import { supabase } from '../lib/supabase';

export interface PayMongoCheckoutSession {
  id: string;
  checkout_url: string;
  line_items: Array<{
    name: string;
    amount: number;
    currency: string;
    quantity: number;
  }>;
  payment_method_types: string[];
  success_url: string;
  cancel_url: string;
  status: string;
}

export interface PayMongoWebhookEvent {
  id: string;
  type: string;
  data: {
    id: string;
    type: string;
    attributes: {
      status: string;
      amount: number;
      currency: string;
      description: string;
      payments: Array<{
        id: string;
        type: string;
        attributes: {
          status: string;
          amount: number;
          currency: string;
          payment_method: {
            type: string;
          };
        };
      }>;
    };
  };
}

class PayMongoService {
  constructor() {
    console.log('PayMongo Service initialized (using server-side endpoints)');
  }

  async createCheckoutSession(plan: 'premium' | 'vip', userId?: string): Promise<string> {
    try {
      console.log('Creating PayMongo checkout session for plan:', plan, 'userId:', userId);
      
      // Try server-side API endpoint first
      try {
        const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            plan,
            userId
          })
        });

        console.log('Server response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('Checkout session created successfully via server:', data.session_id);
          return data.checkout_url;
        } else if (response.status === 404) {
          console.log('API endpoint not found, using development fallback');
          throw new Error('API_NOT_FOUND');
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
          console.error('Server API error:', errorData);
          throw new Error(errorData.error || `Server error: HTTP ${response.status}`);
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'API_NOT_FOUND') {
          throw error;
        }
        
        console.log('Server-side API unavailable, checking if in development mode...');
        
        // Development fallback - only use if we detect we're in development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.log('Development mode detected, using direct API call (NOT SECURE FOR PRODUCTION)');
          return await this.createCheckoutSessionDirect(plan, userId);
        }
        
        throw error;
      }
    } catch (error) {
      console.error('Error creating PayMongo checkout session:', error);
      throw error;
    }
  }

  private async createCheckoutSessionDirect(plan: 'premium' | 'vip', userId?: string): Promise<string> {
    // DEVELOPMENT ONLY - This should never be used in production
    console.warn('⚠️  WARNING: Using direct PayMongo API call from browser (DEVELOPMENT ONLY)');
    
    const secretKey = import.meta.env.VITE_PAYMONGO_SECRET_KEY;
    if (!secretKey) {
      throw new Error('PayMongo secret key not found in environment variables');
    }

    const planDetails = {
      premium: {
        name: 'Gold Signal Premium Plan',
        amount: 145000, // ₱1,450 in centavos
        description: 'Premium trading signals for XAUUSD with 24/7 support'
      },
      vip: {
        name: 'Gold Signal VIP Plan', 
        amount: 495000, // ₱4,950 in centavos
        description: 'VIP trading signals with priority support and advanced analytics'
      }
    };

    const selectedPlan = planDetails[plan];

    const payload = {
      data: {
        attributes: {
          line_items: [{
            name: selectedPlan.name,
            amount: selectedPlan.amount,
            currency: 'PHP',
            quantity: 1,
            description: selectedPlan.description
          }],
          payment_method_types: [
            'card',
            'gcash',
            'grab_pay',
            'paymaya'
          ],
          success_url: `${window.location.origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
          cancel_url: `${window.location.origin}/pricing`,
          description: `${selectedPlan.name} subscription`,
          metadata: {
            plan,
            user_id: userId || '',
            service: 'gold_signal_service'
          }
        }
      }
    };

    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(secretKey + ':')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PayMongo API error:', errorText);
      
      let errorDetail;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.errors?.[0]?.detail || errorJson.message || 'Unknown error';
      } catch {
        errorDetail = `HTTP ${response.status}: ${errorText}`;
      }
      
      throw new Error(`PayMongo API error: ${errorDetail}`);
    }

    const session = await response.json();
    return session.data.attributes.checkout_url;
  }

  async verifySession(sessionId: string): Promise<PayMongoCheckoutSession> {
    try {
      // Call our server-side API endpoint
      const response = await fetch(`/api/verify-paymongo-session?session_id=${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
        throw new Error(errorData.error || `Server error: HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.session;
    } catch (error) {
      console.error('Error verifying PayMongo session:', error);
      throw error;
    }
  }

  async updateUserSubscription(userId: string, plan: 'premium' | 'vip', sessionId: string): Promise<boolean> {
    try {
      // Calculate subscription end date (30 days from now)
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 30);

      const { error } = await supabase
        .from('users')
        .update({
          subscription_tier: plan,
          subscription_status: 'active',
          subscription_end_date: subscriptionEndDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user subscription:', error);
        return false;
      }

      // Log the successful payment
      console.log(`User ${userId} upgraded to ${plan} plan via PayMongo session ${sessionId}`);
      
      return true;
    } catch (error) {
      console.error('Error updating user subscription:', error);
      return false;
    }
  }

  // Get supported payment methods for Philippines
  getSupportedPaymentMethods(): Array<{ id: string; name: string; logo: string; popular: boolean }> {
    return [
      {
        id: 'gcash',
        name: 'GCash',
        logo: '💙',
        popular: true
      },
      {
        id: 'paymaya',
        name: 'PayMaya',
        logo: '💚', 
        popular: true
      },
      {
        id: 'grab_pay',
        name: 'GrabPay',
        logo: '🟢',
        popular: false
      },
      {
        id: 'card',
        name: 'Credit/Debit Card',
        logo: '💳',
        popular: false
      }
    ];
  }

  // Helper method to format PHP currency
  formatPHP(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  }

  // Get plan details in PHP
  getPlanDetails() {
    return {
      premium: {
        name: 'Premium Plan',
        price: 1450,
        currency: 'PHP',
        features: [
          'Up to 5 premium signals daily',
          'Entry, SL, and TP levels',
          'Email notifications',
          'Basic analytics',
          '24/7 support'
        ],
        popular: true
      },
      vip: {
        name: 'VIP Plan', 
        price: 4950,
        currency: 'PHP',
        features: [
          'Unlimited premium signals',
          'Advanced market analysis',
          'Priority email & SMS alerts',
          'Detailed performance analytics',
          'Copy trading signals',
          'VIP Discord access',
          'Priority support'
        ],
        popular: false
      }
    };
  }
}

export const payMongoService = new PayMongoService();
