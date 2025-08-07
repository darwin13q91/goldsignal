-- Add trading-related tables to the database
-- Run this script in your Supabase SQL editor

-- 1. Trading Accounts table
CREATE TABLE IF NOT EXISTS trading_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  broker_name TEXT NOT NULL CHECK (broker_name IN ('ic_markets', 'pepperstone', 'xm', 'fxtm', 'demo')),
  account_id TEXT NOT NULL,
  api_key TEXT,
  api_secret TEXT,
  account_balance DECIMAL(15,2) DEFAULT 0,
  currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'AUD', 'PHP')),
  leverage INTEGER DEFAULT 100 CHECK (leverage > 0),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  last_sync TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint for user + broker + account
ALTER TABLE trading_accounts ADD CONSTRAINT unique_user_broker_account 
  UNIQUE (user_id, broker_name, account_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trading_accounts_user_id ON trading_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_accounts_status ON trading_accounts(status);

-- 2. Auto Trade Settings table
CREATE TABLE IF NOT EXISTS auto_trade_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trading_account_id UUID REFERENCES trading_accounts(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT FALSE,
  risk_per_trade DECIMAL(5,2) DEFAULT 2.0 CHECK (risk_per_trade > 0 AND risk_per_trade <= 10),
  max_concurrent_trades INTEGER DEFAULT 3 CHECK (max_concurrent_trades > 0),
  max_daily_trades INTEGER DEFAULT 10 CHECK (max_daily_trades > 0),
  stop_loss_mode TEXT DEFAULT 'signal' CHECK (stop_loss_mode IN ('signal', 'percentage', 'fixed_amount')),
  take_profit_mode TEXT DEFAULT 'signal' CHECK (take_profit_mode IN ('signal', 'percentage', 'fixed_amount')),
  trading_hours_start TIME DEFAULT '09:00:00',
  trading_hours_end TIME DEFAULT '17:00:00',
  max_drawdown_percentage DECIMAL(5,2) DEFAULT 20.0 CHECK (max_drawdown_percentage > 0),
  emergency_stop BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint for user + trading account
ALTER TABLE auto_trade_settings ADD CONSTRAINT unique_user_trading_account 
  UNIQUE (user_id, trading_account_id);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_auto_trade_settings_user_id ON auto_trade_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_trade_settings_enabled ON auto_trade_settings(enabled);

-- 3. Trade Executions table
CREATE TABLE IF NOT EXISTS trade_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_id UUID REFERENCES signals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trading_account_id UUID REFERENCES trading_accounts(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  lot_size DECIMAL(10,3) NOT NULL CHECK (lot_size > 0),
  entry_price DECIMAL(15,5) NOT NULL,
  stop_loss DECIMAL(15,5),
  take_profit DECIMAL(15,5),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'cancelled', 'closed')),
  broker_order_id TEXT,
  actual_entry_price DECIMAL(15,5),
  actual_exit_price DECIMAL(15,5),
  profit_loss DECIMAL(15,2) DEFAULT 0,
  commission DECIMAL(15,2) DEFAULT 0,
  swap DECIMAL(15,2) DEFAULT 0,
  execution_time TIMESTAMPTZ,
  close_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trade_executions_user_id ON trade_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_executions_signal_id ON trade_executions(signal_id);
CREATE INDEX IF NOT EXISTS idx_trade_executions_status ON trade_executions(status);
CREATE INDEX IF NOT EXISTS idx_trade_executions_symbol ON trade_executions(symbol);
CREATE INDEX IF NOT EXISTS idx_trade_executions_created_at ON trade_executions(created_at DESC);

-- 4. Broker Symbol Info table (for caching)
CREATE TABLE IF NOT EXISTS broker_symbols (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  digits INTEGER DEFAULT 5,
  point DECIMAL(15,10) DEFAULT 0.00001,
  contract_size DECIMAL(15,2) DEFAULT 100000,
  min_lot DECIMAL(10,3) DEFAULT 0.01,
  max_lot DECIMAL(10,3) DEFAULT 100,
  lot_step DECIMAL(10,3) DEFAULT 0.01,
  tick_value DECIMAL(15,5) DEFAULT 1,
  tick_size DECIMAL(15,10) DEFAULT 0.00001,
  margin_required DECIMAL(15,2) DEFAULT 100,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint and indexes
ALTER TABLE broker_symbols ADD CONSTRAINT unique_broker_symbol 
  UNIQUE (broker_name, symbol);

CREATE INDEX IF NOT EXISTS idx_broker_symbols_broker ON broker_symbols(broker_name);
CREATE INDEX IF NOT EXISTS idx_broker_symbols_symbol ON broker_symbols(symbol);

-- 5. Update updated_at timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for all new tables
CREATE TRIGGER update_trading_accounts_updated_at 
  BEFORE UPDATE ON trading_accounts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auto_trade_settings_updated_at 
  BEFORE UPDATE ON auto_trade_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trade_executions_updated_at 
  BEFORE UPDATE ON trade_executions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_trade_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_symbols ENABLE ROW LEVEL SECURITY;

-- Trading accounts: users can only see their own accounts
CREATE POLICY "Users can view their own trading accounts" ON trading_accounts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own trading accounts" ON trading_accounts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own trading accounts" ON trading_accounts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own trading accounts" ON trading_accounts
  FOR DELETE USING (user_id = auth.uid());

-- Auto trade settings: users can only manage their own settings
CREATE POLICY "Users can view their own auto trade settings" ON auto_trade_settings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own auto trade settings" ON auto_trade_settings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own auto trade settings" ON auto_trade_settings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own auto trade settings" ON auto_trade_settings
  FOR DELETE USING (user_id = auth.uid());

-- Trade executions: users can only see their own trades
CREATE POLICY "Users can view their own trade executions" ON trade_executions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own trade executions" ON trade_executions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own trade executions" ON trade_executions
  FOR UPDATE USING (user_id = auth.uid());

-- Broker symbols: read-only for all authenticated users
CREATE POLICY "Authenticated users can view broker symbols" ON broker_symbols
  FOR SELECT USING (auth.role() = 'authenticated');

-- Admin policies (admins can see all data)
CREATE POLICY "Admins can manage all trading accounts" ON trading_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND user_role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all auto trade settings" ON auto_trade_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND user_role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all trade executions" ON trade_executions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND user_role = 'admin'
    )
  );

