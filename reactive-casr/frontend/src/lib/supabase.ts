import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      positions: {
        Row: {
          id: string
          user_id: string
          position_id: string
          origin_chain_id: number
          origin_contract: string
          origin_token: string | null
          position_identifier: string
          threshold: number
          action_type: string
          gas_budget: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          position_id: string
          origin_chain_id: number
          origin_contract: string
          origin_token?: string | null
          position_identifier: string
          threshold: number
          action_type: string
          gas_budget: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          position_id?: string
          origin_chain_id?: number
          origin_contract?: string
          origin_token?: string | null
          position_identifier?: string
          threshold?: number
          action_type?: string
          gas_budget?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      reactive_logs: {
        Row: {
          id: string
          position_id: string
          reactive_tx_hash: string | null
          origin_tx_hash: string | null
          dest_tx_hash: string | null
          gas_used: number | null
          status: string
          payload: any | null
          created_at: string
        }
        Insert: {
          id?: string
          position_id: string
          reactive_tx_hash?: string | null
          origin_tx_hash?: string | null
          dest_tx_hash?: string | null
          gas_used?: number | null
          status: string
          payload?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          position_id?: string
          reactive_tx_hash?: string | null
          origin_tx_hash?: string | null
          dest_tx_hash?: string | null
          gas_used?: number | null
          status?: string
          payload?: any | null
          created_at?: string
        }
      }
      position_events: {
        Row: {
          id: string
          position_id: string
          event_type: string
          event_data: any | null
          origin_tx_hash: string | null
          created_at: string
        }
        Insert: {
          id?: string
          position_id: string
          event_type: string
          event_data?: any | null
          origin_tx_hash?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          position_id?: string
          event_type?: string
          event_data?: any | null
          origin_tx_hash?: string | null
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          user_id: string
          position_id: string | null
          amount: number
          currency: string
          tx_hash: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          position_id?: string | null
          amount: number
          currency: string
          tx_hash?: string | null
          status: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          position_id?: string | null
          amount?: number
          currency?: string
          tx_hash?: string | null
          status?: string
          created_at?: string
        }
      }
    }
  }
}