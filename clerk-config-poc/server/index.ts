import express from 'express';
import type { Request, Response } from 'express';
import type {
  ClerkConfig,
  ConfigResponse,
  ConfigStatusResponse,
  ApplyConfigRequest,
  ChangesSummary,
  ValidationResult
} from '../cli/types.js';
import { generateConfigHash } from '../cli/utils/hash.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// In-memory storage for POC (in production, this would be a database)
interface StoredConfig {
  instanceId: string;
  config: ClerkConfig;
  configHash: string;
  lastModified: string;
  lastModifiedBy: string;
  lastModifiedSource: 'cli' | 'dashboard' | 'api';
  history: Array<{
    configHash: string;
    appliedAt: string;
    appliedBy: string;
    source: string;
  }>;
}

const configStore = new Map<string, StoredConfig>();

// Initialize with default config
const defaultConfig: ClerkConfig = {
  version: '1.0',
  _metadata: {
    name: 'default-config',
    instanceId: 'ins_default'
  },
  authentication: {
    signIn: {
      attributes: ['email_address'],
      strategies: {
        password: true,
        emailCode: true
      }
    },
    signUp: {
      mode: 'public',
      attributes: {
        emailAddress: {
          enabled: true,
          required: true,
          verifyAtSignUp: false
        }
      }
    }
  },
  redirects: {
    signInUrl: '/sign-in',
    signUpUrl: '/sign-up',
    afterSignInUrl: '/dashboard',
    afterSignUpUrl: '/onboarding'
  },
  organizations: {
    enabled: false
  }
};

const defaultHash = generateConfigHash(defaultConfig);
configStore.set('ins_default', {
  instanceId: 'ins_default',
  config: defaultConfig,
  configHash: defaultHash,
  lastModified: new Date().toISOString(),
  lastModifiedBy: 'system',
  lastModifiedSource: 'api',
  history: []
});

// Middleware for API key validation
function validateApiKey(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  // In POC, we accept any API key. In production, validate against database
  next();
}

app.use(validateApiKey);

/**
 * GET /v1/instances/:instanceId/config/status
 * Quick status check endpoint for drift detection
 */
app.get('/v1/instances/:instanceId/config/status', (req: Request, res: Response) => {
  const { instanceId } = req.params;

  const stored = configStore.get(instanceId);
  if (!stored) {
    return res.status(404).json({ error: 'Instance not found' });
  }

  const response: ConfigStatusResponse = {
    configHash: stored.configHash,
    lastModified: stored.lastModified,
    lastModifiedBy: stored.lastModifiedBy,
    lastModifiedSource: stored.lastModifiedSource,
    hasChanges: false, // This would be computed based on pending changes
    config: stored.config
  };

  res.json(response);
});

/**
 * GET /v1/instances/:instanceId/config
 * Get full configuration
 */
app.get('/v1/instances/:instanceId/config', (req: Request, res: Response) => {
  const { instanceId } = req.params;

  const stored = configStore.get(instanceId);
  if (!stored) {
    return res.status(404).json({ error: 'Instance not found' });
  }

  res.json(stored.config);
});

/**
 * PUT /v1/instances/:instanceId/config
 * Apply configuration (atomic operation)
 */
app.put('/v1/instances/:instanceId/config', (req: Request, res: Response) => {
  const { instanceId } = req.params;
  const { config, metadata }: ApplyConfigRequest = req.body;

  if (!config || !metadata) {
    return res.status(400).json({ error: 'Missing config or metadata' });
  }

  // Get current config for change detection
  const stored = configStore.get(instanceId);
  const previousConfig = stored?.config;

  // Calculate changes
  const changesSummary: ChangesSummary = calculateChanges(previousConfig, config);

  // Perform validation (in production, this would be more sophisticated)
  const validationResults: ValidationResult[] = [];

  // Example validation: check for restricted mode
  if (config.authentication?.signUp?.mode === 'restricted') {
    validationResults.push({
      path: 'authentication.signUp.mode',
      level: 'warning',
      message: 'Restricted mode requires Pro plan or higher'
    });
  }

  // Check organization role limits
  const roleCount = config.organizations?.roles?.length || 0;
  if (roleCount > 5) {
    validationResults.push({
      path: 'organizations.roles',
      level: 'info',
      message: `You have ${roleCount} custom roles`
    });
  }

  // Store config
  const newStored: StoredConfig = {
    instanceId,
    config,
    configHash: metadata.configHash,
    lastModified: metadata.appliedAt,
    lastModifiedBy: metadata.appliedBy,
    lastModifiedSource: metadata.source,
    history: [
      ...(stored?.history || []),
      {
        configHash: metadata.configHash,
        appliedAt: metadata.appliedAt,
        appliedBy: metadata.appliedBy,
        source: metadata.source
      }
    ]
  };

  configStore.set(instanceId, newStored);

  // Return response
  const response: ConfigResponse = {
    success: true,
    config,
    metadata: {
      configHash: metadata.configHash,
      appliedAt: metadata.appliedAt,
      validationResults,
      changesSummary
    }
  };

  console.log(`[API] Config applied to ${instanceId}: ${changesSummary.total} changes`);
  res.json(response);
});

/**
 * Helper function to calculate changes between configs
 */
function calculateChanges(
  oldConfig: ClerkConfig | undefined,
  newConfig: ClerkConfig
): ChangesSummary {
  const added: string[] = [];
  const modified: string[] = [];
  const removed: string[] = [];

  if (!oldConfig) {
    return { added: ['*'], modified: [], removed: [], total: 1 };
  }

  // Simple path-based comparison (in production, use deep diff)
  const oldPaths = getConfigPaths(oldConfig);
  const newPaths = getConfigPaths(newConfig);

  // Find added and modified
  for (const [path, value] of newPaths.entries()) {
    if (!oldPaths.has(path)) {
      added.push(path);
    } else if (JSON.stringify(oldPaths.get(path)) !== JSON.stringify(value)) {
      modified.push(path);
    }
  }

  // Find removed
  for (const path of oldPaths.keys()) {
    if (!newPaths.has(path)) {
      removed.push(path);
    }
  }

  return {
    added,
    modified,
    removed,
    total: added.length + modified.length + removed.length
  };
}

/**
 * Helper to get all paths in config object
 */
function getConfigPaths(
  obj: any,
  prefix: string = '',
  paths: Map<string, any> = new Map()
): Map<string, any> {
  for (const key in obj) {
    if (key === '_metadata') continue; // Skip metadata

    const path = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      getConfigPaths(value, path, paths);
    } else {
      paths.set(path, value);
    }
  }
  return paths;
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock Clerk API server running on http://localhost:${PORT}`);
  console.log(`📋 Initialized with instance: ins_default`);
  console.log(`🔍 Endpoints:`);
  console.log(`   GET  /v1/instances/:id/config/status`);
  console.log(`   GET  /v1/instances/:id/config`);
  console.log(`   PUT  /v1/instances/:id/config`);
});

export default app;
