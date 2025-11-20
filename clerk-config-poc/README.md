# Clerk Config-as-Code POC

This is a proof of concept for Clerk's config-as-code system, enabling infrastructure-as-code workflows for managing Clerk authentication and organization settings.

## Features

- **Single Endpoint Architecture**: One API endpoint to manage all configuration
- **Configuration Hashing**: SHA256-based drift detection
- **Atomic Operations**: All-or-nothing config applies with automatic rollback
- **Cross-Section Validation**: Intelligent validation across configuration sections
- **Rich CLI Experience**: Intuitive commands with beautiful output

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   CLI Tool  │────────▶│  API Server  │────────▶│  Instance   │
│             │  HTTP   │              │         │  Storage    │
│ • validate  │         │ PUT /config  │         │             │
│ • apply     │         │ GET /config  │         │ Config +    │
│ • import    │         │ GET /status  │         │ Hash        │
│ • status    │         │              │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
```

## Installation

```bash
cd clerk-config-poc
npm install
```

## Usage

### 1. Start the Mock API Server

```bash
npm run server
```

This starts a mock Clerk API server on `http://localhost:3001` that simulates the backend.

### 2. Run CLI Commands

#### Validate Configuration

```bash
npm run cli validate examples/clerk.config.jsonc
```

**Output:**
```
🔍 Validating configuration...
✅ Configuration is valid

✅ Validation passed
   Config hash: sha256:def456789abc...

💡 Ready to apply:
   clerk-config apply examples/clerk.config.jsonc
```

#### Apply Configuration

```bash
npm run cli apply examples/clerk.config.jsonc
```

**Output:**
```
📋 Validating configuration...
✅ Configuration is valid

🚀 Applying configuration to instance: ins_default

🔍 Analyzing changes... (4 total)
   + Added: organizations.roles[2]
   + Added: authentication.providers.github
   ~ Modified: authentication.signUp.mode
   ~ Modified: redirects.afterSignInUrl

⚠️  Warnings:
   • authentication.signUp.mode: Restricted mode requires Pro plan or higher
     💡 Ensure your plan supports restricted sign-up mode

ℹ️  Info:
   • organizations.roles: You have 3 custom roles

✅ Configuration applied successfully
   Hash: sha256:def456789abc...
   Applied at: 2024-01-15T10:30:00Z

💡 Next steps:
   • Test your changes in a development environment
   • Review the configuration in the Clerk Dashboard
   • Run "clerk-config status" to verify sync
```

#### Check Status (Drift Detection)

```bash
npm run cli status examples/clerk.config.jsonc
```

**Output (In Sync):**
```
📊 Configuration Status

Instance: ins_default
Last applied: 1/15/2024, 10:30:00 AM
Modified by: cli-user (cli)
Local config: examples/clerk.config.jsonc

✅ Configuration in sync
   Local hash:  sha256:def456789abc...
   Remote hash: sha256:def456789abc...
```

**Output (Drifted):**
```
📊 Configuration Status

Instance: ins_default
Last applied: 1/15/2024, 10:30:00 AM
Modified by: dashboard-user (dashboard)
Local config: examples/clerk.config.jsonc

❌ Configuration has drifted
   Local hash:  sha256:def456789abc...
   Remote hash: sha256:xyz789abc123...

💡 Actions:
   • Run "clerk-config import" to sync from remote
   • Run "clerk-config apply" to push local changes
   • Run "clerk-config diff" to see differences
```

#### Import Configuration

```bash
npm run cli import ./my-config.jsonc
```

**Output:**
```
🔄 Importing configuration from dashboard...
Instance: ins_default

✅ Configuration imported successfully
   Saved to: /path/to/my-config.jsonc
   Config hash: sha256:xyz789abc123...

💡 Next steps:
   • Review the imported configuration
   • Commit the config file to version control
   • Run "clerk-config validate" to check for issues
```

## Configuration Schema

### Basic Structure

```jsonc
{
  "$schema": "https://clerk.com/schemas/config/v1.json",
  "version": "1.0",

  "_metadata": {
    "name": "my-app-config",
    "instanceId": "ins_xxxxx"
  },

  "authentication": { /* ... */ },
  "redirects": { /* ... */ },
  "organizations": { /* ... */ }
}
```

### Example Configurations

See the `examples/` directory for complete examples:

- **clerk.config.jsonc** - Full featured configuration
- **minimal.config.jsonc** - Minimal setup
- **organizations.config.jsonc** - Organizations with custom roles

## Configuration Sections

### Authentication

```jsonc
"authentication": {
  "signIn": {
    "attributes": ["email_address", "phone_number"],
    "strategies": {
      "password": true,
      "emailCode": true,
      "passkey": false
    }
  },
  "signUp": {
    "mode": "public", // or "restricted"
    "attributes": {
      "emailAddress": {
        "enabled": true,
        "required": true,
        "verifyAtSignUp": true
      }
    }
  },
  "providers": {
    "google": { "enabled": true },
    "github": { "enabled": true }
  }
}
```

### Redirects

