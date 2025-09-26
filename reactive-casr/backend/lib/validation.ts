import { ethers } from 'ethers'
import { CallbackData } from './supabase'

export interface ValidationResult {
  isValid: boolean
  error?: string
  data?: any
}

/**
 * Validates callback signature from Reactive Network
 * @param callbackData The callback data to validate
 * @returns Validation result
 */
export async function validateCallbackSignature(callbackData: CallbackData): Promise<ValidationResult> {
  try {
    // In a real implementation, this would validate the signature from the Reactive Network
    // For now, we'll implement a basic validation structure
    
    if (!callbackData.callbackId || !callbackData.positionId || !callbackData.signature) {
      return {
        isValid: false,
        error: 'Missing required callback data'
      }
    }

    // Validate signature format
    if (!ethers.isHexString(callbackData.signature, 65)) {
      return {
        isValid: false,
        error: 'Invalid signature format'
      }
    }

    // Validate timestamp (should be within last 5 minutes)
    const now = Math.floor(Date.now() / 1000)
    const callbackTime = callbackData.timestamp
    if (now - callbackTime > 300) {
      return {
        isValid: false,
        error: 'Callback timestamp too old'
      }
    }

    // In production, you would:
    // 1. Recover the signer from the signature
    // 2. Verify the signer is authorized (Reactive Network)
    // 3. Verify the message hash matches the expected data
    
    return {
      isValid: true,
      data: callbackData
    }
  } catch (error) {
    return {
      isValid: false,
      error: `Validation error: ${error}`
    }
  }
}

/**
 * Validates position event data
 * @param eventData The event data to validate
 * @returns Validation result
 */
export function validatePositionEvent(eventData: any): ValidationResult {
  try {
    if (!eventData.positionId || !eventData.eventType) {
      return {
        isValid: false,
        error: 'Missing required event data'
      }
    }

    const validEventTypes = ['created', 'price_update', 'liquidity_update', 'threshold_breach']
    if (!validEventTypes.includes(eventData.eventType)) {
      return {
        isValid: false,
        error: 'Invalid event type'
      }
    }

    return {
      isValid: true,
      data: eventData
    }
  } catch (error) {
    return {
      isValid: false,
      error: `Event validation error: ${error}`
    }
  }
}

/**
 * Validates reactive log data
 * @param logData The log data to validate
 * @returns Validation result
 */
export function validateReactiveLog(logData: any): ValidationResult {
  try {
    if (!logData.positionId || !logData.status) {
      return {
        isValid: false,
        error: 'Missing required log data'
      }
    }

    const validStatuses = ['pending', 'success', 'failed']
    if (!validStatuses.includes(logData.status)) {
      return {
        isValid: false,
        error: 'Invalid status'
      }
    }

    return {
      isValid: true,
      data: logData
    }
  } catch (error) {
    return {
      isValid: false,
      error: `Log validation error: ${error}`
    }
  }
}