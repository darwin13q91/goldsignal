import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useLoadingWithTimeout } from '../hooks/useLoadingWithTimeout';

export const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const planType = searchParams.get('plan');
  const sessionId = searchParams.get('session_id');

  // Use loading with timeout for payment verification
  const paymentVerification = useLoadingWithTimeout({
    timeoutMs: 30000, // 30 seconds for payment verification
    onTimeout: () => {
      console.warn('Payment verification timed out')
    }
  });

  useEffect(() => {
    const processPayment = async () => {
      if (!sessionId) {
        paymentVerification.stopLoading('Payment verification failed. Please contact support.');
        return;
      }

      await paymentVerification.executeWithLoading(
        async () => {
          const response = await fetch('/api/verify-paymongo-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              session_id: sessionId,
              user_id: user?.id
            })
          });

          const result = await response.json();
          
          if (!result.success) {
            throw new Error(result.error || 'Payment verification failed. Please contact support.');
          }

          return result;
        },
        'Payment verification failed. Please contact support.'
      );
    };

    // Add a small delay for better UX
    const timer = setTimeout(processPayment, 2000);
    return () => clearTimeout(timer);
  }, [sessionId, user, paymentVerification]); // Added paymentVerification to fix dependency warning

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleContactSupport = () => {
    window.location.href = 'mailto:support@goldsignals.com?subject=Payment Issue';
  };

  // Determine current status
  const isProcessing = paymentVerification.isLoading;
  const hasError = paymentVerification.error || paymentVerification.hasTimedOut;
  const isSuccess = !isProcessing && !hasError && sessionId;

  const getStatusMessage = () => {
    if (isProcessing) {
      return paymentVerification.hasTimedOut 
        ? 'Payment verification is taking longer than expected...'
        : 'Processing your subscription...';
    }
    if (paymentVerification.error) {
      return paymentVerification.error;
    }
    if (isSuccess) {
      return `Payment successful! Your ${planType || 'premium'} subscription is now active.`;
    }
    return 'Payment verification failed. Please contact support.';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Status Icon */}
          <div className="mb-6">
            {isProcessing && (
              <div className="w-16 h-16 mx-auto">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
              </div>
            )}
            {isSuccess && (
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            )}
            {hasError && (
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
            )}
          </div>

          {/* Status Message */}
          <h1 className={`text-2xl font-bold mb-4 ${
            isSuccess ? 'text-gray-900' : 
            hasError ? 'text-red-700' : 'text-gray-700'
          }`}>
            {isSuccess && 'Welcome to Premium!'}
            {hasError && 'Payment Issue'}
            {isProcessing && 'Processing Payment...'}
          </h1>

          <p className={`text-lg mb-6 ${
            isSuccess ? 'text-gray-600' : 
            hasError ? 'text-red-600' : 'text-gray-500'
          }`}>
            {getStatusMessage()}
          </p>

          {/* Plan Information */}
          {planType && isSuccess && (
            <div className="bg-green-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-green-800 mb-2">
                {planType === 'premium' ? 'Premium Plan' : 'VIP Plan'} Activated
              </h3>
              <p className="text-green-700 text-sm">
                You now have access to all {planType === 'premium' ? 'Premium' : 'VIP'} features:
              </p>
              <ul className="text-green-700 text-sm mt-2 space-y-1">
                {planType === 'premium' ? (
                  <>
                    <li>✓ Unlimited signals</li>
                    <li>✓ Real-time email alerts</li>
                    <li>✓ Advanced analytics</li>
                    <li>✓ Priority support</li>
                  </>
                ) : (
                  <>
                    <li>✓ Everything in Premium</li>
                    <li>✓ 1-on-1 consultation</li>
                    <li>✓ WhatsApp alerts</li>
                    <li>✓ Trading course access</li>
                    <li>✓ Personal mentor</li>
                  </>
                )}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {isSuccess && (
              <button
                onClick={handleBackToDashboard}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Go to Dashboard
              </button>
            )}
            
            {hasError && (
              <>
                <button
                  onClick={handleContactSupport}
                  className="w-full bg-red-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-600 transition-all duration-200"
                >
                  Contact Support
                </button>
                <button
                  onClick={handleBackToDashboard}
                  className="w-full bg-gray-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-600 transition-all duration-200"
                >
                  Back to Dashboard
                </button>
                {paymentVerification.hasTimedOut && (
                  <button
                    onClick={() => {
                      paymentVerification.reset();
                      window.location.reload();
                    }}
                    className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-600 transition-all duration-200"
                  >
                    Try Again
                  </button>
                )}
              </>
            )}
            
            {isProcessing && (
              <div className="flex items-center justify-center text-gray-500">
                <Clock className="w-4 h-4 mr-2" />
                {paymentVerification.hasTimedOut 
                  ? 'Taking longer than expected... Please wait or try refreshing.'
                  : 'Please wait while we confirm your payment...'
                }
              </div>
            )}
          </div>

          {/* Support Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Need help? Email us at{' '}
              <a href="mailto:support@goldsignals.com" className="text-blue-600 hover:underline">
                support@goldsignals.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
