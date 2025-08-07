import axios from 'axios'

interface TwelveDataConfig {
  apiKey: string
  baseUrl: string
}

interface TwelveDataResponse {
  price: string
  symbol: string
  exchange: string
  mic_code: string
  currency: string
  datetime: string
  timestamp: number
}

interface TwelveDataQuote {
  symbol: string
  name: string
  exchange: string
  mic_code: string
  currency: string
  datetime: string
  timestamp: number
  open: string
  high: string
  low: string
  close: string
  volume: string
  previous_close: string
  change: string
  percent_change: string
  average_volume: string
  is_market_open: boolean
}

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

interface TwelveDataTimeSeriesResponse {
  meta: {
    symbol: string
    interval: string
    currency: string
    exchange_timezone: string
    exchange: string
    mic_code: string
    type: string
  }
  values: HistoricalDataPoint[]
  status?: string
  message?: string
}

// Twelve Data API Service - Broker-grade XAUUSD data
class TwelveDataService {
  private config: TwelveDataConfig
  private requestCount: number = 0
  private lastResetTime: number = Date.now()
  private readonly MAX_REQUESTS_PER_DAY = 800 // Free tier limit
  private quotaExhausted = false // Track if quota is exhausted
  private lastQuotaReset = new Date().toDateString() // Track daily reset

  constructor() {
    this.config = {
      apiKey: import.meta.env.VITE_TWELVE_DATA_API_KEY || '',
      baseUrl: 'https://api.twelvedata.com'
    }
    
    if (!this.config.apiKey) {
      console.warn('⚠️ Twelve Data API key not found. Get your free key at: https://twelvedata.com/')
    }
  }

  private canMakeRequest(): boolean {
    // Check if quota was exhausted today
    const today = new Date().toDateString()
    if (this.quotaExhausted && this.lastQuotaReset === today) {
      console.log('🚫 Twelve Data quota exhausted for today, skipping request')
      return false
    }

    // Reset daily counters if new day
    if (this.lastQuotaReset !== today) {
      this.requestCount = 0
      this.quotaExhausted = false
      this.lastQuotaReset = today
      console.log('🔄 Daily API quota reset for Twelve Data')
    }

    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000

    // Reset counter daily (backup check)
    if (now - this.lastResetTime > oneDayMs) {
      this.requestCount = 0
      this.lastResetTime = now
    }

    return this.requestCount < this.MAX_REQUESTS_PER_DAY && !this.quotaExhausted
  }

