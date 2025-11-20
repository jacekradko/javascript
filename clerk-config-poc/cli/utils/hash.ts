import { createHash } from 'crypto';
import type { ClerkConfig } from '../types.js';

/**
 * Generate a consistent SHA256 hash of a configuration object
 * Removes metadata before hashing to avoid circular dependencies
 */
export function generateConfigHash(config: ClerkConfig): string {
  // Remove metadata before hashing
  const { _metadata, ...hashableConfig } = config;

  // Canonical JSON stringify with sorted keys for consistent hashing
  const canonical = JSON.stringify(hashableConfig, Object.keys(hashableConfig).sort());

  const hash = createHash('sha256').update(canonical).digest('hex');
  return `sha256:${hash}`;
}

/**
 * Compare two config hashes
 */
export function compareHashes(hash1: string, hash2: string): boolean {
  return hash1 === hash2;
}

/**
 * Validate hash format
 */
export function isValidHash(hash: string): boolean {
  return /^sha256:[a-f0-9]{64}$/i.test(hash);
}
