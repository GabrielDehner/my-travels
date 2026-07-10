import type { SyncStatus } from '../enums/sync-status';

/**
 * Fields shared by every persisted domain entity (design §2).
 *
 * `id` is a client-generated UUID v4 string. Domain stays framework-agnostic
 * (no `crypto.randomUUID()` call lives here): id GENERATION is an
 * infrastructure/application-boundary concern (e.g. an injected id
 * generator or `crypto.randomUUID()` used at the point an entity is
 * constructed), so domain types only describe the SHAPE of an id, never
 * how one is produced. This keeps domain pure TypeScript with zero runtime
 * dependency on the platform `crypto` global.
 */
export interface BaseEntity {
  /** Client-generated UUID v4. */
  id: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** ISO 8601 timestamp. */
  updatedAt: string;
  /** ISO 8601 timestamp; null while the entity is alive (not soft-deleted). */
  deletedAt: string | null;
  /** MVP always writes 'local' — see SyncStatus. */
  syncStatus: SyncStatus;
  /** ISO 8601 timestamp; basis for v2 Last-Write-Wins conflict resolution. */
  lastModified: string;
}
