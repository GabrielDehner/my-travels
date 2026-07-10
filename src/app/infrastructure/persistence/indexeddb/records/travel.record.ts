import type { SyncStatus } from '../../../../domain/enums/sync-status';
import type { TravelStatus } from '../../../../domain/enums/travel-status';
import type { DateRange } from '../../../../domain/value-objects/date-range';

/**
 * Dexie row shape for the `travels` store (design §7). Domain/application
 * never import this type directly — only `TravelMapper` does. Value
 * objects (e.g. `DateRange`) are stored as nested structured data; Dexie
 * persists plain JSON-serializable objects natively, so no flattening is
 * required for the MVP.
 */
export interface TravelRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
  lastModified: string;
  title: string;
  description?: string;
  coverImageId?: string;
  color?: string;
  dates: DateRange;
  status: TravelStatus;
  notes?: string;
}
