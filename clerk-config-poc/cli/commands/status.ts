import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { existsSync } from 'fs';
import type { ClerkConfig } from '../types.js';
import { generateConfigHash, compareHashes } from '../utils/hash.js';
import { getConfigStatus } from '../utils/api.js';
import { parseJSONC } from '../utils/jsonc.js';
import {
  displayHeader,
  displayError,
  colorize
} from '../utils/display.js';

export async function statusCommand(configPath?: string): Promise<void> {
  try {
    displayHeader('📊 Configuration Status');

    // Get instance ID from environment
    const instanceId = process.env.CLERK_INSTANCE_ID || 'ins_default';

    console.log(colorize(`\nInstance: ${instanceId}`, 'gray'));

    // Get remote config status
    const remoteStatus = await getConfigStatus(instanceId);

    console.log(colorize(`Last applied: ${new Date(remoteStatus.lastModified).toLocaleString()}`, 'gray'));
    console.log(colorize(`Modified by: ${remoteStatus.lastModifiedBy} (${remoteStatus.lastModifiedSource})`, 'gray'));

    // If local config provided, compare hashes
    if (configPath) {
      const fullPath = resolve(process.cwd(), configPath);

      if (!existsSync(fullPath)) {
        displayError(`Config file not found: ${fullPath}`);
        process.exit(1);
      }

      console.log(colorize(`Local config: ${configPath}\n`, 'gray'));

      const configContent = await readFile(fullPath, 'utf-8');
      const localConfig: ClerkConfig = parseJSONC(configContent);

      const localHash = generateConfigHash(localConfig);
      const remoteHash = remoteStatus.configHash;

      const inSync = compareHashes(localHash, remoteHash);

      if (inSync) {
        console.log(colorize('✅ Configuration in sync', 'green'));
        console.log(colorize(`   Local hash:  ${localHash}`, 'gray'));
        console.log(colorize(`   Remote hash: ${remoteHash}`, 'gray'));
      } else {
        console.log(colorize('❌ Configuration has drifted', 'red'));
        console.log(colorize(`   Local hash:  ${localHash}`, 'gray'));
        console.log(colorize(`   Remote hash: ${remoteHash}`, 'gray'));

        console.log(colorize('\n💡 Actions:', 'blue'));
        console.log('   • Run "clerk-config import" to sync from remote');
        console.log('   • Run "clerk-config apply" to push local changes');
        console.log('   • Run "clerk-config diff" to see differences');
      }
    } else {
      console.log(colorize(`\n📝 Remote config hash: ${remoteStatus.configHash}`, 'gray'));
      console.log(colorize('\n💡 Tip: Specify a config file to check sync status:', 'blue'));
      console.log(colorize('   clerk-config status ./clerk.config.jsonc', 'gray'));
    }

  } catch (error) {
    displayError(
      'Failed to get configuration status',
      error instanceof Error ? error.message : 'Unknown error'
    );
    process.exit(1);
  }
}
