import type { ClerkResource } from './resource';
import type { AuthConfigJSONSnapshot } from './snapshots';

export interface AuthConfigResource extends ClerkResource {
  /**
   * Enabled single session configuration at the instance level.
   */
  singleSessionMode: boolean;
  /**
   * Timestamp of when the instance was claimed. This only applies to applications created with the Keyless mode.
   * @default null
   */
  claimedAt: Date | null;
  /**
   * Whether Reverification is enabled at the instance level.
   */
  reverification: boolean;
  __internal_toSnapshot: () => AuthConfigJSONSnapshot;
}
