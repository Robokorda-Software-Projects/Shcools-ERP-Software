/**
 * Global Error Handling & Recovery Utilities
 */

import { toast } from 'sonner'

// ========== ERROR TYPES ==========

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, details)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super('AUTH_ERROR', message, 401)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super('AUTHZ_ERROR', message, 403)
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409)
    this.name = 'ConflictError'
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('RATE_LIMIT', 'Too many requests. Please try again later', 429, { retryAfter })
    this.name = 'RateLimitError'
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super('DB_ERROR', message, 500, details)
    this.name = 'DatabaseError'
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network connection failed') {
    super('NETWORK_ERROR', message, 0)
    this.name = 'NetworkError'
  }
}

// ========== ERROR HANDLING FUNCTIONS ==========

/**
 * Parse Supabase errors and convert to AppError
 */
export function parseSupabaseError(error: any): AppError {
  console.error('Supabase error:', error)
  
  if (!error) {
    return new AppError('UNKNOWN_ERROR', 'An unknown error occurred', 500)
  }
  
  // Handle Supabase-specific errors
  if (error.code === '23505') {
    return new ConflictError('This record already exists')
  }
  
  if (error.code === '23503') {
    return new ValidationError('Invalid reference to related record')
  }
  
  if (error.code === '42P01') {
    return new DatabaseError('Database table does not exist')
  }
  
  if (error.status === 401) {
    return new AuthenticationError(error.message || 'Session expired')
  }
  
  if (error.status === 403) {
    return new AuthorizationError(error.message || 'Access denied')
  }
  
  if (error.status === 404) {
    return new NotFoundError('Record')
  }
  
  if (error.status === 429) {
    return new RateLimitError()
  }
  
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return new NetworkError(error.message)
  }
  
  // Generic database error
  return new DatabaseError(error.message || 'Database operation failed', { originalError: error })
}

/**
 * Handle errors and show appropriate UI feedback
 */
export function handleError(error: any, context: string = 'Operation'): AppError {
  let appError: AppError
  
  if (error instanceof AppError) {
    appError = error
  } else if (error?.code) {
    // Supabase error
    appError = parseSupabaseError(error)
  } else if (error instanceof Error) {
    appError = new AppError('UNKNOWN_ERROR', error.message, 500)
  } else {
    appError = new AppError('UNKNOWN_ERROR', 'An unexpected error occurred', 500)
  }
  
  // Log error
  logError(appError, context)
  
  // Show toast notification
  showErrorToast(appError)
  
  return appError
}

/**
 * Show error toast with appropriate styling
 */
export function showErrorToast(error: AppError | Error) {
  let title = 'Error'
  let message = error.message
  
  if (error instanceof AppError) {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        title = 'Validation Error'
        break
      case 'AUTH_ERROR':
        title = 'Authentication Failed'
        break
      case 'AUTHZ_ERROR':
        title = 'Access Denied'
        break
      case 'NOT_FOUND':
        title = 'Not Found'
        break
      case 'CONFLICT':
        title = 'Conflict'
        break
      case 'RATE_LIMIT':
        title = 'Too Many Requests'
        break
      case 'DB_ERROR':
        title = 'Database Error'
        break
      case 'NETWORK_ERROR':
        title = 'Connection Failed'
        break
    }
  }
  
  toast.error(title, {
    description: message,
    duration: 5000
  })
}

/**
 * Show success toast
 */
export function showSuccessToast(title: string, description?: string) {
  toast.success(title, {
    description,
    duration: 3000
  })
}

/**
 * Log error to console and external service
 */
export function logError(error: AppError, context: string) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    context,
    details: error.details,
    stack: error.stack,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
    url: typeof window !== 'undefined' ? window.location.href : 'N/A'
  }
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, errorLog)
  }
  
  // TODO: Send to external error tracking service (e.g., Sentry)
  // captureException(error, errorLog)
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt < maxAttempts) {
        const delayMs = initialDelayMs * Math.pow(2, attempt - 1)
        console.log(`Attempt ${attempt} failed. Retrying in ${delayMs}ms...`, lastError.message)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded')
}

/**
 * Validate required fields
 */
export function validateRequiredFields(
  data: Record<string, any>,
  requiredFields: string[]
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  
  for (const field of requiredFields) {
    const value = data[field]
    
    if (value === null || value === undefined || value === '') {
      errors[field] = `${field} is required`
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): boolean {
  // Remove common separators
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')
  // Allow 10-15 digits, optionally starting with +
  return /^\+?[0-9]{8,15}$/.test(cleaned)
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (error instanceof RateLimitError) return true
  if (error instanceof NetworkError) return true
  if (error.code === 'ECONNREFUSED') return true
  if (error.code === 'ETIMEDOUT') return true
  if (error.code === 'ENOTFOUND') return true
  if (error.message?.includes('timeout')) return true
  if (error.message?.includes('network')) return true
  
  return false
}

/**
 * Create async error boundary wrapper
 */
export function asyncHandler(fn: (req: any, res: any) => Promise<void>) {
  return (req: any, res: any) => {
    Promise.resolve(fn(req, res)).catch((error) => {
      const appError = handleError(error, 'API Handler')
      res.status(appError.statusCode).json({
        error: {
          code: appError.code,
          message: appError.message,
          details: appError.details
        }
      })
    })
  }
}

/**
 * Format error message for user display
 */
export function formatErrorMessage(error: AppError): string {
  switch (error.code) {
    case 'VALIDATION_ERROR':
      return 'Please check your input and try again'
    case 'AUTH_ERROR':
      return 'Your session has expired. Please log in again'
    case 'AUTHZ_ERROR':
      return 'You do not have permission to perform this action'
    case 'NOT_FOUND':
      return 'The requested resource was not found'
    case 'CONFLICT':
      return 'This resource already exists'
    case 'RATE_LIMIT':
      return 'Too many requests. Please wait a moment and try again'
    case 'DB_ERROR':
      return 'A database error occurred. Please try again later'
    case 'NETWORK_ERROR':
      return 'Network connection failed. Please check your internet connection'
    default:
      return error.message || 'An unexpected error occurred'
  }
}
