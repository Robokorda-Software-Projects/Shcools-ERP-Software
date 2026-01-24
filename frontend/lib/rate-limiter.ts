/**
 * Rate Limiting & Security Middleware
 */

/**
 * Simple in-memory rate limiter
 * For production, use Redis
 */
class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map()
  private readonly windowMs: number
  private readonly maxAttempts: number
  
  constructor(windowMs: number = 15 * 60 * 1000, maxAttempts: number = 5) {
    this.windowMs = windowMs
    this.maxAttempts = maxAttempts
    
    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60 * 1000)
  }
  
  /**
   * Check if identifier is rate limited
   */
  isLimited(identifier: string): boolean {
    const now = Date.now()
    const record = this.attempts.get(identifier)
    
    if (!record) {
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs })
      return false
    }
    
    if (now > record.resetTime) {
      // Window expired, reset
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs })
      return false
    }
    
    record.count++
    return record.count > this.maxAttempts
  }
  
  /**
   * Get remaining attempts
   */
  getRemaining(identifier: string): number {
    const record = this.attempts.get(identifier)
    if (!record) return this.maxAttempts
    
    const now = Date.now()
    if (now > record.resetTime) return this.maxAttempts
    
    return Math.max(0, this.maxAttempts - record.count)
  }
  
  /**
   * Get reset time in seconds
   */
  getResetTime(identifier: string): number {
    const record = this.attempts.get(identifier)
    if (!record) return 0
    
    const now = Date.now()
    const remaining = record.resetTime - now
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0
  }
  
  /**
   * Reset identifier
   */
  reset(identifier: string): void {
    this.attempts.delete(identifier)
  }
  
  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, record] of this.attempts.entries()) {
      if (now > record.resetTime) {
        this.attempts.delete(key)
      }
    }
  }
}

/**
 * Create rate limiter instances
 */
export const loginLimiter = new RateLimiter(15 * 60 * 1000, 5)      // 5 attempts per 15 min
export const apiLimiter = new RateLimiter(60 * 1000, 100)           // 100 requests per min
export const enrollmentLimiter = new RateLimiter(60 * 1000, 10)     // 10 enrollments per min
export const passwordResetLimiter = new RateLimiter(60 * 60 * 1000, 3) // 3 per hour

/**
 * Get client identifier (IP or user ID)
 */
export function getClientIdentifier(req?: any): string {
  if (typeof window === 'undefined') {
    // Server-side
    if (req?.headers) {
      return req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
    }
  }
  // Client-side - use session storage or generate ID
  const stored = typeof window !== 'undefined' ? sessionStorage.getItem('client-id') : null
  if (stored) return stored
  
  const id = Math.random().toString(36).substring(7)
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('client-id', id)
  }
  return id
}

/**
 * Check if login is allowed
 */
export function checkLoginRateLimit(identifier: string): {
  allowed: boolean
  remaining: number
  resetTime: number
} {
  const allowed = !loginLimiter.isLimited(identifier)
  return {
    allowed,
    remaining: loginLimiter.getRemaining(identifier),
    resetTime: loginLimiter.getResetTime(identifier)
  }
}

/**
 * Reset login rate limit (after successful login)
 */
export function resetLoginRateLimit(identifier: string): void {
  loginLimiter.reset(identifier)
}

/**
 * Client-side rate limit check
 */
export function checkClientRateLimit(action: string): {
  allowed: boolean
  remaining: number
  resetTime: number
} {
  const identifier = `${getClientIdentifier()}-${action}`
  const allowed = !apiLimiter.isLimited(identifier)
  return {
    allowed,
    remaining: apiLimiter.getRemaining(identifier),
    resetTime: apiLimiter.getResetTime(identifier)
  }
}

/**
 * Validate request origin (CSRF protection)
 */
export function validateRequestOrigin(req?: any): boolean {
  if (typeof window === 'undefined' && req?.headers) {
    const origin = req.headers.origin
    const referer = req.headers.referer
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      'http://localhost:3000',
      'http://localhost:3001'
    ]
    
    return allowedOrigins.some(allowed => origin?.includes(allowed) || referer?.includes(allowed))
  }
  return true // Client-side, browser handles CSRF
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  if (typeof window === 'undefined') return ''
  
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  sessionStorage.setItem('csrf-token', token)
  return token
}

/**
 * Get CSRF token
 */
export function getCSRFToken(): string {
  if (typeof window === 'undefined') return ''
  return sessionStorage.getItem('csrf-token') || generateCSRFToken()
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string): boolean {
  if (typeof window === 'undefined') return false
  return token === sessionStorage.getItem('csrf-token')
}

/**
 * Security headers for API responses
 */
export function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  }
}

/**
 * Add security headers to fetch requests
 */
export function addSecurityHeaders(init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: {
      ...init?.headers,
      'X-CSRF-Token': getCSRFToken(),
      'X-Requested-With': 'XMLHttpRequest'
    }
  }
}

/**
 * Sanitize console output to prevent sensitive data leaks
 */
export function sanitizeLogData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data
  }
  
  const sanitized = { ...data }
  const sensitiveFields = [
    'password', 'password_hash', 'token', 'api_key', 'secret',
    'email', 'phone', 'ssn', 'id_number', 'credit_card'
  ]
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]'
    }
  }
  
  return sanitized
}

/**
 * Track security events (potential threats)
 */
const securityEvents: any[] = []

export function logSecurityEvent(event: {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  identifier?: string
  details?: any
}) {
  const log = {
    timestamp: new Date().toISOString(),
    ...event
  }
  
  securityEvents.push(log)
  
  // Keep only last 1000 events
  if (securityEvents.length > 1000) {
    securityEvents.shift()
  }
  
  // Log critical events
  if (event.severity === 'critical') {
    console.error('[SECURITY ALERT]', log)
  }
  
  // TODO: Send to security monitoring service
}

/**
 * Get security event log
 */
export function getSecurityEventLog(limit: number = 100) {
  return securityEvents.slice(-limit)
}

/**
 * Detect suspicious activity
 */
export function detectSuspiciousActivity(identifier: string, action: string): {
  suspicious: boolean
  reason?: string
} {
  const recentEvents = securityEvents.filter(e => e.identifier === identifier && 
    Date.now() - new Date(e.timestamp).getTime() < 5 * 60 * 1000)
  
  // Too many failed attempts
  if (recentEvents.filter(e => e.type === 'failed_login').length > 3) {
    return {
      suspicious: true,
      reason: 'Multiple failed login attempts'
    }
  }
  
  // Rapid API calls
  if (recentEvents.filter(e => e.type === 'api_call').length > 50) {
    return {
      suspicious: true,
      reason: 'Excessive API calls detected'
    }
  }
  
  return { suspicious: false }
}
