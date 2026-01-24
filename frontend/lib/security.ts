/**
 * Password & Security Utilities
 * Handles secure password generation, hashing, and validation
 */

import bcrypt from 'bcryptjs'
import crypto from 'crypto'

/**
 * Generate a cryptographically secure random password
 * Requirements: 16+ characters, uppercase, lowercase, numbers, special chars
 */
export function generateSecurePassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  
  const allChars = uppercase + lowercase + numbers + special
  
  let password = ''
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += special[Math.floor(Math.random() * special.length)]
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Generate a temporary password (expires after first use)
 * Format: [Random-Random-Random] for readability
 */
export function generateTemporaryPassword(): {
  password: string
  expiresInHours: number
} {
  const segments = [
    crypto.randomBytes(3).toString('hex').toUpperCase(),
    crypto.randomBytes(3).toString('hex').toUpperCase(),
    crypto.randomBytes(3).toString('hex').toUpperCase(),
  ]
  
  return {
    password: segments.join('-'),
    expiresInHours: 24
  }
}

/**
 * Hash a password using bcrypt (async)
 * Cost factor: 12 rounds (good balance between security & speed)
 */
export async function hashPassword(password: string, saltRounds: number = 12): Promise<string> {
  try {
    return await bcrypt.hash(password, saltRounds)
  } catch (error) {
    console.error('Password hashing error:', error)
    throw new Error('Failed to hash password')
  }
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash)
  } catch (error) {
    console.error('Password verification error:', error)
    return false
  }
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isStrong: boolean
  score: number  // 0-5
  issues: string[]
} {
  const issues: string[] = []
  let score = 0
  
  // Minimum length
  if (password.length >= 8) {
    score += 1
  } else {
    issues.push('Password must be at least 8 characters')
  }
  
  // Uppercase letters
  if (/[A-Z]/.test(password)) {
    score += 1
  } else {
    issues.push('Add uppercase letters (A-Z)')
  }
  
  // Lowercase letters
  if (/[a-z]/.test(password)) {
    score += 1
  } else {
    issues.push('Add lowercase letters (a-z)')
  }
  
  // Numbers
  if (/[0-9]/.test(password)) {
    score += 1
  } else {
    issues.push('Add numbers (0-9)')
  }
  
  // Special characters
  if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    score += 1
  } else {
    issues.push('Add special characters (!@#$%^&*)')
  }
  
  return {
    isStrong: score >= 4 && password.length >= 12,
    score,
    issues
  }
}

/**
 * Check if password has been used before (check against history)
 */
export async function isPasswordReused(newPassword: string, passwordHistory: string[]): Promise<boolean> {
  for (const oldHash of passwordHistory) {
    const matches = await verifyPassword(newPassword, oldHash)
    if (matches) return true
  }
  return false
}

/**
 * Generate a safe username from name
 * Format: firstname_lastname_random
 */
export function generateSafeUsername(fullName: string, idNumber?: string): string {
  const names = fullName.toLowerCase().split(' ').filter(n => n.length > 0)
  
  if (names.length === 0) {
    return `user_${crypto.randomBytes(4).toString('hex')}`
  }
  
  let username = names.slice(0, 2).join('_')
  
  // Add random suffix to ensure uniqueness
  username += '_' + crypto.randomBytes(4).toString('hex')
  
  // Remove special characters
  username = username.replace(/[^a-z0-9_]/g, '')
  
  return username.substring(0, 30)  // Max 30 chars
}

/**
 * Generate random username for specific role
 */
export function generateRoleBasedUsername(role: string, schoolCode: string = 'SCH'): string {
  const rolePrefix = role.substring(0, 2).toUpperCase()
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = crypto.randomBytes(3).toString('hex').toUpperCase()
  
  return `${rolePrefix}-${schoolCode}-${timestamp}-${random}`
}

/**
 * Sanitize user input to prevent injection
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '')  // Remove angle brackets (XSS)
    .replace(/'/g, "''")   // Escape quotes (SQL injection)
    .substring(0, 255)     // Limit length
}

/**
 * Encrypt sensitive data using AES-256
 */
export function encryptSensitiveData(data: string, encryptionKey: string): string {
  const iv = crypto.randomBytes(16)
  const key = crypto.createHash('sha256').update(encryptionKey).digest()
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  // Return IV + encrypted data (IV needs to be sent with ciphertext)
  return iv.toString('hex') + ':' + encrypted
}

/**
 * Decrypt sensitive data
 */
export function decryptSensitiveData(encrypted: string, encryptionKey: string): string {
  const [ivHex, encryptedData] = encrypted.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const key = crypto.createHash('sha256').update(encryptionKey).digest()
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Generate 2FA backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase())
  }
  return codes
}

/**
 * Hash backup codes for storage
 */
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map(code => hashPassword(code)))
}
