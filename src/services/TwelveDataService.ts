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
    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000

    // Reset counter daily
    if (now - this.lastResetTime > oneDayMs) {
      this.requestCount = 0
      this.lastResetTime = now
    }

    return this.requestCount < this.MAX_REQUESTS_PER_DAY
  }

  // Get real-time Gold price from Twelve Data (broker-grade)
  async getGoldPrice(): Promise<MarketData> {
    if (!this.config.apiKey) {
      console.log('🔑 No Twelve Data API key - using mock data')
      return this.generateMockGoldData()
    }

    if (!this.canMakeRequest()) {
      console.log('📊 Twelve Data daily limit reached (800 calls) - using mock data')
      return this.generateMockGoldData()
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
        console.error('🚫 Twelve Data API Error:', priceResponse.data.message)
        console.log('🔄 Falling back to mock data')
        return this.generateMockGoldData()
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
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown; status?: number } }
        console.error('📋 Error response data:', axiosError.response?.data)
        console.error('📋 Error response status:', axiosError.response?.status)
      }
      console.log('🔄 Falling back to mock data due to error')
      return this.generateMockGoldData()
    }
  }

  // Get historical data for technical analysis
  async getHistoricalData(interval: string = '1min', outputsize: number = 100): Promise<HistoricalDataPoint[]> {
    if (!this.config.apiKey || !this.canMakeRequest()) {
      return this.generateMockHistoricalData()
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
        return this.generateMockHistoricalData()
      }

      console.log(`✅ Retrieved ${data.values?.length || 0} historical Gold data points`)
      return data.values || []

    } catch (error) {
      console.error('❌ Historical data error:', error)
      return this.generateMockHistoricalData()
    }
  }

  // Generate realistic mock Gold data (current market prices)
  private generateMockGoldData(): MarketData {
    // Current Gold price range (August 2025)
    const basePrice = 2662.75
    const volatility = 12 // ±$12 realistic daily range for Gold
    const randomChange = (Math.random() - 0.5) * volatility * 2
    const currentPrice = basePrice + randomChange

    const change = (Math.random() - 0.5) * 8 // ±$8 daily change
    const changePercent = (change / currentPrice) * 100

    const high = currentPrice + Math.random() * 5
    const low = currentPrice - Math.random() * 5

    console.log(`📊 Generated realistic Gold mock data: $${currentPrice.toFixed(2)} (${change > 0 ? '+' : ''}${change.toFixed(2)})`)

    return {
      symbol: 'XAUUSD',
      price: parseFloat(currentPrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      volume: Math.floor(Math.random() * 50000) + 100000, // Realistic volume
      timestamp: new Date().toISOString()
    }
  }

  private generateMockHistoricalData(): HistoricalDataPoint[] {
    const data: HistoricalDataPoint[] = []
    const now = new Date()
    
    for (let i = 99; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 1000) // 1-minute intervals
      const basePrice = 2662.75 + (Math.random() - 0.5) * 20
      const open = basePrice + (Math.random() - 0.5) * 2
      const close = basePrice + (Math.random() - 0.5) * 2
      const high = Math.max(open, close) + Math.random() * 2
      const low = Math.min(open, close) - Math.random() * 2

      data.push({
        datetime: time.toISOString(),
        open: open.toFixed(2),
        high: high.toFixed(2),
        low: low.toFixed(2),
        close: close.toFixed(2),
        volume: (Math.random() * 1000 + 500).toFixed(0)
      })
    }

    return data
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
