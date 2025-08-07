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
    console.log('🚨 CONSTRUCTOR: PayMongo Service initialized (using server-side endpoints)');
    console.log('🚨 CONSTRUCTOR: Environment check - hostname:', window.location.hostname);
    
    // Debug method for browser console testing
    (window as unknown as Window & { testPayMongo: () => string }).testPayMongo = () => {
      console.log('🧪 Testing PayMongo environment...');
      console.log('🧪 Hostname:', window.location.hostname);
      return 'Test completed - check console for results';
    };
  }

  async createCheckoutSession(plan: 'premium' | 'vip', userId?: string): Promise<string> {
    alert('🚨 DEBUG: createCheckoutSession called! Check console for details.');
    console.log('🚨 DEBUG: ==========================================');
    console.log('🚨 DEBUG: createCheckoutSession called - START');
    console.log('🚨 DEBUG: plan:', plan);
    console.log('🚨 DEBUG: userId:', userId);
    console.log('🚨 DEBUG: ==========================================');
    
    // TEMPORARY: Skip server API completely and go directly to PayMongo API for debugging
    console.log('🚨 DEBUG: SKIPPING SERVER API - Going directly to PayMongo for testing');
    
    try {
      return await this.createCheckoutSessionDirect(plan, userId);
    } catch (error) {
      console.error('❌ DEBUG: Error in createCheckoutSession outer try-catch:', error);
      console.error('❌ DEBUG: Error creating PayMongo checkout session:', error);
      throw error;
    }
  }

  private async createCheckoutSessionDirect(plan: 'premium' | 'vip', userId?: string): Promise<string> {
    // DEVELOPMENT ONLY - This should never be used in production
    console.warn('⚠️  WARNING: Using direct PayMongo API call from browser (DEVELOPMENT ONLY)');
    
    console.log('🚨 DEBUG: createCheckoutSessionDirect called - START');
    
    // TEMPORARY: Use hardcoded secret key from .env file for testing
    const secretKey = 'sk_test_g8DL2qHp5axtaSqVQymTTb3b'; // From your .env file
    
    console.log('🚨 DEBUG: Secret key exists?', !!secretKey);
    console.log('🚨 DEBUG: Secret key preview:', secretKey ? secretKey.substring(0, 10) + '...' : 'undefined');
    
    if (!secretKey) {
      const errorMsg = 'PayMongo secret key not found';
      console.error('❌ DEBUG:', errorMsg);
      throw new Error(errorMsg);
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
          success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
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

    console.log('🚨 DEBUG: Making direct PayMongo API call with payload:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(secretKey + ':')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('🚨 DEBUG: PayMongo direct API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ DEBUG: PayMongo API error:', errorText);
      
      let errorDetail;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.errors?.[0]?.detail || errorJson.message || 'Unknown error';
        console.error('❌ DEBUG: Parsed error detail:', errorDetail);
      } catch {
        errorDetail = `HTTP ${response.status}: ${errorText}`;
        console.error('❌ DEBUG: Raw error detail:', errorDetail);
      }
      
      throw new Error(`PayMongo API error: ${errorDetail}`);
    }

    const session = await response.json();
    console.log('✅ DEBUG: PayMongo checkout session created successfully:', session.data.id);
    console.log('✅ DEBUG: Checkout URL:', session.data.attributes.checkout_url);
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
