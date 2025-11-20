import type { ClerkConfig, ValidationResult } from '../types.js';

/**
 * Validate a Clerk configuration object
 * Performs cross-section validation and checks for common issues
 */
export function validateConfig(config: ClerkConfig): ValidationResult[] {
  const results: ValidationResult[] = [];

  // Basic version check
  if (!config.version) {
    results.push({
      path: 'version',
      level: 'error',
      message: 'Config version is required',
      suggestion: 'Add "version": "1.0" to your config'
    });
  }

  // Authentication validation
  if (config.authentication) {
    // Check if OAuth is enabled but email verification is not
    const hasOAuth = config.authentication.providers &&
      Object.values(config.authentication.providers).some(p => p.enabled);

    const emailVerifyAtSignUp = config.authentication.signUp?.attributes?.emailAddress?.verifyAtSignUp;

    if (hasOAuth && !emailVerifyAtSignUp) {
      results.push({
        path: 'authentication.signUp.attributes.emailAddress.verifyAtSignUp',
        level: 'warning',
        message: 'Consider enabling email verification when using OAuth providers',
        suggestion: 'Set verifyAtSignUp: true for better security'
      });
    }

    // Check for restricted mode without proper setup
    if (config.authentication.signUp?.mode === 'restricted') {
      results.push({
        path: 'authentication.signUp.mode',
        level: 'warning',
        message: 'Restricted mode requires Pro plan or higher',
        suggestion: 'Ensure your plan supports restricted sign-up mode'
      });
    }
  }

  // Organizations validation
  if (config.organizations?.enabled) {
    const roleCount = config.organizations.roles?.length || 0;

    if (roleCount > 5) {
      results.push({
        path: 'organizations.roles',
        level: 'warning',
        message: `You have ${roleCount} custom roles (free plan supports max 5)`,
        suggestion: 'Consider upgrading to Pro plan or reducing roles'
      });
    }

    if (roleCount > 10) {
      results.push({
        path: 'organizations.roles',
        level: 'info',
        message: `You have ${roleCount} custom roles (limit: 20)`,
        suggestion: 'You are approaching the role limit'
      });
    }

    // Validate role structure
    config.organizations.roles?.forEach((role, index) => {
      if (!role.key || !role.name) {
        results.push({
          path: `organizations.roles[${index}]`,
          level: 'error',
          message: 'Role must have both "key" and "name" properties',
          suggestion: 'Add required role properties'
        });
      }

      if (role.permissions && role.permissions.length === 0) {
        results.push({
          path: `organizations.roles[${index}].permissions`,
          level: 'warning',
          message: `Role "${role.name}" has no permissions`,
          suggestion: 'Consider adding permissions or removing the role'
        });
      }
    });
  }

  // Redirects validation
  if (config.redirects) {
    const urlFields = ['signInUrl', 'signUpUrl', 'afterSignInUrl', 'afterSignUpUrl', 'homeUrl'] as const;

    urlFields.forEach(field => {
      const url = config.redirects?.[field];
      if (url && !isValidUrl(url)) {
        results.push({
          path: `redirects.${field}`,
          level: 'error',
          message: `Invalid URL format: ${url}`,
          suggestion: 'Use absolute URLs (https://...) or relative paths (/...)'
        });
      }
    });
  }

  return results;
}

/**
 * Validate URL format (accepts absolute URLs and relative paths)
 */
function isValidUrl(url: string): boolean {
  // Allow relative paths
  if (url.startsWith('/')) {
    return true;
  }

  // Validate absolute URLs
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if validation results contain any errors
 */
export function hasErrors(results: ValidationResult[]): boolean {
  return results.some(r => r.level === 'error');
}

/**
 * Check if validation results contain any warnings
 */
export function hasWarnings(results: ValidationResult[]): boolean {
  return results.some(r => r.level === 'warning');
}