CREATE POLICY "Admins can manage broker symbols" ON broker_symbols
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND user_role = 'admin'
    )
  );

-- 7. Insert some sample broker symbol data for XAUUSD
INSERT INTO broker_symbols (broker_name, symbol, digits, point, contract_size, min_lot, max_lot, lot_step, tick_value, tick_size, margin_required)
VALUES 
  -- IC Markets XAUUSD
  ('ic_markets', 'XAUUSD', 2, 0.01, 100, 0.01, 100, 0.01, 1, 0.01, 100),
  -- Pepperstone XAUUSD  
  ('pepperstone', 'XAUUSD', 2, 0.01, 100, 0.01, 100, 0.01, 1, 0.01, 100),
  -- XM XAUUSD
  ('xm', 'XAUUSD', 2, 0.01, 100, 0.01, 100, 0.01, 1, 0.01, 100),
  -- Demo broker for testing
  ('demo', 'XAUUSD', 2, 0.01, 100, 0.01, 100, 0.01, 1, 0.01, 100)
ON CONFLICT (broker_name, symbol) DO NOTHING;

-- 8. Create a view for trading account summary
CREATE OR REPLACE VIEW trading_account_summary AS
SELECT 
  ta.id,
  ta.user_id,
  ta.broker_name,
  ta.account_id,
  ta.account_balance,
  ta.currency,
  ta.leverage,
  ta.status,
  ta.last_sync,
  ats.enabled as auto_trade_enabled,
  ats.risk_per_trade,
  ats.max_concurrent_trades,
  COALESCE(te_stats.total_trades, 0) as total_trades,
  COALESCE(te_stats.open_trades, 0) as open_trades,
  COALESCE(te_stats.total_profit_loss, 0) as total_profit_loss,
  COALESCE(te_stats.win_rate, 0) as win_rate
FROM trading_accounts ta
LEFT JOIN auto_trade_settings ats ON ta.id = ats.trading_account_id
LEFT JOIN (
  SELECT 
    trading_account_id,
    COUNT(*) as total_trades,
    COUNT(CASE WHEN status IN ('filled', 'pending') THEN 1 END) as open_trades,
    SUM(profit_loss) as total_profit_loss,
    ROUND(
      (COUNT(CASE WHEN profit_loss > 0 THEN 1 END) * 100.0 / 
       NULLIF(COUNT(CASE WHEN status = 'closed' THEN 1 END), 0)), 2
    ) as win_rate
  FROM trade_executions 
  GROUP BY trading_account_id
) te_stats ON ta.id = te_stats.trading_account_id;

-- Grant permissions to authenticated users
GRANT SELECT ON trading_account_summary TO authenticated;

-- Success message
SELECT 'Trading system database schema created successfully! 🎯' as message;
