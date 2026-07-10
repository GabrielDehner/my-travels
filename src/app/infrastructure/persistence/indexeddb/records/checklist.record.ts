import type { SyncStatus } from '../../../../domain/enums/sync-status';

/** Dexie row shape for the `checklists` store (design §7). */
export interface ChecklistRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
  lastModified: string;
  travelId: string;
  title: string;
}
