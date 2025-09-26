-- Users are handled by Supabase Auth

-- Positions: user's configured positions / thresholds to be monitored
CREATE TABLE public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  position_id text NOT NULL UNIQUE, -- on-chain position ID
  origin_chain_id bigint NOT NULL,
  origin_contract text NOT NULL,
  origin_token text,
  position_identifier text, -- e.g. LP token id or user tx ref
  threshold numeric NOT NULL, -- decimal threshold (e.g., price)
  action_type text NOT NULL, -- 'partial_unwind' | 'rebalance' | 'hedge'
  gas_budget bigint DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Position events: records of position-related events
CREATE TABLE public.position_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id text NOT NULL,
  event_type text NOT NULL, -- 'created' | 'price_update' | 'liquidity_update' | 'threshold_breach'
  event_data jsonb,
  origin_tx_hash text,
  created_at timestamptz DEFAULT now()
);

-- Reactive logs: records of reactive attempts and results
CREATE TABLE public.reactive_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id text NOT NULL,
  reactive_tx_hash text,
  origin_tx_hash text,
  dest_tx_hash text,
  gas_used numeric,
  status text, -- 'pending'|'success'|'failed'
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

-- Payments: records of gas payments and fees
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  position_id text,
  amount numeric NOT NULL,
  currency text NOT NULL, -- 'REACT' | 'ETH' | 'USDC'
  tx_hash text,
  status text, -- 'pending'|'confirmed'|'failed'
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_positions_user ON public.positions(user_id);
CREATE INDEX idx_positions_position_id ON public.positions(position_id);
CREATE INDEX idx_position_events_position ON public.position_events(position_id);
CREATE INDEX idx_reactive_logs_position ON public.reactive_logs(position_id);
CREATE INDEX idx_payments_user ON public.payments(user_id);

-- RLS policies (basic)
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactive_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Allow users to read/write their own positions
CREATE POLICY "allow_owner_positions" ON public.positions
  USING ( auth.uid() = user_id );

CREATE POLICY "insert_for_authenticated_positions" ON public.positions
  FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "update_for_owner_positions" ON public.positions
  FOR UPDATE
  USING ( auth.uid() = user_id );

-- Allow users to read position events for their positions
CREATE POLICY "allow_owner_position_events" ON public.position_events
  FOR SELECT
  USING ( 
    position_id IN (
      SELECT p.position_id FROM public.positions p WHERE p.user_id = auth.uid()
    )
  );

-- Allow users to read reactive logs for their positions
CREATE POLICY "allow_owner_reactive_logs" ON public.reactive_logs
  FOR SELECT
  USING ( 
    position_id IN (
      SELECT p.position_id FROM public.positions p WHERE p.user_id = auth.uid()
    )
  );

-- Allow users to read their own payments
CREATE POLICY "allow_owner_payments" ON public.payments
  USING ( auth.uid() = user_id );

CREATE POLICY "insert_for_authenticated_payments" ON public.payments
  FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

-- Allow service role to insert position events and reactive logs
CREATE POLICY "service_role_position_events" ON public.position_events
  FOR INSERT
  WITH CHECK ( auth.role() = 'service_role' );

CREATE POLICY "service_role_reactive_logs" ON public.reactive_logs
  FOR INSERT
  WITH CHECK ( auth.role() = 'service_role' );

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON public.positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed data (system configuration, not user data)
INSERT INTO public.positions (
  user_id,
  position_id,
  origin_chain_id,
  origin_contract,
  origin_token,
  position_identifier,
  threshold,
  action_type,
  gas_budget,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- system user
  'system-config',
  1597, -- Reactive Mainnet
  '0x0000000000000000000000000000000000000000',
  '0x0000000000000000000000000000000000000000',
  'system',
  1000000000000000000, -- 1 REACT threshold
  'rebalance',
  100000000000000000, -- 0.1 REACT gas budget
  false
) ON CONFLICT (position_id) DO NOTHING;