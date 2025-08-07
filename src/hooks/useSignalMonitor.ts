import { useEffect, useCallback } from 'react';
import { signalAlertService } from '../services/SignalAlertService';
import { calculateSignalStatus } from '../utils/signalStatus';
import TwelveDataService from '../services/TwelveDataService';
import type { Database } from '../lib/supabase';

type Signal = Database['public']['Tables']['signals']['Row'];

interface SignalMonitorProps {
  signals: Signal[];
  onSignalUpdate: () => void;
}

// This hook monitors signals and automatically sends alerts when TP/SL is hit
export const useSignalMonitor = ({ signals, onSignalUpdate }: SignalMonitorProps) => {
  const checkSignalStatus = useCallback(async () => {
    if (signals.length === 0) return;

    try {
      // Get current Gold price
      const twelveDataService = TwelveDataService;
      const goldData = await twelveDataService.getGoldPrice();
      if (!goldData) return;

      const currentPrice = goldData.price;
      
      // Check each active signal
      const activeSignals = signals.filter(signal => signal.status === 'active');
      
      for (const signal of activeSignals) {
        const statusInfo = calculateSignalStatus(signal, currentPrice);
        
        // If signal hit TP or SL, send alerts
        if (statusInfo.status === 'hit_tp' || statusInfo.status === 'hit_sl') {
          const result = statusInfo.status === 'hit_tp' ? 'win' : 'loss';
          const pnlPercentage = statusInfo.pnlPercentage || 0;
          
          // Send result alert
          await signalAlertService.sendSignalResultAlert(signal, result, pnlPercentage);
          
          console.log(`🎯 Signal ${signal.symbol} ${result.toUpperCase()}: ${pnlPercentage >= 0 ? '+' : ''}${pnlPercentage.toFixed(1)}%`);
          
          // Trigger update to refresh UI
          onSignalUpdate();
        }
      }
      
    } catch (error) {
      console.error('Error checking signal status:', error);
    }
  }, [signals, onSignalUpdate]);

  useEffect(() => {
    // EMERGENCY MODE: All intervals disabled to prevent API calls and console spam
    // Check signals every 30 seconds
    // const interval = setInterval(checkSignalStatus, 30000);
    
    // Initial check - also disabled in emergency mode
    // checkSignalStatus();
    
    // return () => clearInterval(interval);
  }, [checkSignalStatus]);

  return null; // This is a monitoring hook, no UI
};
