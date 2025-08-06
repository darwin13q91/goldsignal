import React, { useState } from 'react';
import { Crown, DollarSign, Zap, Check, X } from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  interval: 'month' | 'year';
  features: string[];
  limitations?: string[];
  popular?: boolean;
  stripePriceId: string;
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    features: [
      '5 signals per month',
      'Basic email notifications',
      'Community access',
      'Basic market data'
    ],
    limitations: [
      'Limited signal history',
      'No real-time alerts',
      'No advanced analytics'
    ],
    stripePriceId: ''
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 47,
    originalPrice: 97,
    interval: 'month',
    popular: true,
    features: [
      'Unlimited signals',
      'Real-time email & SMS alerts',
      'Advanced analytics dashboard',
      'Signal performance tracking',
      'Risk management tools',
      'Priority support',
      'Mobile app access'
    ],
    stripePriceId: 'price_premium_monthly'
  },
  {
    id: 'vip',
    name: 'VIP',
    price: 197,
    originalPrice: 397,
    interval: 'month',
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
    stripePriceId: 'price_vip_monthly'
  }
];

export const PricingPage: React.FC = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (plan: PricingPlan) => {
    if (plan.id === 'free') return;
    
    setLoading(plan.id);
    
    try {
      // Redirect to Stripe Checkout
      const stripe = await import('@stripe/stripe-js').then(m => 
        m.loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
      );
      
      if (!stripe) throw new Error('Stripe failed to load');
      
      const { error } = await stripe.redirectToCheckout({
        lineItems: [{ 
          price: plan.stripePriceId,
          quantity: 1 
        }],
        mode: 'subscription',
        successUrl: `${window.location.origin}/success?plan=${plan.id}`,
        cancelUrl: `${window.location.origin}/pricing`,
        billingAddressCollection: 'required'
      });
      
      if (error) {
        console.error('Stripe error:', error);
        alert('Payment failed. Please try again.');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const getDiscountedPrice = (price: number) => {
    return isAnnual ? Math.round(price * 12 * 0.8) : price; // 20% annual discount
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Trading Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of profitable Gold traders worldwide
          </p>
          
          {/* Annual/Monthly Toggle */}
          <div className="flex items-center justify-center mb-8">
            <span className={`mr-3 ${!isAnnual ? 'font-semibold' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isAnnual ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAnnual ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`ml-3 ${isAnnual ? 'font-semibold' : 'text-gray-500'}`}>
              Annual
            </span>
            {isAnnual && (
              <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                Save 20%
              </span>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {pricingPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl ${
                plan.popular 
                  ? 'border-blue-500 scale-105' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-8">
                {/* Plan Header */}
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-4">
                    {plan.id === 'free' && <Zap className="w-12 h-12 text-gray-500" />}
                    {plan.id === 'premium' && <DollarSign className="w-12 h-12 text-blue-500" />}
                    {plan.id === 'vip' && <Crown className="w-12 h-12 text-purple-500" />}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  
                  <div className="mb-4">
                    {plan.originalPrice && (
                      <span className="text-lg text-gray-400 line-through mr-2">
                        ${isAnnual ? plan.originalPrice * 12 : plan.originalPrice}
                      </span>
                    )}
                    <span className="text-4xl font-bold text-gray-900">
                      ${plan.price === 0 ? '0' : getDiscountedPrice(plan.price)}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-600">
                        /{isAnnual ? 'year' : 'month'}
                      </span>
                    )}
                  </div>
                  
                  {plan.originalPrice && (
                    <div className="text-green-600 font-semibold">
                      Save ${(plan.originalPrice - plan.price) * (isAnnual ? 12 : 1)}
                      {isAnnual ? '/year' : '/month'}
                    </div>
                  )}
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                  
                  {plan.limitations?.map((limitation, index) => (
                    <li key={`limit-${index}`} className="flex items-start">
                      <X className="w-5 h-5 text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-500">{limitation}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={loading === plan.id}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                    plan.id === 'free'
                      ? 'bg-gray-100 text-gray-700 cursor-not-allowed'
                      : plan.popular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  } ${loading === plan.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading === plan.id ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : plan.id === 'free' ? (
                    'Current Plan'
                  ) : (
                    `Start ${plan.name} Plan`
                  )}
                </button>

                {/* Money Back Guarantee */}
                {plan.id !== 'free' && (
                  <p className="text-center text-sm text-gray-500 mt-4">
                    30-day money-back guarantee
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Social Proof */}
        <div className="text-center mt-16">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">1,247</div>
              <div className="text-gray-600">Active Traders</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">85%</div>
              <div className="text-gray-600">Win Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">$2.4M</div>
              <div className="text-gray-600">Total Profits Generated</div>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="mt-16 bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-center mb-8">What Our Traders Say</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="text-center">
              <p className="text-gray-700 mb-4 italic">
                "Made $2,400 in my first month using the premium signals. 
                The accuracy is incredible and the support team is amazing!"
              </p>
              <div className="font-semibold">John D.</div>
              <div className="text-sm text-gray-500">Premium Member</div>
            </div>
            <div className="text-center">
              <p className="text-gray-700 mb-4 italic">
                "The VIP tier changed my trading completely. The 1-on-1 calls 
                helped me understand risk management better."
              </p>
              <div className="font-semibold">Sarah M.</div>
              <div className="text-sm text-gray-500">VIP Member</div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h3>
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h4 className="font-semibold mb-2">Can I cancel anytime?</h4>
              <p className="text-gray-600">
                Yes, you can cancel your subscription at any time. You'll continue to have access 
                until the end of your current billing period.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h4 className="font-semibold mb-2">Do you offer refunds?</h4>
              <p className="text-gray-600">
                We offer a 30-day money-back guarantee. If you're not satisfied with our service, 
                we'll refund your subscription within 30 days.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h4 className="font-semibold mb-2">How accurate are the signals?</h4>
              <p className="text-gray-600">
                Our signals maintain an 85% win rate based on historical performance. 
                Past performance doesn't guarantee future results, but we're confident in our system.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
