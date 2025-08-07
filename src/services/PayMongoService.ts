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
  private secretKey: string;
  private baseUrl = 'https://api.paymongo.com/v1';

  constructor() {
    this.secretKey = import.meta.env.VITE_PAYMONGO_SECRET_KEY || '';

    if (!this.secretKey) {
      console.warn('PayMongo secret key not found. Make sure VITE_PAYMONGO_SECRET_KEY is set.');
    }
  }

  private getAuthHeader(): string {
    return `Basic ${btoa(this.secretKey + ':')}`;
  }

  async createCheckoutSession(plan: 'premium' | 'vip', userId?: string): Promise<string> {
    try {
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

      const response = await fetch(`${this.baseUrl}/checkout_sessions`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`PayMongo API error: ${error.errors?.[0]?.detail || 'Unknown error'}`);
      }

      const session = await response.json();
      return session.data.attributes.checkout_url;
    } catch (error) {
      console.error('Error creating PayMongo checkout session:', error);
      throw error;
    }
  }

  async verifySession(sessionId: string): Promise<PayMongoCheckoutSession> {
    try {
      const response = await fetch(`${this.baseUrl}/checkout_sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`PayMongo API error: ${error.errors?.[0]?.detail || 'Unknown error'}`);
      }

      const session = await response.json();
      return session.data.attributes;
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
