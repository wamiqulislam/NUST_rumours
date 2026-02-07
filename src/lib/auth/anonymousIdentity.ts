/**
 * Anonymous Identity System
 * 
 * Provides persistent anonymous identities without storing raw identifiers.
 * 
 * Features:
 * - Device fingerprint hashing
 * - Per-rumor vote tokens (unlinkable across rumors)
 * - One-way hashing (irreversible)
 */

import CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';

// Server-side salt (should be in environment variable)
const SERVER_SALT = process.env.IDENTITY_SALT || 'campus-rumor-salt-2024';

/**
 * Generate a persistent anonymous user token from device fingerprint
 * 
 * The fingerprint should be collected client-side and contain:
 * - Screen resolution
 * - Timezone
 * - Language
 * - Platform info
 * - Canvas fingerprint
 * - etc.
 */
export function generateUserToken(fingerprint: string): string {
  // Hash the fingerprint with server salt
  const hash = CryptoJS.SHA256(fingerprint + SERVER_SALT);
  return hash.toString(CryptoJS.enc.Hex);
}

/**
 * Returns the raw ID for use as a user token.
 * Used when we want to use the Clerk User ID directly without hashing.
 */
export function generateUserTokenFromId(externalId: string): string {
  return externalId;
}

/**
 * Generate a per-rumor vote token
 * 
 * This token is used to prevent double-voting while maintaining
 * vote unlinkability across different rumors.
 * 
 * Formula: H = hash(rumor_id || user_token || per_rumor_salt)
 */
export function generateVoteToken(rumorId: string, userToken: string): string {
  const perRumorSalt = CryptoJS.SHA256(rumorId + SERVER_SALT).toString();
  const voteToken = CryptoJS.SHA256(rumorId + userToken + perRumorSalt);
  return voteToken.toString(CryptoJS.enc.Hex);
}

/**
 * Verify that a vote token matches the expected value
 */
export function verifyVoteToken(
  rumorId: string,
  userToken: string,
  providedVoteToken: string
): boolean {
  const expectedToken = generateVoteToken(rumorId, userToken);
  return expectedToken === providedVoteToken;
}

/**
 * Generate a session token (temporary, for UI state)
 */
export function generateSessionToken(): string {
  return uuidv4();
}

/**
 * Hash an email for anonymization (if email verification is used)
 */
export function hashEmail(email: string): string {
  const normalizedEmail = email.toLowerCase().trim();
  const hash = CryptoJS.SHA256(normalizedEmail + SERVER_SALT);
  return hash.toString(CryptoJS.enc.Hex);
}

/**
 * Check if email domain is from an educational institution
 */
export function isEduEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1];
  if (!domain) return false;

  // Check for common education domains
  const eduPatterns = [
    '.edu',
    '.edu.',
    '.ac.',
    'university',
    'college',
    'school',
  ];

  return eduPatterns.some(pattern => domain.includes(pattern));
}

/**
 * Generate anonymous comment ID (for comment tracking)
 */
export function generateCommentId(): string {
  return uuidv4();
}

/**
 * Generate rumor ID
 */
export function generateRumorId(): string {
  return uuidv4();
}

/**
 * Client-side fingerprint collection hints
 * 
 * This is a guide for what to collect on the client side.
 * The actual collection should happen in client-side JavaScript.
 */
export const FINGERPRINT_COMPONENTS = [
  'userAgent',
  'language',
  'colorDepth',
  'screenResolution',
  'timezoneOffset',
  'sessionStorage',
  'localStorage',
  'indexedDB',
  'platform',
  'plugins',
  'canvas',
  'webgl',
  'fonts',
  'audio',
] as const;

/**
 * Create a fingerprint hash from component values
 */
export function createFingerprintHash(components: Record<string, string>): string {
  // Sort keys for consistent ordering
  const sortedKeys = Object.keys(components).sort();
  const values = sortedKeys.map(key => `${key}:${components[key]}`).join('|');

  const hash = CryptoJS.SHA256(values);
  return hash.toString(CryptoJS.enc.Hex);
}
