import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Position, ReactiveLog, PositionEvent, Payment } from '../types'

export const useSupabase = () => {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const getPositions = async (): Promise<Position[]> => {
    if (!user) return []

    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching positions:', error)
      return []
    }

    return data || []
  }

  const createPosition = async (positionData: Omit<Position, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('positions')
      .insert({
        user_id: user.id,
        ...positionData
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating position:', error)
      throw error
    }

    return data
  }

  const updatePosition = async (id: string, updates: Partial<Position>) => {
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('positions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating position:', error)
      throw error
    }

    return data
  }

  const getReactiveLogs = async (positionId?: string): Promise<ReactiveLog[]> => {
    if (!user) return []

    let query = supabase
      .from('reactive_logs')
      .select(`
        *,
        positions!inner(user_id)
      `)
      .eq('positions.user_id', user.id)
      .order('created_at', { ascending: false })

    if (positionId) {
      query = query.eq('position_id', positionId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching reactive logs:', error)
      return []
    }

    return data || []
  }

  const getPositionEvents = async (positionId?: string): Promise<PositionEvent[]> => {
    if (!user) return []

    let query = supabase
      .from('position_events')
      .select(`
        *,
        positions!inner(user_id)
      `)
      .eq('positions.user_id', user.id)
      .order('created_at', { ascending: false })

    if (positionId) {
      query = query.eq('position_id', positionId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching position events:', error)
      return []
    }

    return data || []
  }

  const getPayments = async (): Promise<Payment[]> => {
    if (!user) return []

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching payments:', error)
      return []
    }

    return data || []
  }

  const createPayment = async (paymentData: Omit<Payment, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        ...paymentData
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating payment:', error)
      throw error
    }

    return data
  }

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    getPositions,
    createPosition,
    updatePosition,
    getReactiveLogs,
    getPositionEvents,
    getPayments,
    createPayment
  }
}