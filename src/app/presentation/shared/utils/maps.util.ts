import type { GeoLocation } from '../../../domain/value-objects/geo-location';

/**
 * A "somewhere" the traveler might want directions to — a lodging, a ticket
 * terminal, or a destination. Presentation-only (destination-logistics
 * design "Maps deep-link" ADR): no domain/infrastructure coupling, pure
 * `window.open` against a universal Google Maps URL. Coordinates are
 * preferred, then `address`, then `label`; if none resolve, callers should
 * hide the "Cómo llegar" trigger (`hasMapsTarget`).
 */
export interface MapsTarget {
  readonly geo?: GeoLocation;
  readonly address?: string;
  readonly label?: string;
  /**
   * Optional pasted Google Maps share link (feature: pasteable Google Maps
   * link). When it looks like an http(s) URL, it is preferred over building
   * a URL from `geo`/`address`/`label` — the pasted link is more precise
   * (e.g. `https://maps.app.goo.gl/...` points at the exact pin the user
   * shared, not a text search).
   */
  readonly mapsUrl?: string;
}

type MapsMode = 'directions' | 'view';

/** True when `target` has enough information to build a Maps URL. */
export function hasMapsTarget(target: MapsTarget): boolean {
  return resolveMapsUrl(target, 'view') !== null;
}

/**
 * Builds a universal Google Maps URL (works in any browser, no API key)
 * for `target`, or `null` when nothing usable was provided — callers hide
 * the button in that case instead of opening a broken link. Ignores
 * `target.mapsUrl` — use `resolveMapsUrl` when the pasted link should be
 * preferred.
 */
export function buildMapsUrl(target: MapsTarget, mode: MapsMode): string | null {
  const query = resolveQuery(target);
  if (!query) return null;

  return mode === 'directions'
    ? `https://www.google.com/maps/dir/?api=1&destination=${query}`
    : `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/**
 * Resolves the URL to actually open for `target`: prefers a pasted
 * `mapsUrl` (trimmed, only when it looks like an http(s) URL) over building
 * one from `geo`/`address`/`label`. Pure and unit-testable on its own so the
 * "prefer mapsUrl, else fall back" rule doesn't need a DOM/`window.open`.
 */
export function resolveMapsUrl(target: MapsTarget, mode: MapsMode): string | null {
  const trimmedMapsUrl = target.mapsUrl?.trim();
  if (trimmedMapsUrl && isHttpUrl(trimmedMapsUrl)) return trimmedMapsUrl;
  return buildMapsUrl(target, mode);
}

/** Light validation — only http(s) URLs are treated as pasted maps links. */
function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Opens `target` in Google Maps in a new tab. A no-op when no location
 * information is available. Honest limitation (design): this requires
 * network connectivity even though the rest of the app works offline.
 */
export function openInMaps(target: MapsTarget, mode: MapsMode): void {
  const url = resolveMapsUrl(target, mode);
  if (!url) return;
  window.open(url, '_blank');
}

/** Resolution order: coordinates -> address (target or geo) -> label (target or geo). */
function resolveQuery(target: MapsTarget): string | null {
  const { geo, address, label } = target;

  if (typeof geo?.lat === 'number' && typeof geo?.lng === 'number') {
    return `${geo.lat},${geo.lng}`;
  }

  const resolvedAddress = address?.trim() || geo?.address?.trim();
  if (resolvedAddress) return encodeURIComponent(resolvedAddress);

  const resolvedLabel = label?.trim() || geo?.label?.trim();
  if (resolvedLabel) return encodeURIComponent(resolvedLabel);

  return null;
}
