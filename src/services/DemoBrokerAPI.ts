import type {
  BrokerAPI,
  BrokerCredentials,
  AccountInfo,
  SymbolInfo,
  OrderRequest,
  OrderResult,
  Position,
  TradeHistory
} from './BrokerIntegrationService'

/**
 * Demo Broker API Implementation
 * Used for testing and development - simulates real trading environment
 * This provides realistic responses without making actual trades
 */
export class DemoBrokerAPI implements BrokerAPI {
  name = 'demo'
  
  // Simulate account balances for different demo accounts
  private demoAccounts = new Map<string, AccountInfo>([
    ['demo123', {
      balance: 10000,
      equity: 10000,
      margin: 0,
      free_margin: 10000,
      margin_level: 0,
      currency: 'USD',
      leverage: 100
    }],
    ['demo456', {
      balance: 5000,
      equity: 5000,
      margin: 0,
      free_margin: 5000,
      margin_level: 0,
      currency: 'USD',
      leverage: 50
    }]
  ])

  // Simulate open positions
  private openPositions = new Map<string, Position[]>()
  private orderCounter = 1000

  async getAccountInfo(credentials: BrokerCredentials): Promise<AccountInfo> {
    // Simulate API delay
    await this.delay(500)
    
    const accountInfo = this.demoAccounts.get(credentials.account_id)
    if (!accountInfo) {
      throw new Error(`Demo account ${credentials.account_id} not found`)
    }
    
    console.log(`📊 Demo account ${credentials.account_id} info retrieved`)
    return { ...accountInfo }
  }

  async getAccountBalance(credentials: BrokerCredentials): Promise<number> {
    await this.delay(300)
    
    const accountInfo = await this.getAccountInfo(credentials)
    return accountInfo.balance
  }

  async getSymbolInfo(symbol: string, _credentials: BrokerCredentials): Promise<SymbolInfo> {
    await this.delay(200)
    
    // Return realistic symbol info for XAUUSD (Gold)
    if (symbol === 'XAUUSD') {
      return {
        symbol: 'XAUUSD',
        digits: 2,
        point: 0.01,
        contract_size: 100,
        min_lot: 0.01,
        max_lot: 100,
        lot_step: 0.01,
        tick_value: 1,
        tick_size: 0.01,
        margin_required: 100
      }
    }
    
    throw new Error(`Symbol ${symbol} not supported in demo`)
  }

  async getCurrentPrice(symbol: string, _credentials: BrokerCredentials): Promise<{ bid: number; ask: number }> {
    await this.delay(100)
    
    if (symbol === 'XAUUSD') {
      // Generate realistic gold prices around current market
      const basePrice = 2650
      const spread = 0.30 // 30 cent spread
      const variation = (Math.random() - 0.5) * 10 // ±$5 variation
      const currentPrice = basePrice + variation
      
      return {
        bid: Math.round((currentPrice - spread/2) * 100) / 100,
        ask: Math.round((currentPrice + spread/2) * 100) / 100
      }
    }
    
    throw new Error(`Price for ${symbol} not available in demo`)
  }

  async placeBuyOrder(order: OrderRequest, credentials: BrokerCredentials): Promise<OrderResult> {
    await this.delay(800) // Simulate order execution time
    
    console.log(`📈 Demo BUY order: ${order.lot_size} lots of ${order.symbol}`)
    
    // Get current price
    const prices = await this.getCurrentPrice(order.symbol, credentials)
    const executionPrice = prices.ask
    
    // Generate order ID
    const orderId = `DEMO_${this.orderCounter++}`
    
    // Add to open positions
    const position: Position = {
      id: orderId,
      symbol: order.symbol,
      type: 'buy',
      lot_size: order.lot_size,
      open_price: executionPrice,
      current_price: executionPrice,
      stop_loss: order.stop_loss,
      take_profit: order.take_profit,
      profit: 0,
      swap: 0,
      commission: order.lot_size * 7, // $7 per lot commission
      open_time: new Date().toISOString()
    }
    
    const accountPositions = this.openPositions.get(credentials.account_id) || []
    accountPositions.push(position)
    this.openPositions.set(credentials.account_id, accountPositions)
    
    return {
      success: true,
      order_id: orderId,
      actual_price: executionPrice
    }
  }

  async placeSellOrder(order: OrderRequest, credentials: BrokerCredentials): Promise<OrderResult> {
    await this.delay(800)
    
    console.log(`📉 Demo SELL order: ${order.lot_size} lots of ${order.symbol}`)
    
    // Get current price
    const prices = await this.getCurrentPrice(order.symbol, credentials)
    const executionPrice = prices.bid
    
    // Generate order ID
    const orderId = `DEMO_${this.orderCounter++}`
    
    // Add to open positions
    const position: Position = {
      id: orderId,
      symbol: order.symbol,
      type: 'sell',
      lot_size: order.lot_size,
      open_price: executionPrice,
      current_price: executionPrice,
      stop_loss: order.stop_loss,
      take_profit: order.take_profit,
      profit: 0,
      swap: 0,
      commission: order.lot_size * 7,
      open_time: new Date().toISOString()
    }
    
    const accountPositions = this.openPositions.get(credentials.account_id) || []
    accountPositions.push(position)
    this.openPositions.set(credentials.account_id, accountPositions)
    
    return {
      success: true,
      order_id: orderId,
      actual_price: executionPrice
    }
  }

