import { writeFile } from 'fs/promises';
import { resolve } from 'path';
import type { ClerkConfig } from '../types.js';
import { generateConfigHash } from '../utils/hash.js';
import { getConfig } from '../utils/api.js';
import {
  displayHeader,
  displaySuccess,
  displayError,
  colorize
} from '../utils/display.js';

export async function importCommand(
  outputPath: string = './clerk.config.jsonc',
  options: { env?: string }
): Promise<void> {
  try {
    displayHeader('🔄 Importing configuration from dashboard...');

    // Get instance ID from environment
    const instanceId = process.env.CLERK_INSTANCE_ID || 'ins_default';

    console.log(colorize(`Instance: ${instanceId}`, 'gray'));

    // Fetch remote config
    const remoteConfig = await getConfig(instanceId);

    // Add metadata
    const configHash = generateConfigHash(remoteConfig);
    const configWithMetadata: ClerkConfig = {
      $schema: remoteConfig.$schema || 'https://clerk.com/schemas/config/v1.json',
      ...remoteConfig,
      _metadata: {
        ...remoteConfig._metadata,
        configHash,
        instanceId,
        lastApplied: new Date().toISOString()
      }
    };

    // Format as JSONC
    const configContent = JSON.stringify(configWithMetadata, null, 2) + '\n';

    // Write to file
    const fullPath = resolve(process.cwd(), outputPath);
    await writeFile(fullPath, configContent, 'utf-8');

    displaySuccess('Configuration imported successfully', {
      'Saved to': fullPath,
      'Config hash': configHash
    });

    console.log(colorize('\n💡 Next steps:', 'blue'));
    console.log('   • Review the imported configuration');
    console.log('   • Commit the config file to version control');
    console.log('   • Run "clerk-config validate" to check for issues');

  } catch (error) {
    displayError(
      'Failed to import configuration',
      error instanceof Error ? error.message : 'Unknown error'
    );
    process.exit(1);
  }
}
