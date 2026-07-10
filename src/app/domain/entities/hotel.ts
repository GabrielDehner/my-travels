import type { GeoLocation } from '../value-objects/geo-location';
import type { Money } from '../value-objects/money';

import type { BaseEntity } from './base-entity';

/**
 * Lodging entry under a Destination (MVP — design §2, spec "Lodging").
 */
export interface Hotel extends BaseEntity {
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
  /**
   * Optional pasted Google Maps share link (e.g. `https://maps.app.goo.gl/...`).
   * When present, "Cómo llegar" opens THIS exact URL instead of building one
   * from `geo`/`address` — more precise than an address search (feature:
   * pasteable Google Maps link). Non-indexed — no Dexie schema/version bump.
   */
  mapsUrl?: string;
}