  async closeOrder(orderId: string, credentials: BrokerCredentials): Promise<boolean> {
    await this.delay(600)
    
    const accountPositions = this.openPositions.get(credentials.account_id) || []
    const positionIndex = accountPositions.findIndex(p => p.id === orderId)
    
    if (positionIndex === -1) {
      console.log(`❌ Position ${orderId} not found for closure`)
      return false
    }
    
    const position = accountPositions[positionIndex]
    
    // Get current price for closure
    const prices = await this.getCurrentPrice(position.symbol, credentials)
    const closePrice = position.type === 'buy' ? prices.bid : prices.ask
    
    // Calculate profit
    const priceDiff = position.type === 'buy' 
      ? closePrice - position.open_price
      : position.open_price - closePrice
    const profit = priceDiff * position.lot_size * 100 - position.commission
    
    console.log(`✅ Demo position ${orderId} closed: ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}`)
    
    // Remove from open positions
    accountPositions.splice(positionIndex, 1)
    this.openPositions.set(credentials.account_id, accountPositions)
    
    // Update account balance
    const accountInfo = this.demoAccounts.get(credentials.account_id)
    if (accountInfo) {
      accountInfo.balance += profit
      accountInfo.equity = accountInfo.balance
      this.demoAccounts.set(credentials.account_id, accountInfo)
    }
    
    return true
  }

  async modifyOrder(
    orderId: string, 
    newSL: number, 
    newTP: number, 
    credentials: BrokerCredentials
  ): Promise<boolean> {
    await this.delay(400)
    
    const accountPositions = this.openPositions.get(credentials.account_id) || []
    const position = accountPositions.find(p => p.id === orderId)
    
    if (!position) {
      return false
    }
    
    position.stop_loss = newSL
    position.take_profit = newTP
    
    console.log(`🔄 Demo position ${orderId} modified: SL=${newSL}, TP=${newTP}`)
    return true
  }

  async getOpenPositions(credentials: BrokerCredentials): Promise<Position[]> {
    await this.delay(300)
    
    const positions = this.openPositions.get(credentials.account_id) || []
    
    // Update current prices and profits for all positions
    for (const position of positions) {
      try {
        const prices = await this.getCurrentPrice(position.symbol, credentials)
        position.current_price = position.type === 'buy' ? prices.bid : prices.ask
        
        // Calculate current profit
        const priceDiff = position.type === 'buy' 
          ? position.current_price - position.open_price
          : position.open_price - position.current_price
        position.profit = priceDiff * position.lot_size * 100 - position.commission
      } catch (error) {
        console.error(`Error updating position ${position.id}:`, error)
      }
    }
    
    return [...positions]
  }

  async getTradeHistory(
    credentials: BrokerCredentials, 
    from?: Date, 
    to?: Date
  ): Promise<TradeHistory[]> {
    await this.delay(400)
    
    // Return some sample trade history
    const history: TradeHistory[] = [
      {
        id: 'DEMO_HIST_001',
        symbol: 'XAUUSD',
        type: 'buy',
        lot_size: 0.1,
        open_price: 2640.50,
        close_price: 2645.20,
        profit: 47.00, // 4.70 * 0.1 * 100 - commission
        commission: 7.00,
        swap: 0,
        open_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        close_time: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString()  // 22 hours ago
      },
      {
        id: 'DEMO_HIST_002',
        symbol: 'XAUUSD',
        type: 'sell',
        lot_size: 0.05,
        open_price: 2655.80,
        close_price: 2650.10,
        profit: 21.50, // 5.70 * 0.05 * 100 - commission
        commission: 3.50,
        swap: 0,
        open_time: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        close_time: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString()
      }
    ]
    
    // Filter by date range if provided
    if (from || to) {
      return history.filter(trade => {
        const tradeDate = new Date(trade.close_time)
        if (from && tradeDate < from) return false
        if (to && tradeDate > to) return false
        return true
      })
    }
    
    console.log(`📚 Retrieved ${history.length} demo trades for ${credentials.account_id}`)
    return history
  }

  // Utility methods
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Public method to create demo accounts for testing
  static createDemoAccount(accountId: string): BrokerCredentials {
    return {
      api_key: `demo_key_${accountId}`,
      api_secret: `demo_secret_${accountId}`,
      account_id: accountId
    }
  }

  // Public method to reset demo account
  resetDemoAccount(credentials: BrokerCredentials, newBalance = 10000): void {
    this.demoAccounts.set(credentials.account_id, {
      balance: newBalance,
      equity: newBalance,
      margin: 0,
      free_margin: newBalance,
      margin_level: 0,
      currency: 'USD',
      leverage: 100
    })
    
    // Clear open positions
    this.openPositions.set(credentials.account_id, [])
    
    console.log(`🔄 Demo account ${credentials.account_id} reset with $${newBalance}`)
  }
}

// Export singleton instance
export const demoBrokerAPI = new DemoBrokerAPI()
