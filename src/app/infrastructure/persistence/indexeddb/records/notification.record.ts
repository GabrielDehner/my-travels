import type { SyncStatus } from '../../../../domain/enums/sync-status';
import type { EntityRef } from '../../../../domain/value-objects/entity-ref';

/** Dexie row shape for the `notifications` store (design §7). */
export interface NotificationRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
  lastModified: string;
  travelId: string;
  entityRef?: EntityRef;
  triggerAt: string;
  offsetLabel: string;
  fired: boolean;
  message: string;
}
