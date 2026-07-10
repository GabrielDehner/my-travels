import type { SyncStatus } from '../../../../domain/enums/sync-status';
import type { GeoLocation } from '../../../../domain/value-objects/geo-location';

/** Dexie row shape for the `destinations` store (design §7). */
export interface DestinationRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
  lastModified: string;
  travelId: string;
  country?: string;
  countryCode?: string;
  city?: string;
  name: string;
  geo?: GeoLocation;
  arrival: string;
  departure: string;
  order: number;
  notes?: string;
}
