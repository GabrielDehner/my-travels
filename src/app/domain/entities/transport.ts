import type { TransportType } from '../enums/transport-type';
import type { GeoLocation } from '../value-objects/geo-location';
import type { Money } from '../value-objects/money';

import type { BaseEntity } from './base-entity';

/**
 * Ticket/pasaje entry under a Destination (MVP promotion — design §2,
 * "Ticket modeling"). Reservation is EITHER a file (via `Document` +
 * `entityRef:{type:'transport'}`) OR a link (`bookingUrl`), both optional.
 */
export interface Transport extends BaseEntity {
  destinationId: string;
  type: TransportType;
  /** Optional user-provided title for the ticket (e.g. "Flight to Tokyo"), shown as the row label when present. */
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
  /**
   * Optional pasted Google Maps share link for the terminal (e.g.
   * `https://maps.app.goo.gl/...`). When present, "Cómo llegar" opens THIS
   * exact URL instead of building one from `terminal` (feature: pasteable
   * Google Maps link). Non-indexed — no Dexie schema/version bump.
   */
  mapsUrl?: string;
}
