import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'

export const supabase = createClient(supabaseUrl, supabaseServiceKey)

export interface CallbackData {
  callbackId: string
  positionId: string
  actionData: {
    actionType: string
    amount: number
    token: string
  }
  signature: string
  timestamp: number
}

export interface ReactiveLog {
  id?: string
  position_id: string
  reactive_tx_hash?: string
  origin_tx_hash?: string
  dest_tx_hash?: string
  gas_used?: number
  status: 'pending' | 'success' | 'failed'
  payload?: any
  created_at?: string
}

export interface PositionEvent {
  id?: string
  position_id: string
  event_type: string
  event_data?: any
  origin_tx_hash?: string
  created_at?: string
}