import type { DocumentCategory } from '../enums/document-category';
import type { EntityRef } from '../value-objects/entity-ref';

import type { BaseEntity } from './base-entity';

/**
 * Metadata for an uploaded document; the binary payload (Blob) is stored
 * separately, addressed by `blobId` (design §2, §9). Named `TravelDocument`
 * in domain code to avoid clashing with the DOM `Document` global.
 */
export interface TravelDocument extends BaseEntity {
  travelId: string;
  entityRef?: EntityRef;
  title: string;
  category: DocumentCategory;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  blobId: string;
}
