import { readFile } from 'fs/promises';
import { resolve } from 'path';
import type { ClerkConfig } from '../types.js';
import { validateConfig, hasErrors, hasWarnings } from '../utils/validation.js';
import { generateConfigHash } from '../utils/hash.js';
import { parseJSONC } from '../utils/jsonc.js';
import {
  displayHeader,
  displayValidationResults,
  displaySuccess,
  displayError,
  colorize
} from '../utils/display.js';

export async function validateCommand(configPath: string): Promise<void> {
  try {
    displayHeader('🔍 Validating configuration...');

    // Read config file
    const fullPath = resolve(process.cwd(), configPath);
    const configContent = await readFile(fullPath, 'utf-8');

    // Parse config
    let config: ClerkConfig;
    try {
      config = parseJSONC(configContent);
    } catch (error) {
      displayError(
        'Invalid JSON format',
        error instanceof Error ? error.message : 'Failed to parse config file'
      );
      process.exit(1);
    }

    // Validate config
    const validationResults = validateConfig(config);
    displayValidationResults(validationResults);

    // Generate hash
    const configHash = generateConfigHash(config);

    if (hasErrors(validationResults)) {
      displayError('Validation failed with errors');
      process.exit(1);
    } else if (hasWarnings(validationResults)) {
      displaySuccess('Validation passed with warnings', {
        'Config hash': configHash
      });
      console.log(colorize('\n💡 Consider addressing warnings before applying', 'blue'));
    } else {
      displaySuccess('Validation passed', {
        'Config hash': configHash
      });
      console.log(colorize('\n💡 Ready to apply:', 'blue'));
      console.log(colorize(`   clerk-config apply ${configPath}`, 'gray'));
    }

  } catch (error) {
    displayError(
      'Failed to validate configuration',
      error instanceof Error ? error.message : 'Unknown error'
    );
    process.exit(1);
  }
}
