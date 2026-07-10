/**
 * Immutable geographic coordinate, stored now for a future map view
 * (deferred Phase 2) — design §2. `lat`/`lng` are optional (destination-
 * logistics design ADR "GeoLocation address") so a place can be recorded by
 * `address` alone, without exact coordinates; `openInMaps` (maps.util.ts)
 * falls back to `address`/`label` when coordinates are absent.
 */
export interface GeoLocation {
  readonly lat?: number;
  readonly lng?: number;
  readonly label?: string;
  readonly address?: string;
}
