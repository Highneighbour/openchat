import { Request, Response } from 'express'
import { supabase, CallbackData, ReactiveLog, PositionEvent } from '../lib/supabase'
import { validateCallbackSignature, validatePositionEvent } from '../lib/validation'

/**
 * Handles incoming callbacks from Reactive Network
 * This endpoint processes reactive actions and updates the database
 */
export async function handleCallback(req: Request, res: Response) {
  try {
    const callbackData: CallbackData = req.body

    // Validate callback signature
    const validation = await validateCallbackSignature(callbackData)
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      })
    }

    // Log the callback for debugging
    console.log('Received callback:', callbackData)

    // Create reactive log entry
    const reactiveLog: ReactiveLog = {
      position_id: callbackData.positionId,
      status: 'pending',
      payload: callbackData,
      created_at: new Date().toISOString()
    }

    const { data: logData, error: logError } = await supabase
      .from('reactive_logs')
      .insert(reactiveLog)
      .select()
      .single()

    if (logError) {
      console.error('Failed to create reactive log:', logError)
      return res.status(500).json({
        success: false,
        error: 'Failed to log reactive action'
      })
    }

    // Process the callback based on action type
    let success = false
    let destTxHash = ''

    try {
      switch (callbackData.actionData.actionType) {
        case 'hedge':
          // Execute hedging trade
          success = await executeHedgingTrade(callbackData)
          break
        case 'rebalance':
        case 'partial_unwind':
          // Execute rebalancing action
          success = await executeRebalancing(callbackData)
          break
        default:
          throw new Error(`Unsupported action type: ${callbackData.actionData.actionType}`)
      }

      // Update reactive log with results
      const updateData: Partial<ReactiveLog> = {
        status: success ? 'success' : 'failed',
        dest_tx_hash: destTxHash,
        gas_used: success ? 100000 : 0 // Placeholder gas usage
      }

      await supabase
        .from('reactive_logs')
        .update(updateData)
        .eq('id', logData.id)

      // Create position event
      const positionEvent: PositionEvent = {
        position_id: callbackData.positionId,
        event_type: 'threshold_breach',
        event_data: callbackData.actionData,
        created_at: new Date().toISOString()
      }

      await supabase
        .from('position_events')
        .insert(positionEvent)

      return res.status(200).json({
        success: true,
        logId: logData.id,
        actionSuccess: success,
        destTxHash
      })

    } catch (actionError) {
      console.error('Failed to execute reactive action:', actionError)
      
      // Update log with failure
      await supabase
        .from('reactive_logs')
        .update({ status: 'failed' })
        .eq('id', logData.id)

      return res.status(500).json({
        success: false,
        error: `Action execution failed: ${actionError}`
      })
    }

  } catch (error) {
    console.error('Callback handler error:', error)
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}

/**
 * Executes a hedging trade
 * @param callbackData The callback data containing trade parameters
 * @returns Promise<boolean> Success status
 */
async function executeHedgingTrade(callbackData: CallbackData): Promise<boolean> {
  try {
    // In a real implementation, this would:
    // 1. Connect to the destination chain
    // 2. Call the DestinationHandler contract
    // 3. Execute the hedging trade
    // 4. Return the transaction hash

    console.log('Executing hedging trade:', callbackData.actionData)
    
    // Simulate trade execution
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // In production, this would be the actual transaction hash
    const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`
    console.log('Hedging trade executed:', mockTxHash)
    
    return true
  } catch (error) {
    console.error('Hedging trade failed:', error)
    return false
  }
}

/**
 * Executes a rebalancing action
 * @param callbackData The callback data containing rebalancing parameters
 * @returns Promise<boolean> Success status
 */
async function executeRebalancing(callbackData: CallbackData): Promise<boolean> {
  try {
    // In a real implementation, this would:
    // 1. Connect to the origin chain
    // 2. Call the OriginPosition contract
    // 3. Execute the rebalancing action
    // 4. Return the transaction hash

    console.log('Executing rebalancing:', callbackData.actionData)
    
    // Simulate rebalancing execution
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // In production, this would be the actual transaction hash
    const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`
    console.log('Rebalancing executed:', mockTxHash)
    
    return true
  } catch (error) {
    console.error('Rebalancing failed:', error)
    return false
  }
}

/**
 * Health check endpoint
 */
export async function healthCheck(req: Request, res: Response) {
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('positions')
      .select('count')
      .limit(1)

    if (error) {
      throw error
    }

    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    })
  } catch (error) {
    return res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    })
  }
}

// For Vercel serverless functions
export default {
  handleCallback,
  healthCheck
}