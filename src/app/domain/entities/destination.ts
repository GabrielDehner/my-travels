import type { GeoLocation } from '../value-objects/geo-location';

import type { BaseEntity } from './base-entity';

/**
 * A place visited within a Travel, chronologically ordered (design §2, §3).
 */
export interface Destination extends BaseEntity {
  travelId: string;
  country?: string;
  /** ISO 3166-1 alpha-2 code (uppercase), e.g. "ES" — drives the flag + localized name display. Optional for back-compat with existing data that only has the free-text `country`. */
  countryCode?: string;
  city?: string;
  name: string;
  geo?: GeoLocation;
  arrival: string;
  departure: string;
  order: number;
  notes?: string;
}
