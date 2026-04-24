import crypto from 'crypto';

/**
 * Hash a share link password using SHA-256.
 * Simple (non-bcrypt) approach — adequate for client-facing low-sensitivity
 * read-only dashboards. Do NOT reuse for user passwords.
 */
export function hashSharePassword(pwd: string): string {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

/**
 * Generate a URL-safe random slug (default 12 chars).
 */
export function generateSlug(bytes = 9): string {
  return crypto.randomBytes(bytes).toString('base64url');
}
