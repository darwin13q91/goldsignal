import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'
import { demoBrokerAPI } from './DemoBrokerAPI'

type Signal = Database['public']['Tables']['signals']['Row']

// Broker API interfaces
export interface TradingAccount {
  id: string
  user_id: string
  broker_name: string
  account_id: string
  api_key?: string
  api_secret?: string
  account_balance: number
  currency: string
  leverage: number
  status: 'active' | 'inactive' | 'error'
  last_sync: string
  created_at: string
  updated_at: string
}

export interface AutoTradeSettings {
  id: string
  user_id: string
  trading_account_id: string
  enabled: boolean
  risk_per_trade: number // Percentage (1-5%)
  max_concurrent_trades: number
  max_daily_trades: number
  stop_loss_mode: 'signal' | 'percentage' | 'fixed_amount'
  take_profit_mode: 'signal' | 'percentage' | 'fixed_amount'
  trading_hours_start: string // "09:00"
  trading_hours_end: string // "17:00"
  max_drawdown_percentage: number
  emergency_stop: boolean
  created_at: string
  updated_at: string
}

export interface TradeExecution {
  id: string
  signal_id: string
  user_id: string
  trading_account_id: string
  symbol: string
  trade_type: 'buy' | 'sell'
  lot_size: number
  entry_price: number
  stop_loss: number
  take_profit: number
  status: 'pending' | 'filled' | 'cancelled' | 'closed'
  broker_order_id?: string
  actual_entry_price?: number
  actual_exit_price?: number
  profit_loss?: number
  commission?: number
  swap?: number
  execution_time?: string
  close_time?: string
  created_at: string
  updated_at: string
}

// Position sizing and risk management
export interface RiskCalculator {
  calculateLotSize(
    accountBalance: number,
    riskPercentage: number,
    entryPrice: number,
    stopLossPrice: number,
    symbolInfo: SymbolInfo
  ): number
  
  validateTrade(
    signal: Signal,
    account: TradingAccount,
    settings: AutoTradeSettings
  ): { valid: boolean; reason?: string }
  
  checkDrawdownLimits(account: TradingAccount, settings: AutoTradeSettings): boolean
}

export interface SymbolInfo {
  symbol: string
  digits: number
  point: number
  contract_size: number
  min_lot: number
  max_lot: number
  lot_step: number
  tick_value: number
  tick_size: number
  margin_required: number
}

// Broker-specific implementations
export interface BrokerAPI {
  name: string
  
  // Account management
  getAccountInfo(credentials: BrokerCredentials): Promise<AccountInfo>
  getAccountBalance(credentials: BrokerCredentials): Promise<number>
  
  // Market data
  getSymbolInfo(symbol: string, credentials: BrokerCredentials): Promise<SymbolInfo>
  getCurrentPrice(symbol: string, credentials: BrokerCredentials): Promise<{ bid: number; ask: number }>
  
  // Order management
  placeBuyOrder(order: OrderRequest, credentials: BrokerCredentials): Promise<OrderResult>
  placeSellOrder(order: OrderRequest, credentials: BrokerCredentials): Promise<OrderResult>
  closeOrder(orderId: string, credentials: BrokerCredentials): Promise<boolean>
  modifyOrder(orderId: string, newSL: number, newTP: number, credentials: BrokerCredentials): Promise<boolean>
  
  // Position monitoring
  getOpenPositions(credentials: BrokerCredentials): Promise<Position[]>
  getTradeHistory(credentials: BrokerCredentials, from?: Date, to?: Date): Promise<TradeHistory[]>
}

export interface BrokerCredentials {
  api_key: string
  api_secret?: string
  account_id: string
  server?: string
  password?: string
}

export interface AccountInfo {
  balance: number
  equity: number
  margin: number
  free_margin: number
  margin_level: number
  currency: string
  leverage: number
}

export interface OrderRequest {
  symbol: string
  lot_size: number
  order_type: 'buy' | 'sell'
  entry_price?: number // For pending orders
  stop_loss?: number
  take_profit?: number
  comment?: string
}

export interface OrderResult {
  success: boolean
  order_id?: string
  actual_price?: number
  error_message?: string
}

export interface Position {
  id: string
  symbol: string
  type: 'buy' | 'sell'
  lot_size: number
  open_price: number
  current_price: number
  stop_loss?: number
  take_profit?: number
  profit: number
  swap: number
  commission: number
  open_time: string
}

export interface TradeHistory {
  id: string
  symbol: string
  type: 'buy' | 'sell'
  lot_size: number
  open_price: number
  close_price: number
  profit: number
  commission: number
  swap: number
  open_time: string
  close_time: string
}

/**
 * Main service for broker integration and auto-trading
 */
class BrokerIntegrationService {
  private brokers: Map<string, BrokerAPI> = new Map()
  private riskCalculator: RiskCalculator

