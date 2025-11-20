import { readFile } from 'fs/promises';
import { resolve } from 'path';
import type { ClerkConfig } from '../types.js';
import { generateConfigHash } from '../utils/hash.js';
import { validateConfig, hasErrors } from '../utils/validation.js';
import { applyConfig } from '../utils/api.js';
import { parseJSONC } from '../utils/jsonc.js';
import {
  displayHeader,
  displayValidationResults,
  displayChangesSummary,
  displaySuccess,
  displayError,
  colorize
} from '../utils/display.js';

export async function applyCommand(configPath: string, options: { env?: string }): Promise<void> {
  try {
    displayHeader('📋 Validating configuration...');

    // Read config file
    const fullPath = resolve(process.cwd(), configPath);
    const configContent = await readFile(fullPath, 'utf-8');

    // Parse config (supports JSONC - comments will be stripped)
    const config: ClerkConfig = parseJSONC(configContent);

    // Validate config
    const validationResults = validateConfig(config);
    displayValidationResults(validationResults);

    if (hasErrors(validationResults)) {
      displayError('Configuration validation failed. Please fix errors before applying.');
      process.exit(1);
    }

    // Generate hash
    const configHash = generateConfigHash(config);

    // Get instance ID from config or environment
    const instanceId = config._metadata?.instanceId ||
                      process.env.CLERK_INSTANCE_ID ||
                      'ins_default';

    console.log(colorize(`\n🚀 Applying configuration to instance: ${instanceId}`, 'blue'));

    // Apply config via API
    const response = await applyConfig(instanceId, config, {
      configHash,
      appliedAt: new Date().toISOString(),
      appliedBy: process.env.USER || 'cli-user',
      source: 'cli',
      version: config.version
    });

    // Display changes
    if (response.metadata.changesSummary) {
      displayChangesSummary(response.metadata.changesSummary);
    }

    // Display warnings from API
    if (response.metadata.validationResults.length > 0) {
      displayValidationResults(response.metadata.validationResults);
    }

    // Success message
    displaySuccess('Configuration applied successfully', {
      'Hash': response.metadata.configHash,
      'Applied at': response.metadata.appliedAt
    });

    // Next steps
    if (response.metadata.changesSummary.total > 0) {
      console.log(colorize('\n💡 Next steps:', 'blue'));
      console.log('   • Test your changes in a development environment');
      console.log('   • Review the configuration in the Clerk Dashboard');
      console.log('   • Run "clerk-config status" to verify sync');
    }

  } catch (error) {
    displayError(
      'Failed to apply configuration',
      error instanceof Error ? error.message : 'Unknown error'
    );
    process.exit(1);
  }
}
