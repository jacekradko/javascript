import type { ValidationResult, ChangesSummary } from '../types.js';

/**
 * Display utilities for CLI output
 */

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

export function colorize(text: string, color: keyof typeof COLORS): string {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

export function displayValidationResults(results: ValidationResult[]): void {
  if (results.length === 0) {
    console.log(colorize('✅ Configuration is valid', 'green'));
    return;
  }

  const errors = results.filter(r => r.level === 'error');
  const warnings = results.filter(r => r.level === 'warning');
  const info = results.filter(r => r.level === 'info');

  if (errors.length > 0) {
    console.log(colorize('\n❌ Errors:', 'red'));
    errors.forEach(e => {
      console.log(`   ${colorize(`• ${e.path}:`, 'red')} ${e.message}`);
      if (e.suggestion) {
        console.log(colorize(`     💡 ${e.suggestion}`, 'gray'));
      }
    });
  }

  if (warnings.length > 0) {
    console.log(colorize('\n⚠️  Warnings:', 'yellow'));
    warnings.forEach(w => {
      console.log(`   ${colorize(`• ${w.path}:`, 'yellow')} ${w.message}`);
      if (w.suggestion) {
        console.log(colorize(`     💡 ${w.suggestion}`, 'gray'));
      }
    });
  }

  if (info.length > 0) {
    console.log(colorize('\nℹ️  Info:', 'blue'));
    info.forEach(i => {
      console.log(`   ${colorize(`• ${i.path}:`, 'blue')} ${i.message}`);
    });
  }
}

export function displayChangesSummary(changes: ChangesSummary): void {
  if (changes.total === 0) {
    console.log(colorize('   No changes detected', 'gray'));
    return;
  }

  console.log(colorize(`\n🔍 Analyzing changes... (${changes.total} total)`, 'blue'));

  if (changes.added.length > 0) {
    changes.added.forEach(path => {
      console.log(colorize(`   + Added: ${path}`, 'green'));
    });
  }

  if (changes.modified.length > 0) {
    changes.modified.forEach(path => {
      console.log(colorize(`   ~ Modified: ${path}`, 'yellow'));
    });
  }

  if (changes.removed.length > 0) {
    changes.removed.forEach(path => {
      console.log(colorize(`   - Removed: ${path}`, 'red'));
    });
  }
}

export function displaySuccess(message: string, details?: Record<string, string>): void {
  console.log(colorize(`\n✅ ${message}`, 'green'));
  if (details) {
    Object.entries(details).forEach(([key, value]) => {
      console.log(colorize(`   ${key}: ${value}`, 'gray'));
    });
  }
}

export function displayError(message: string, details?: string): void {
  console.log(colorize(`\n❌ ${message}`, 'red'));
  if (details) {
    console.log(colorize(`   ${details}`, 'gray'));
  }
}

export function displayInfo(message: string): void {
  console.log(colorize(`\nℹ️  ${message}`, 'blue'));
}

export function displayHeader(message: string): void {
  console.log(colorize(`\n${message}`, 'bold'));
}