  // Get real-time Gold price from Twelve Data (broker-grade)
  async getGoldPrice(): Promise<MarketData> {
    if (!this.config.apiKey) {
      throw new Error('Twelve Data API key not configured')
    }

    if (!this.canMakeRequest()) {
      throw new Error('Twelve Data daily API limit reached - quota exhausted for today')
    }

    try {
      this.requestCount++
      console.log(`🏦 Making Twelve Data API call for XAUUSD (${this.requestCount}/${this.MAX_REQUESTS_PER_DAY} today)`)
      console.log(`🔑 Using Twelve Data API key: ${this.config.apiKey.substring(0, 8)}...`)

      // Get real-time price for XAU/USD
      const priceResponse = await axios.get(`${this.config.baseUrl}/price`, {
        params: {
          symbol: 'XAU/USD',
          apikey: this.config.apiKey
        },
        timeout: 10000
      })

      console.log('📊 Twelve Data Price Response:', JSON.stringify(priceResponse.data, null, 2))

      // Check for API errors
      if (priceResponse.data.status === 'error') {
        const errorMessage = priceResponse.data.message || 'Unknown API error'
        console.error('🚫 Twelve Data API Error:', errorMessage)
        
        // Check if it's a quota exhaustion error
        if (errorMessage.includes('run out of API credits') || 
            errorMessage.includes('daily limit') ||
            priceResponse.data.code === 429) {
          console.error('💰 API quota exhausted - marking for today')
          this.quotaExhausted = true
          throw new Error('API_QUOTA_EXHAUSTED')
        }
        
        throw new Error(`Twelve Data API Error: ${errorMessage}`)
      }

      // Get quote data for additional info
      const quoteResponse = await axios.get(`${this.config.baseUrl}/quote`, {
        params: {
          symbol: 'XAU/USD',
          apikey: this.config.apiKey
        },
        timeout: 10000
      })

      console.log('📈 Twelve Data Quote Response:', JSON.stringify(quoteResponse.data, null, 2))

      const priceData = priceResponse.data as TwelveDataResponse
      const quoteData = quoteResponse.data as TwelveDataQuote

      const currentPrice = parseFloat(priceData.price)
      const change = parseFloat(quoteData.change || '0')
      const changePercent = parseFloat(quoteData.percent_change || '0')
      const high = parseFloat(quoteData.high || currentPrice.toString())
      const low = parseFloat(quoteData.low || currentPrice.toString())

      console.log(`✅ Twelve Data real-time Gold price: $${currentPrice.toFixed(2)} (${change > 0 ? '+' : ''}${change.toFixed(2)})`)

      return {
        symbol: 'XAUUSD',
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        high: high,
        low: low,
        volume: parseFloat(quoteData.volume || '0'),
        timestamp: priceData.datetime || new Date().toISOString()
      }

    } catch (error) {
      console.error('❌ Twelve Data API error:', error)
      
      // Check for quota exhaustion errors
      if (error instanceof Error) {
        if (error.message === 'API_QUOTA_EXHAUSTED' || 
            error.message.includes('run out of API credits') || 
            error.message.includes('daily limit')) {
          this.quotaExhausted = true
          console.error('🛑 API quota exhausted - stopping further requests for today')
          throw new Error('Twelve Data API quota exhausted for today. Please wait until tomorrow or upgrade to a paid plan.')
        }
      }

      if (error instanceof Error && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown; status?: number } }
        console.error('📋 Error response data:', axiosError.response?.data)
        console.error('📋 Error response status:', axiosError.response?.status)
        
        // Check for 429 status (rate limit exceeded)
        if (axiosError.response?.status === 429) {
          this.quotaExhausted = true
          console.error('🛑 Rate limit exceeded (429) - stopping further requests')
          throw new Error('Twelve Data API quota exhausted (429). Please wait until tomorrow.')
        }
      }
      
      throw new Error(`Failed to fetch Gold price: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Public method to check if quota is exhausted
  isQuotaExhausted(): boolean {
    return this.quotaExhausted
  }

  // Public method to get remaining requests
  getRemainingRequests(): number {
    if (this.quotaExhausted) return 0
    return Math.max(0, this.MAX_REQUESTS_PER_DAY - this.requestCount)
  }

  // Public method to reset quota manually (for testing)
  resetQuota(): void {
    this.quotaExhausted = false
    this.requestCount = 0
    this.lastQuotaReset = new Date().toDateString()
    console.log('🔄 API quota manually reset')
  }
  async getHistoricalData(interval: string = '1min', outputsize: number = 100): Promise<HistoricalDataPoint[]> {
    if (!this.config.apiKey) {
      throw new Error('Twelve Data API key not configured')
    }
    
    if (!this.canMakeRequest()) {
      throw new Error('Twelve Data daily API limit reached (800 calls)')
    }

    try {
      this.requestCount++
      console.log(`📊 Getting historical Gold data (${interval})`)

      const response = await axios.get(`${this.config.baseUrl}/time_series`, {
        params: {
          symbol: 'XAU/USD',
          interval: interval,
          outputsize: outputsize,
          apikey: this.config.apiKey
        },
        timeout: 15000
      })

      const data = response.data as TwelveDataTimeSeriesResponse
      if (data.status === 'error') {
        console.error('🚫 Historical data error:', data.message)
        throw new Error(`Historical data API error: ${data.message}`)
      }

      console.log(`✅ Retrieved ${data.values?.length || 0} historical Gold data points`)
      return data.values || []

    } catch (error) {
      console.error('❌ Historical data error:', error)
      throw new Error(`Failed to fetch historical data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Get current API usage stats
  getUsageStats() {
    return {
      requestsToday: this.requestCount,
      dailyLimit: this.MAX_REQUESTS_PER_DAY,
      remaining: this.MAX_REQUESTS_PER_DAY - this.requestCount,
      resetTime: new Date(this.lastResetTime + 24 * 60 * 60 * 1000).toLocaleString()
    }
  }
}

export default TwelveDataService
