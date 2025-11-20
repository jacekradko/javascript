import type {
  ClerkConfig,
  ConfigResponse,
  ConfigStatusResponse,
  ApplyConfigRequest
} from '../types.js';

const API_BASE_URL = process.env.CLERK_API_URL || 'http://localhost:3001';
const API_KEY = process.env.CLERK_SECRET_KEY || 'test_secret_key';

/**
 * API client for Clerk config endpoints
 */

export async function applyConfig(
  instanceId: string,
  config: ClerkConfig,
  metadata: ApplyConfigRequest['metadata']
): Promise<ConfigResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/instances/${instanceId}/config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({ config, metadata })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' })) as { message?: string };
    throw new Error(`API Error: ${error.message || response.statusText}`);
  }

  return response.json() as Promise<ConfigResponse>;
}

export async function getConfigStatus(instanceId: string): Promise<ConfigStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/instances/${instanceId}/config/status`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json() as Promise<ConfigStatusResponse>;
}

export async function getConfig(instanceId: string): Promise<ClerkConfig> {
  const response = await fetch(`${API_BASE_URL}/v1/instances/${instanceId}/config`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json() as Promise<ClerkConfig>;
}
