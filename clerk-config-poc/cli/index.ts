#!/usr/bin/env node

import { Command } from 'commander';
import { applyCommand } from './commands/apply.js';
import { statusCommand } from './commands/status.js';
import { importCommand } from './commands/import.js';
import { validateCommand } from './commands/validate.js';

const program = new Command();

program
  .name('clerk-config')
  .description('Clerk Configuration as Code - POC')
  .version('0.1.0');

program
  .command('apply')
  .description('Apply configuration from file to Clerk instance')
  .argument('<config-file>', 'Path to config file (e.g., ./clerk.config.jsonc)')
  .option('--env <environment>', 'Environment to apply to (production, staging, etc.)')
  .action(applyCommand);

program
  .command('import')
  .description('Import current configuration from Clerk dashboard to file')
  .argument('[output-file]', 'Output file path', './clerk.config.jsonc')
  .option('--env <environment>', 'Environment to import from')
  .action(importCommand);

program
  .command('status')
  .description('Check configuration sync status and detect drift')
  .argument('[config-file]', 'Path to local config file (optional)')
  .action(statusCommand);

program
  .command('validate')
  .description('Validate configuration file without applying')
  .argument('<config-file>', 'Path to config file to validate')
  .action(validateCommand);

// Future commands placeholder
program
  .command('diff')
  .description('Show differences between local and remote config (coming soon)')
  .argument('[config-file]', 'Path to config file')
  .action(() => {
    console.log('🚧 This command is not yet implemented in the POC');
    console.log('It would show a detailed diff between local and remote config');
  });

program
  .command('plan')
  .description('Show what changes would be applied (coming soon)')
  .argument('<config-file>', 'Path to config file')
  .action(() => {
    console.log('🚧 This command is not yet implemented in the POC');
    console.log('It would show a preview of changes without applying them');
  });

program.parse();
