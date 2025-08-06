import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Crown, Zap, Check } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  features: string[];
  stripePriceId: string;
  popular?: boolean;
  icon: React.ReactNode;
  gradient: string;
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'premium',
    name: 'Premium',
    price: 47,
    originalPrice: 97,
    popular: true,
    features: [
      'Unlimited signals',
      'Real-time email & SMS alerts',
      'Advanced analytics dashboard',
      'Signal performance tracking',
      'Risk management tools',
      'Priority support'
    ],
    stripePriceId: 'price_premium_monthly', // Replace with actual Stripe Price ID
    icon: <Zap className="w-6 h-6" />,
    gradient: 'from-blue-400 to-blue-600'
  },
  {
    id: 'vip',
    name: 'VIP',
    price: 197,
    originalPrice: 397,
    features: [
      'Everything in Premium',
      '1-on-1 monthly consultation',
      'Custom signal requests',
      'WhatsApp/Telegram alerts',
      'Trading course access ($297 value)',
      'Live trading sessions',
      'Personal trading mentor',
      'API access for automation'
    ],
    stripePriceId: 'price_vip_monthly', // Replace with actual Stripe Price ID
    icon: <Crown className="w-6 h-6" />,
    gradient: 'from-purple-400 to-purple-600'
  }
];

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ 
  isOpen, 
  onClose, 
  userEmail 
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (plan: PricingPlan) => {
    setLoading(plan.id);
    setError(null);
    
    try {
      // Load Stripe
      const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
      
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }
      
      // For demo purposes, we'll show an alert. In production, you'd redirect to Stripe Checkout
      if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY === 'pk_live_your_key_here') {
        alert(`Demo Mode: Would redirect to Stripe Checkout for ${plan.name} plan ($${plan.price}/month)\\n\\nTo enable payments:\\n1. Set up Stripe account\\n2. Add VITE_STRIPE_PUBLISHABLE_KEY to environment\\n3. Create products in Stripe dashboard`);
        setLoading(null);
        return;
      }
      
      // Redirect to Stripe Checkout
      const { error } = await stripe.redirectToCheckout({
        lineItems: [{ 
          price: plan.stripePriceId,
          quantity: 1 
        }],
        mode: 'subscription',
        successUrl: `${window.location.origin}/success?plan=${plan.id}`,
        cancelUrl: `${window.location.origin}/pricing`,
        customerEmail: userEmail,
        billingAddressCollection: 'required'
      });
      
      if (error) {
        throw new Error(error.message);
      }
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Upgrade Your Plan</h2>
              <p className="text-gray-600 mt-1">Unlock premium features and start earning more</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-white rounded-xl shadow-lg border-2 transition-all duration-300 ${
                  plan.popular 
                    ? 'border-blue-500 scale-105' 
                    : 'border-gray-200'
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-6">
                  {/* Plan Header */}
                  <div className="text-center mb-6">
                    <div className={`inline-flex p-3 rounded-full bg-gradient-to-r ${plan.gradient} text-white mb-4`}>
                      {plan.icon}
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {plan.name}
                    </h3>
                    
                    <div className="mb-4">
                      {plan.originalPrice && (
                        <span className="text-lg text-gray-400 line-through mr-2">
                          ${plan.originalPrice}
                        </span>
                      )}
                      <span className="text-3xl font-bold text-gray-900">
                        ${plan.price}
                      </span>
                      <span className="text-gray-600">/month</span>
                    </div>
                    
                    {plan.originalPrice && (
                      <div className="text-green-600 font-semibold text-sm">
                        Save ${plan.originalPrice - plan.price}/month
                      </div>
                    )}
                  </div>

                  {/* Features List */}
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={loading === plan.id}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                      plan.popular
                        ? `bg-gradient-to-r ${plan.gradient} text-white hover:shadow-lg`
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    } ${loading === plan.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {loading === plan.id ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      `Start ${plan.name} Plan`
                    )}
                  </button>

                  {/* Money Back Guarantee */}
                  <p className="text-center text-xs text-gray-500 mt-3">
                    30-day money-back guarantee
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-3">Why Upgrade?</h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div>
                  <div className="font-semibold text-green-600 mb-1">85% Win Rate</div>
                  <div>Proven track record of profitable signals</div>
                </div>
                <div>
                  <div className="font-semibold text-blue-600 mb-1">1,247 Traders</div>
                  <div>Join our community of successful traders</div>
                </div>
                <div>
                  <div className="font-semibold text-purple-600 mb-1">$2.4M+ Profits</div>
                  <div>Total profits generated by our members</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>Secure payment processing by Stripe. Cancel anytime.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