  constructor() {
    this.riskCalculator = new DefaultRiskCalculator()
    this.initializeBrokers()
  }

  private initializeBrokers() {
    // Initialize broker APIs
    this.brokers.set('demo', demoBrokerAPI)
    
    // TODO: Initialize real broker APIs
    // this.brokers.set('ic_markets', new ICMarketsAPI())
    // this.brokers.set('pepperstone', new PepperstoneAPI())
    
    console.log(`🔌 ${this.brokers.size} broker API(s) initialized`)
  }

  // Trading account management
  async createTradingAccount(userId: string, brokerData: {
    broker_name: string
    account_id: string
    api_key: string
    api_secret?: string
  }): Promise<TradingAccount | null> {
    try {
      // Validate broker credentials first
      const broker = this.brokers.get(brokerData.broker_name)
      if (!broker) {
        throw new Error(`Broker ${brokerData.broker_name} not supported`)
      }

      const credentials: BrokerCredentials = {
        api_key: brokerData.api_key,
        api_secret: brokerData.api_secret,
        account_id: brokerData.account_id
      }

      // Test connection and get account info
      const accountInfo = await broker.getAccountInfo(credentials)

      // Save to database
      const { data, error } = await supabase
        .from('trading_accounts')
        .insert({
          user_id: userId,
          broker_name: brokerData.broker_name,
          account_id: brokerData.account_id,
          api_key: brokerData.api_key,
          api_secret: brokerData.api_secret,
          account_balance: accountInfo.balance,
          currency: accountInfo.currency,
          leverage: accountInfo.leverage,
          status: 'active',
          last_sync: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data

    } catch (error) {
      console.error('Error creating trading account:', error)
      return null
    }
  }

  // Auto-trade settings management
  async createAutoTradeSettings(userId: string, tradingAccountId: string, settings: {
    risk_per_trade: number
    max_concurrent_trades: number
    max_daily_trades: number
    stop_loss_mode: string
    take_profit_mode: string
    trading_hours_start: string
    trading_hours_end: string
    max_drawdown_percentage: number
  }): Promise<AutoTradeSettings | null> {
    try {
      const { data, error } = await supabase
        .from('auto_trade_settings')
        .insert({
          user_id: userId,
          trading_account_id: tradingAccountId,
          enabled: false, // Start disabled for safety
          ...settings
        })
        .select()
        .single()

      if (error) throw error
      return data

    } catch (error) {
      console.error('Error creating auto-trade settings:', error)
      return null
    }
  }

  // Execute signal as auto-trade
  async executeSignalAutoTrade(signal: Signal, userTradingAccounts: TradingAccount[]): Promise<void> {
    console.log(`🎯 Executing auto-trades for signal: ${signal.symbol} ${signal.type.toUpperCase()}`)

    for (const account of userTradingAccounts) {
      try {
        // Get auto-trade settings
        const settings = await this.getAutoTradeSettings(account.user_id, account.id)
        if (!settings || !settings.enabled) {
          console.log(`⏭️ Auto-trading disabled for account ${account.account_id}`)
          continue
        }

        // Validate trade
        const validation = this.riskCalculator.validateTrade(signal, account, settings)
        if (!validation.valid) {
          console.log(`❌ Trade validation failed for ${account.account_id}: ${validation.reason}`)
          continue
        }

        // Check trading hours
        if (!this.isWithinTradingHours(settings)) {
          console.log(`⏰ Outside trading hours for account ${account.account_id}`)
          continue
        }

        // Calculate position size
        const broker = this.brokers.get(account.broker_name)
        if (!broker) {
          console.log(`❌ Broker ${account.broker_name} not supported`)
          continue
        }

        const symbolInfo = await broker.getSymbolInfo(signal.symbol, {
          api_key: account.api_key!,
          api_secret: account.api_secret,
          account_id: account.account_id
        })

        const lotSize = this.riskCalculator.calculateLotSize(
          account.account_balance,
          settings.risk_per_trade,
          signal.entry_price,
          signal.stop_loss,
          symbolInfo
        )

        // Place order
        const orderRequest: OrderRequest = {
          symbol: signal.symbol,
          lot_size: lotSize,
          order_type: signal.type,
          stop_loss: signal.stop_loss,
          take_profit: signal.take_profit,
          comment: `Auto-trade from signal ${signal.id}`
        }

        const orderResult = signal.type === 'buy' 
          ? await broker.placeBuyOrder(orderRequest, {
              api_key: account.api_key!,
              api_secret: account.api_secret,
              account_id: account.account_id
            })
          : await broker.placeSellOrder(orderRequest, {
              api_key: account.api_key!,
              api_secret: account.api_secret,
              account_id: account.account_id
            })

        // Record trade execution
        if (orderResult.success) {
          await this.recordTradeExecution({
            signal_id: signal.id,
            user_id: account.user_id,
            trading_account_id: account.id,
            symbol: signal.symbol,
            trade_type: signal.type,
            lot_size: lotSize,
            entry_price: signal.entry_price,
            stop_loss: signal.stop_loss,
            take_profit: signal.take_profit,
            status: 'filled',
            broker_order_id: orderResult.order_id,
            actual_entry_price: orderResult.actual_price,
            execution_time: new Date().toISOString()
          })

          console.log(`✅ Auto-trade executed for ${account.account_id}: ${lotSize} lots of ${signal.symbol}`)
        } else {
          console.log(`❌ Order failed for ${account.account_id}: ${orderResult.error_message}`)
        }

      } catch (error) {
        console.error(`Error executing auto-trade for account ${account.account_id}:`, error)
      }
    }
  }

  // Helper methods
  private async getAutoTradeSettings(userId: string, tradingAccountId: string): Promise<AutoTradeSettings | null> {
    try {
      const { data, error } = await supabase
        .from('auto_trade_settings')
        .select('*')
        .eq('user_id', userId)
        .eq('trading_account_id', tradingAccountId)
        .single()

      if (error) return null
      return data
    } catch {
      return null
    }
  }

  private isWithinTradingHours(settings: AutoTradeSettings): boolean {
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5) // "HH:MM"
    
    return currentTime >= settings.trading_hours_start && 
           currentTime <= settings.trading_hours_end
  }

  private async recordTradeExecution(execution: Omit<TradeExecution, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('trade_executions')
        .insert(execution)

      if (error) throw error
    } catch (error) {
      console.error('Error recording trade execution:', error)
    }
  }

