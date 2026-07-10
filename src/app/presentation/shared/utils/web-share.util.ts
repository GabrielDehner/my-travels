/**
 * Web Share API helpers for the trip export flow (Settings — "Export trip").
 * Presentation-only: `TripArchiveFacade`/`TripArchiveService` still produce
 * the ZIP `Blob`; this module only decides HOW to hand that Blob to the
 * user — via the OS share sheet when supported, or the existing
 * anchor-download fallback otherwise.
 *
 * The `navigator`-shaped parameters are injected by the caller (never read
 * from `globalThis` here) so the share/no-share decision stays pure and
 * unit-testable without touching the real `navigator` or stubbing globals.
 */

/** The subset of `Navigator` this module depends on. */
export interface ShareCapableNavigator {
  canShare?: (data?: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
}

/**
 * True when `nav` supports sharing `file` via the Web Share API (files
 * variant). Desktop Chrome and browsers without `navigator.canShare`/
 * `navigator.share` fall through to `false` — callers use the anchor-download
 * fallback in that case.
 */
export function canShareFile(nav: ShareCapableNavigator, file: File): boolean {
  return typeof nav.canShare === 'function' && typeof nav.share === 'function'
    ? nav.canShare({ files: [file] })
    : false;
}

/**
 * True when `err` represents the user dismissing/cancelling the native share
 * sheet (`AbortError`, per the Web Share API spec) — callers must treat this
 * as a normal, silent outcome rather than an export failure.
 */
export function isShareAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}
