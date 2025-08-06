import React from 'react';
import { Crown, Zap, Lock } from 'lucide-react';
import { useFeatureAccess } from '../hooks/useFeatureAccess';

type FeatureType = 
  | 'basic_signals'
  | 'unlimited_signals'
  | 'analytics'
  | 'real_time_alerts'
  | 'subscriber_management'
  | 'custom_signals'
  | 'consultation'
  | 'whatsapp_alerts'
  | 'api_access'
  | 'course_access';

interface UpgradePromptProps {
  feature: FeatureType | string;
  className?: string;
  showModal?: boolean;
  onUpgradeClick?: () => void;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  feature,
  className = "",
  showModal = false,
  onUpgradeClick
}) => {
  const { getRequiredTier } = useFeatureAccess();
  const requiredTier = getRequiredTier(feature as FeatureType);

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case 'premium':
        return {
          name: 'Premium',
          price: 47,
          icon: <Zap className="w-6 h-6" />,
          gradient: 'from-blue-400 to-blue-600',
          benefits: ['Unlimited signals', 'Real-time alerts', 'Advanced analytics']
        };
      case 'vip':
        return {
          name: 'VIP',
          price: 197,
          icon: <Crown className="w-6 h-6" />,
          gradient: 'from-purple-400 to-purple-600',
          benefits: ['Everything in Premium', '1-on-1 calls', 'Custom signals', 'Course access']
        };
      default:
        return {
          name: 'Premium',
          price: 47,
          icon: <Zap className="w-6 h-6" />,
          gradient: 'from-blue-400 to-blue-600',
          benefits: ['Unlimited signals', 'Real-time alerts', 'Advanced analytics']
        };
    }
  };

  const tierInfo = getTierInfo(requiredTier);

  const handleUpgradeClick = () => {
    if (onUpgradeClick) {
      onUpgradeClick();
    } else {
      // Default action - redirect to pricing page
      window.location.href = '/pricing';
    }
  };

  if (showModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 relative">
          <button
            onClick={() => window.history.back()}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
          
          <div className="text-center">
            <div className={`inline-flex p-4 rounded-full bg-gradient-to-r ${tierInfo.gradient} text-white mb-4`}>
              <Lock className="w-8 h-8" />
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Premium Feature</h3>
            <p className="text-gray-600 mb-6">
              {feature} is available for {tierInfo.name} subscribers only.
            </p>
            
            <div className={`bg-gradient-to-r ${tierInfo.gradient} text-white rounded-xl p-6 mb-6`}>
              <div className="flex items-center justify-center mb-3">
                {tierInfo.icon}
                <span className="ml-2 text-xl font-bold">{tierInfo.name}</span>
              </div>
              <div className="text-3xl font-bold mb-2">${tierInfo.price}/month</div>
              <div className="text-sm opacity-90">Everything you need for profitable trading</div>
            </div>
            
            <ul className="text-left space-y-2 mb-6">
              {tierInfo.benefits.map((benefit, index) => (
                <li key={index} className="flex items-center text-gray-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  {benefit}
                </li>
              ))}
            </ul>
            
            <button
              onClick={handleUpgradeClick}
              className={`w-full py-3 px-6 rounded-lg font-semibold text-white bg-gradient-to-r ${tierInfo.gradient} hover:shadow-lg transition-all duration-200`}
            >
              Upgrade to {tierInfo.name} - 50% Off First Month!
            </button>
            
            <p className="text-xs text-gray-500 mt-4">
              30-day money-back guarantee
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`upgrade-prompt bg-gradient-to-r ${tierInfo.gradient} p-6 rounded-lg text-white ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-4">
          <div className="bg-white bg-opacity-20 rounded-full p-2">
            <Lock className="w-6 h-6" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-2">🔒 {tierInfo.name} Feature</h3>
          <p className="mb-4 opacity-90">
            {feature} is available for {tierInfo.name} and VIP subscribers.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleUpgradeClick}
              className="bg-white text-gray-800 px-4 py-2 rounded font-semibold hover:bg-gray-100 transition-colors"
            >
              Upgrade Now - 50% Off First Month!
            </button>
            <button
              onClick={() => window.open('/pricing', '_blank')}
              className="bg-transparent border border-white border-opacity-50 text-white px-4 py-2 rounded font-semibold hover:bg-white hover:bg-opacity-10 transition-colors"
            >
              View All Plans
            </button>
          </div>
        </div>
      </div>
      
      {/* Quick benefits preview */}
      <div className="mt-4 pt-4 border-t border-white border-opacity-20">
        <div className="text-sm opacity-90">
          <strong>{tierInfo.name} includes:</strong> {tierInfo.benefits.join(', ')}
        </div>
      </div>
    </div>
  );
};
