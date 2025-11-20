/**
 * Clerk Configuration Schema Types
 */

export interface ClerkConfig {
  $schema?: string;
  version: string;
  _metadata?: ConfigMetadata;
  authentication?: AuthenticationConfig;
  redirects?: RedirectsConfig;
  organizations?: OrganizationsConfig;
}

export interface ConfigMetadata {
  name?: string;
  lastApplied?: string;
  configHash?: string;
  instanceId?: string;
}

export interface AuthenticationConfig {
  signIn?: {
    attributes?: string[];
    strategies?: {
      password?: boolean;
      emailCode?: boolean;
      phoneCode?: boolean;
      passkey?: boolean;
    };
  };
  signUp?: {
    mode?: 'public' | 'restricted';
    attributes?: {
      emailAddress?: {
        enabled: boolean;
        required: boolean;
        verifyAtSignUp?: boolean;
      };
      phoneNumber?: {
        enabled: boolean;
        required: boolean;
      };
    };
  };
  providers?: {
    [provider: string]: {
      enabled: boolean;
      clientId?: string;
    };
  };
  machineToMachine?: {
    enabled: boolean;
    applications?: Array<{
      name: string;
      permissions: string[];
    }>;
  };
}

export interface RedirectsConfig {
  signInUrl?: string;
  signUpUrl?: string;
  afterSignInUrl?: string;
  afterSignUpUrl?: string;
  homeUrl?: string;
}

export interface OrganizationsConfig {
  enabled: boolean;
  maxAllowedMemberships?: number;
  roles?: Array<{
    name: string;
    key: string;
    permissions: string[];
  }>;
  domains?: {
    enabled: boolean;
    defaultRole?: string;
  };
}

/**
 * API Types
 */

export interface ConfigResponse {
  success: boolean;
  config: ClerkConfig;
  metadata: {
    configHash: string;
    appliedAt: string;
    validationResults: ValidationResult[];
    changesSummary: ChangesSummary;
  };
  errors?: ConfigError[];
}

export interface ChangesSummary {
  added: string[];
  modified: string[];
  removed: string[];
  total: number;
}

export interface ValidationResult {
  path: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

export interface ConfigError {
  code: string;
  message: string;
  path?: string;
}

export interface ConfigStatusResponse {
  configHash: string;
  lastModified: string;
  lastModifiedBy: string;
  lastModifiedSource: 'cli' | 'dashboard' | 'api';
  hasChanges: boolean;
  config: ClerkConfig;
}

export interface ApplyConfigRequest {
  config: ClerkConfig;
  metadata: {
    configHash: string;
    appliedAt: string;
    appliedBy: string;
    source: 'cli' | 'dashboard' | 'api';
    version: string;
  };
}
