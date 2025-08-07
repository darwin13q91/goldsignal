import { useState, useEffect, useRef } from 'react';

interface UseLoadingWithTimeoutOptions {
  timeoutMs?: number;
  onTimeout?: () => void;
  resetOnSuccess?: boolean;
}

interface LoadingState {
  isLoading: boolean;
  hasTimedOut: boolean;
  error: string | null;
}

export const useLoadingWithTimeout = (options: UseLoadingWithTimeoutOptions = {}) => {
  const {
    timeoutMs = 30000, // 30 seconds default timeout
    onTimeout,
    resetOnSuccess = true
  } = options;

  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    hasTimedOut: false,
    error: null
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const startLoading = () => {
    if (!mountedRef.current) return;

    setState({
      isLoading: true,
      hasTimedOut: false,
      error: null
    });

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set timeout
    timeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;

      setState(prev => ({
        ...prev,
        isLoading: false,
        hasTimedOut: true,
        error: 'Request timed out. Please check your connection and try again.'
      }));

      onTimeout?.();
    }, timeoutMs);
  };

  const stopLoading = (error?: string) => {
    if (!mountedRef.current) return;

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setState({
      isLoading: false,
      hasTimedOut: false,
      error: error || null
    });
  };

  const reset = () => {
    if (!mountedRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setState({
      isLoading: false,
      hasTimedOut: false,
      error: null
    });
  };

  const executeWithLoading = async <T>(
    asyncFn: () => Promise<T>,
    errorMessage?: string
  ): Promise<T | null> => {
    try {
      startLoading();
      const result = await asyncFn();
      
      if (resetOnSuccess) {
        stopLoading();
      }
      
      return result;
    } catch (error) {
      const message = errorMessage || 
        (error instanceof Error ? error.message : 'An unexpected error occurred');
      
      stopLoading(message);
      console.error('executeWithLoading error:', error);
      return null;
    }
  };

  return {
    ...state,
    startLoading,
    stopLoading,
    reset,
    executeWithLoading
  };
};
