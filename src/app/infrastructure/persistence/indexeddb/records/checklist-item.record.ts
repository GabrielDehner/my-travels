import type { SyncStatus } from '../../../../domain/enums/sync-status';

/** Dexie row shape for the `checklistItems` store (design §7). */
export interface ChecklistItemRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
  lastModified: string;
  checklistId: string;
  label: string;
  done: boolean;
  order: number;
}