  // Public methods for UI
  async getTradingAccounts(userId: string): Promise<TradingAccount[]> {
    try {
      const { data, error } = await supabase
        .from('trading_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching trading accounts:', error)
      return []
    }
  }

  async getTradeHistory(userId: string, limit = 50): Promise<TradeExecution[]> {
    try {
      const { data, error } = await supabase
        .from('trade_executions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching trade history:', error)
      return []
    }
  }

  async syncAccountBalance(tradingAccountId: string): Promise<boolean> {
    try {
      const { data: account } = await supabase
        .from('trading_accounts')
        .select('*')
        .eq('id', tradingAccountId)
        .single()

      if (!account) return false

      const broker = this.brokers.get(account.broker_name)
      if (!broker) return false

      const balance = await broker.getAccountBalance({
        api_key: account.api_key!,
        api_secret: account.api_secret,
        account_id: account.account_id
      })

      const { error } = await supabase
        .from('trading_accounts')
        .update({
          account_balance: balance,
          last_sync: new Date().toISOString()
        })
        .eq('id', tradingAccountId)

      return !error
    } catch (error) {
      console.error('Error syncing account balance:', error)
      return false
    }
  }
}

// Default risk calculator implementation
class DefaultRiskCalculator implements RiskCalculator {
  calculateLotSize(
    accountBalance: number,
    riskPercentage: number,
    entryPrice: number,
    stopLossPrice: number,
    symbolInfo: SymbolInfo
  ): number {
    // Risk amount in account currency
    const riskAmount = accountBalance * (riskPercentage / 100)
    
    // Calculate pip value
    const pipDistance = Math.abs(entryPrice - stopLossPrice) / symbolInfo.point
    const pipValue = symbolInfo.tick_value * (symbolInfo.point / symbolInfo.tick_size)
    
    // Calculate lot size
    const lotSize = riskAmount / (pipDistance * pipValue)
    
    // Round to lot step and apply min/max limits
    const roundedLotSize = Math.round(lotSize / symbolInfo.lot_step) * symbolInfo.lot_step
    
    return Math.max(
      symbolInfo.min_lot,
      Math.min(symbolInfo.max_lot, roundedLotSize)
    )
  }

  validateTrade(
    _signal: Signal,
    account: TradingAccount,
    settings: AutoTradeSettings
  ): { valid: boolean; reason?: string } {
    // Check if account is active
    if (account.status !== 'active') {
      return { valid: false, reason: 'Trading account not active' }
    }

    // Check emergency stop
    if (settings.emergency_stop) {
      return { valid: false, reason: 'Emergency stop activated' }
    }

    // Check risk percentage
    if (settings.risk_per_trade > 5) {
      return { valid: false, reason: 'Risk per trade too high (max 5%)' }
    }

    // Check minimum account balance (should have at least $100)
    if (account.account_balance < 100) {
      return { valid: false, reason: 'Insufficient account balance' }
    }

    return { valid: true }
  }

  checkDrawdownLimits(): boolean {
    // This would need to track historical balance and calculate current drawdown
    // For now, always return true - implement proper drawdown tracking later
    return true
  }
}

export const brokerIntegrationService = new BrokerIntegrationService()
