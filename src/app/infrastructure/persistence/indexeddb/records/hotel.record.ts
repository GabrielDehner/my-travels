import type { SyncStatus } from '../../../../domain/enums/sync-status';
import type { GeoLocation } from '../../../../domain/value-objects/geo-location';
import type { Money } from '../../../../domain/value-objects/money';

/** Dexie row shape for the `hotels` store (design §7, §8). */
export interface HotelRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
  lastModified: string;
  destinationId: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  web?: string;
  checkIn: string;
  checkOut: string;
  confirmationCode?: string;
  price?: Money;
  geo?: GeoLocation;
  notes?: string;
  mapsUrl?: string;
}
