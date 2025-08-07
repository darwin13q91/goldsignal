import React, { useState } from 'react';
import { Crown, DollarSign, Zap, Check, X } from 'lucide-react';
import { payMongoService } from '../services/PayMongoService';
import { useAuth } from '../hooks/useAuth';
import { useLoadingWithTimeout } from '../hooks/useLoadingWithTimeout';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  interval: 'month' | 'year';
  features: string[];
  limitations?: string[];
  popular?: boolean;
  currency: string;
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    currency: 'PHP',
    features: [
      '3 signals per week',
      'Basic email notifications',
      'Community access',
      'Basic market data'
    ],
    limitations: [
      'Limited signal history',
      'No real-time alerts',
      'No advanced analytics'
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 1450,
    originalPrice: 2900,
    interval: 'month',
    popular: true,
    currency: 'PHP',
    features: [
      'Up to 5 premium signals daily',
      'Entry, SL, and TP levels',
      'Real-time email notifications',
      'Basic performance analytics',
      'GCash & PayMaya support',
      '24/7 customer support',
      'Mobile-optimized dashboard'
    ]
  },
  {
    id: 'vip',
    name: 'VIP',
    price: 4950,
    originalPrice: 9900,
    interval: 'month',
    currency: 'PHP',
    features: [
      'Unlimited premium signals',
      'Advanced market analysis',
      'Priority email & SMS alerts',
      'Detailed performance analytics',
      'Copy trading signals',
      'VIP Telegram group access',
      'Priority customer support',
      'API access for automation'
    ]
  }
];

export const PricingPage: React.FC = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const { user } = useAuth();
  
  // Use timeout-aware loading states
  const subscriptionLoading = useLoadingWithTimeout({
    timeoutMs: 20000, // 20 seconds for payment redirect
    onTimeout: () => {
      alert('Payment setup is taking longer than expected. Please try again or check your connection.');
    }
  });

  const handleSubscribe = async (plan: PricingPlan) => {
    if (plan.id === 'free') return;
    
    if (!user) {
      alert('Please login first to subscribe');
      return;
    }

    const result = await subscriptionLoading.executeWithLoading(
      async () => {
        const checkoutUrl = await payMongoService.createCheckoutSession(
          plan.id as 'premium' | 'vip',
          user.id
        );
        
        // Redirect to PayMongo checkout
        window.location.href = checkoutUrl;
        return true;
      },
      'Failed to create checkout session. Please try again.'
    );

    if (!result && subscriptionLoading.error) {
      alert(subscriptionLoading.error);
    }
  };

  const getDiscountedPrice = (price: number) => {
    return isAnnual ? Math.round(price * 12 * 0.8) : price; // 20% annual discount
  };

  const paymentMethods = payMongoService.getSupportedPaymentMethods();

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
                        ₱{(isAnnual ? plan.originalPrice * 12 : plan.originalPrice).toLocaleString()}
                      </span>
                    )}
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price === 0 ? 'FREE' : `₱${getDiscountedPrice(plan.price).toLocaleString()}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-600">
                        /{isAnnual ? 'year' : 'month'}
                      </span>
                    )}
                  </div>
                  
                  {plan.originalPrice && (
                    <div className="text-green-600 font-semibold">
                      Save ₱{((plan.originalPrice - plan.price) * (isAnnual ? 12 : 1)).toLocaleString()}
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
                  disabled={subscriptionLoading.isLoading}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                    plan.id === 'free'
                      ? 'bg-gray-100 text-gray-700 cursor-not-allowed'
                      : plan.popular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  } ${subscriptionLoading.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {subscriptionLoading.isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {subscriptionLoading.hasTimedOut ? 'Taking longer than expected...' : 'Processing...'}
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

        {/* Payment Methods */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">
            Secure Payment Methods for Philippines
          </h3>
          <div className="flex justify-center items-center space-x-8 mb-8">
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex flex-col items-center">
                <div className="text-4xl mb-2">{method.logo}</div>
                <span className={`text-sm ${method.popular ? 'font-semibold text-blue-600' : 'text-gray-600'}`}>
                  {method.name}
                </span>
                {method.popular && (
                  <span className="text-xs text-green-600 mt-1">Popular</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Pay securely with your preferred method. All transactions are encrypted and protected. 
            Most Filipinos prefer GCash and PayMaya for instant, secure payments.
          </p>
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