```jsonc
"redirects": {
  "signInUrl": "/sign-in",
  "signUpUrl": "/sign-up",
  "afterSignInUrl": "/dashboard",
  "afterSignUpUrl": "/onboarding"
}
```

### Organizations

```jsonc
"organizations": {
  "enabled": true,
  "maxAllowedMemberships": 3,
  "roles": [
    {
      "name": "Admin",
      "key": "admin",
      "permissions": ["members:manage", "settings:manage"]
    }
  ],
  "domains": {
    "enabled": true,
    "defaultRole": "member"
  }
}
```

## How It Works

### 1. Configuration Hashing

The system generates a SHA256 hash of your configuration (excluding metadata) for drift detection:

```typescript
function generateConfigHash(config: ClerkConfig): string {
  const { _metadata, ...hashableConfig } = config;
  const canonical = JSON.stringify(hashableConfig, Object.keys(hashableConfig).sort());
  return `sha256:${crypto.createHash('sha256').update(canonical).digest('hex')}`;
}
```

### 2. Drift Detection

Comparing local and remote hashes takes milliseconds:

```typescript
const localHash = generateConfigHash(localConfig);
const remoteHash = await getRemoteConfigHash(instanceId);
const inSync = localHash === remoteHash;
```

### 3. Atomic Application

All configuration changes are applied atomically in a single transaction:

```typescript
PUT /v1/instances/{instanceId}/config
{
  "config": { /* entire config */ },
  "metadata": {
    "configHash": "sha256:...",
    "appliedAt": "2024-01-15T10:30:00Z",
    "source": "cli"
  }
}
```

### 4. Validation

Multi-level validation with errors, warnings, and info:

- **Errors**: Block config application
- **Warnings**: Allow with caution
- **Info**: Informational messages

## Environment Variables

```bash
# Required
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_INSTANCE_ID=ins_xxxxx

# Optional (for POC)
CLERK_API_URL=http://localhost:3001  # Default for POC
```

## API Endpoints (Mock Server)

### GET /v1/instances/:instanceId/config/status
Quick status check for drift detection

### GET /v1/instances/:instanceId/config
Get full configuration

### PUT /v1/instances/:instanceId/config
Apply configuration atomically

## Future Enhancements (Not in POC)

### CLI Commands
- `clerk config diff` - Show detailed differences
- `clerk config plan` - Preview changes without applying
- `clerk config rollback` - Rollback to previous config

### Feature Presets
```bash
clerk apply m2m-tokens
clerk apply organizations --with-domains
clerk apply social-login --provider=google,github
```

### Webhooks
- `instance.configuration.updated` event
- Team notifications (Slack, email)
- GitOps integration
- Audit logging

### Advanced Features
- Configuration versioning and history
- Environment-specific configs
- Config templates and inheritance
- Multi-instance management

## Development

### Project Structure

```
clerk-config-poc/
├── cli/
│   ├── commands/       # CLI command implementations
│   │   ├── apply.ts
│   │   ├── import.ts
│   │   ├── status.ts
│   │   └── validate.ts
│   ├── utils/          # Utilities
│   │   ├── api.ts      # API client
│   │   ├── hash.ts     # Hash generation
│   │   ├── validation.ts
│   │   └── display.ts  # CLI output formatting
│   ├── types.ts        # TypeScript types
│   └── index.ts        # CLI entry point
├── server/
│   └── index.ts        # Mock API server
├── examples/           # Example configurations
└── README.md
```

### Running Tests

```bash
# Start the server in one terminal
npm run server

# In another terminal, run commands
npm run cli validate examples/clerk.config.jsonc
npm run cli apply examples/clerk.config.jsonc
npm run cli status examples/clerk.config.jsonc
npm run cli import ./imported.jsonc
```

## Key Benefits

### For Developers
- ✅ **Version Control**: Config as code in Git
- ✅ **Code Review**: PR-based config changes
- ✅ **Reproducible**: Same config across environments
- ✅ **Fast Feedback**: Instant drift detection

### For DevOps
- ✅ **GitOps Ready**: CI/CD integration
- ✅ **Atomic Operations**: All-or-nothing applies
- ✅ **Audit Trail**: Complete change history
- ✅ **Validation**: Catch errors before applying

### For Teams
- ✅ **Collaboration**: Review config changes together
- ✅ **Documentation**: Config is self-documenting
- ✅ **Safety**: Validation prevents mistakes
- ✅ **Transparency**: Clear change tracking

## Comparison to Other Tools

This approach is inspired by successful IaC tools:

| Feature | Clerk Config | Terraform | Pulumi |
|---------|-------------|-----------|--------|
| Single source of truth | ✅ | ✅ | ✅ |
| Drift detection | ✅ (hash-based) | ✅ (state-based) | ✅ (state-based) |
| Atomic operations | ✅ | ✅ | ✅ |
| Plan/Preview | 🚧 | ✅ | ✅ |
| Rollback | 🚧 | ✅ | ✅ |

## License

MIT (for POC purposes)

## Feedback

This is a proof of concept. For feedback or questions:
- Open an issue in the repository
- Contact the Clerk team

---

**Built with ❤️ for the Clerk Config-as-Code POC**
