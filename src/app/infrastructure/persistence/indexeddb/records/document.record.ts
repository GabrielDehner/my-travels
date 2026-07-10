import type { DocumentCategory } from '../../../../domain/enums/document-category';
import type { SyncStatus } from '../../../../domain/enums/sync-status';
import type { EntityRef } from '../../../../domain/value-objects/entity-ref';

/** Dexie row shape for the `documents` store (design §7, §9). */
export interface DocumentRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
  lastModified: string;
  travelId: string;
  entityRef?: EntityRef;
  title: string;
  category: DocumentCategory;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  blobId: string;
}
