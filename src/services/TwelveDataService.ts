interface MarketData {
  symbol: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  volume: number
  timestamp: string
}

interface HistoricalDataPoint {
  datetime: string
  open: string
  high: string
  low: string
  close: string
  volume: string
}

// EMERGENCY MODE: Twelve Data API Service - ALL API CALLS DISABLED
class TwelveDataService {
  private readonly MAX_REQUESTS_PER_DAY = 0 // EMERGENCY: No requests allowed

  constructor() {
    // EMERGENCY: Do minimal initialization - silent mode
  }

  // Get real-time Gold price - EMERGENCY: Returns mock data only
  async getGoldPrice(): Promise<MarketData> {
    // EMERGENCY: Return mock data instead of making API calls - silent mode
    
    // Generate realistic gold price mock data
    const basePrice = 2650 // Realistic current gold price
    const variation = (Math.random() - 0.5) * 20 // ±$10 variation
    const mockPrice = basePrice + variation
    const mockChange = (Math.random() - 0.5) * 10 // ±$5 change
    const mockChangePercent = (mockChange / mockPrice) * 100
    
    return {
      symbol: 'XAUUSD (EMERGENCY MOCK)',
      price: Math.round(mockPrice * 100) / 100,
      change: Math.round(mockChange * 100) / 100,
      changePercent: Math.round(mockChangePercent * 100) / 100,
      high: Math.round((mockPrice + Math.abs(variation)) * 100) / 100,
      low: Math.round((mockPrice - Math.abs(variation)) * 100) / 100,
      volume: Math.floor(Math.random() * 1000000) + 500000,
      timestamp: new Date().toISOString()
    }
  }

  // Public method to check if quota is exhausted
  isQuotaExhausted(): boolean {
    // EMERGENCY: Always return true to stop ALL API calls
    return true
  }

  // Public method to get remaining requests
  getRemainingRequests(): number {
    // EMERGENCY: Always return 0 to indicate no requests available
    return 0
  }

  // Public method to reset quota manually (for testing)
  resetQuota(): void {
    // EMERGENCY: Do nothing - keep quota permanently exhausted - silent mode
  }
  
  async getHistoricalData(): Promise<HistoricalDataPoint[]> {
    // EMERGENCY: Return empty array to prevent API calls - silent mode
    return []
  }

  // Get current API usage stats
  getUsageStats() {
    return {
      requestsToday: 9999, // Show high number to indicate problem
      dailyLimit: this.MAX_REQUESTS_PER_DAY,
      remaining: 0, // Always show 0 remaining
      resetTime: 'EMERGENCY MODE - API CALLS BLOCKED'
    }
  }
}

// Export the service as a singleton instance
const twelveDataService = new TwelveDataService()
export default twelveDataService
