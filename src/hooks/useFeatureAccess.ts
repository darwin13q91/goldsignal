import { useAuth } from './useAuth';

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

type SubscriptionTier = 'free' | 'basic' | 'premium' | 'vip';

const TIER_FEATURES: Record<SubscriptionTier, FeatureType[]> = {
  free: ['basic_signals'],
  basic: ['basic_signals'],
  premium: [
    'basic_signals',
    'unlimited_signals', 
    'analytics',
    'real_time_alerts'
  ],
  vip: [
    'basic_signals',
    'unlimited_signals',
    'analytics', 
    'real_time_alerts',
    'subscriber_management',
    'custom_signals',
    'consultation',
    'whatsapp_alerts',
    'api_access',
    'course_access'
  ]
};

export const useFeatureAccess = () => {
  const { profile } = useAuth();
  
  const hasAccess = (feature: FeatureType): boolean => {
    if (!profile) return false;
    
    const userTier = profile.subscription_tier as SubscriptionTier;
    const tierFeatures = TIER_FEATURES[userTier] || TIER_FEATURES.free;
    
    return tierFeatures.includes(feature);
  };

  const getUpgradeMessage = (feature: FeatureType): string => {
    const featureMessages: Record<FeatureType, string> = {
      basic_signals: 'Basic signals',
      unlimited_signals: 'Unlimited signals',
      analytics: 'Advanced analytics and performance tracking',
      real_time_alerts: 'Real-time email and SMS notifications',
      subscriber_management: 'Subscriber management dashboard',
      custom_signals: 'Custom signal requests',
      consultation: '1-on-1 monthly consultation calls',
      whatsapp_alerts: 'WhatsApp and Telegram alerts',
      api_access: 'API access for automation',
      course_access: 'Premium trading course access'
    };
    
    return featureMessages[feature] || 'This feature';
  };

  const getRequiredTier = (feature: FeatureType): SubscriptionTier => {
    for (const [tier, features] of Object.entries(TIER_FEATURES)) {
      if (features.includes(feature)) {
        return tier as SubscriptionTier;
      }
    }
    return 'premium';
  };

  const canAccessSignalCount = (): number => {
    if (!profile) return 0;
    
    const userTier = profile.subscription_tier as SubscriptionTier;
    
    switch (userTier) {
      case 'free':
      case 'basic':
        return 5; // 5 signals per month
      case 'premium':
      case 'vip':
        return -1; // Unlimited
      default:
        return 0;
    }
  };

  return {
    hasAccess,
    getUpgradeMessage,
    getRequiredTier,
    canAccessSignalCount,
    userTier: profile?.subscription_tier as SubscriptionTier || 'free'
  };
};
