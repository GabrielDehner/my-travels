/**
 * Sync lifecycle of a persisted entity.
 *
 * MVP (no backend yet) writes ONLY 'local'. The other values are reserved
 * so a future backend sync (v2, Last-Write-Wins on `lastModified`) requires
 * zero schema migration — see design §11.
 */
export type SyncStatus = 'local' | 'synced' | 'pending' | 'conflict';
