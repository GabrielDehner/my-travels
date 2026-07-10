import type { SyncStatus } from '../../../../domain/enums/sync-status';
import type { TransportType } from '../../../../domain/enums/transport-type';
import type { GeoLocation } from '../../../../domain/value-objects/geo-location';
import type { Money } from '../../../../domain/value-objects/money';

/** Dexie row shape for the `transports` store (design §7, §8). */
export interface TransportRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
  lastModified: string;
  destinationId: string;
  type: TransportType;
  title?: string;
  bookingUrl?: string;
  terminal?: GeoLocation;
  company?: string;
  number?: string;
  departAt?: string;
  arriveAt?: string;
  seat?: string;
  price?: Money;
  notes?: string;
  mapsUrl?: string;
}
