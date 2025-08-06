import { useState } from 'react';
import { Check, X, Star, Users, Clock, Mail, MessageSquare, Bell } from 'lucide-react';

interface SubscriptionPlansProps {
  onSelectPlan: (planType: string) => void;
}

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({ onSelectPlan }) => {
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  const plans = [
    {
      id: 'FREE',
      name: 'Free Starter',
      price: '$0',
      period: '/month',
      description: 'Perfect for beginners to test our signals',
      features: [
        '3 signals per day',
        'XAUUSD Gold trading signals',
        'Email notifications',
        'Basic market analysis',
        'Community support'
      ],
      limitations: [
        'Limited to XAUUSD only',
        'No SMS notifications',
        'No priority support'
      ],
      popular: false,
      buttonText: 'Start Free',
      buttonClass: 'bg-gray-600 hover:bg-gray-700'
    },
    {
      id: 'BASIC',
      name: 'Basic Trader',
      price: '$29.99',
      period: '/month',
      description: 'Great for casual traders',
      features: [
        '10 signals per day',
        'XAUUSD Gold trading signals',
        'Email + SMS notifications',
        'Detailed market analysis',
        'Performance tracking',
        'Priority email support'
      ],
      limitations: [
        'Limited to XAUUSD only',
        'No real-time chat support'
      ],
      popular: false,
      buttonText: 'Choose Basic',
      buttonClass: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      id: 'PREMIUM',
      name: 'Premium Pro',
      price: '$79.99',
      period: '/month',
      description: 'For serious traders who want more',
      features: [
        '25 signals per day',
        'Premium XAUUSD Gold signals',
        'All notification methods',
        'Advanced technical analysis',
        'Performance analytics',
        'Risk management tools',
        '24/7 priority support',
        'Exclusive webinars'
      ],
      limitations: [],
      popular: true,
      buttonText: 'Go Premium',
      buttonClass: 'bg-green-600 hover:bg-green-700'
    },
    {
      id: 'VIP',
      name: 'VIP Elite',
      price: '$199.99',
      period: '/month',
      description: 'Ultimate package for professional traders',
      features: [
        'Unlimited signals',
        'All available instruments',
        'Real-time notifications',
        'Personal trading advisor',
        'Custom alert settings',
        'Advanced analytics dashboard',
        'Direct chat with analysts',
        'Exclusive market insights',
        '1-on-1 trading sessions',
        'Portfolio management tools'
      ],
      limitations: [],
      popular: false,
      buttonText: 'VIP Access',
      buttonClass: 'bg-purple-600 hover:bg-purple-700'
    }
  ];

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    onSelectPlan(planId);
  };

  return (
    <div className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Choose Your Trading Signal Plan
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Start with our free plan or upgrade for premium features
          </p>
        </div>

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative p-6 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col ${
                plan.popular ? 'border-green-500 ring-2 ring-green-500' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-medium bg-green-500 text-white">
                    <Star className="h-4 w-4 mr-1" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-sm text-gray-500">{plan.description}</p>
                
                <div className="mt-4">
                  <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                  <span className="text-base font-medium text-gray-500">{plan.period}</span>
                </div>

                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <div className="flex-shrink-0">
                        <Check className="h-5 w-5 text-green-500" />
                      </div>
                      <p className="ml-3 text-sm text-gray-700">{feature}</p>
                    </li>
                  ))}
                  
                  {plan.limitations.length > 0 && (
                    <>
                      <li className="pt-2">
                        <p className="text-sm font-medium text-gray-500">Limitations:</p>
                      </li>
                      {plan.limitations.map((limitation, index) => (
                        <li key={index} className="flex items-start">
                          <div className="flex-shrink-0">
                            <X className="h-5 w-5 text-red-400" />
                          </div>
                          <p className="ml-3 text-sm text-gray-500">{limitation}</p>
                        </li>
                      ))}
                    </>
                  )}
                </ul>
              </div>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                className={`mt-8 w-full text-white py-3 px-4 rounded-md font-medium transition-colors ${plan.buttonClass} ${
                  selectedPlan === plan.id ? 'ring-2 ring-offset-2 ring-gray-900' : ''
                }`}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>

        {/* Features Comparison */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">Feature Comparison</h3>
          
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Features
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Free
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Basic
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Premium
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    VIP
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                    <Users className="h-4 w-4 mr-2 text-gray-400" />
                    Daily Signals
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">3</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">10</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">25</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">Unlimited</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    Trading Instruments
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">3 pairs</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">6 pairs</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">15+ pairs</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">All available</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    Email Notifications
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2 text-gray-400" />
                    SMS Notifications
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <X className="h-5 w-5 text-red-400 mx-auto" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                    <Bell className="h-4 w-4 mr-2 text-gray-400" />
                    Real-time Alerts
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <X className="h-5 w-5 text-red-400 mx-auto" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <X className="h-5 w-5 text-red-400 mx-auto" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Testimonials */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">What Our Traders Say</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                "The Premium plan has transformed my trading. The signals are incredibly accurate and the analytics help me make better decisions."
              </p>
              <p className="text-sm font-medium text-gray-900">Sarah M. - Premium User</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                "Started with the free plan and upgraded to VIP. The personal advisor and unlimited signals are worth every penny."
              </p>
              <p className="text-sm font-medium text-gray-900">Michael R. - VIP User</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-gray-700 mb-4">
                "Even the Basic plan provides excellent value. Great for someone just getting started with trading signals."
              </p>
              <p className="text-sm font-medium text-gray-900">David L. - Basic User</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
