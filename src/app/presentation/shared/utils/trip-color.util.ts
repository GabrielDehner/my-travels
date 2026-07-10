/**
 * Small fixed palette used when `Travel.color` is absent (design §C2), and
 * reused as the trip form's color swatch picker (fix HIGH #2 — replaces the
 * raw hex text input with tappable preset chips).
 */
export const FALLBACK_PALETTE: readonly string[] = [
  '#1a56db',
  '#f5883a',
  '#16a375',
  '#7c5cff',
  '#e0578b',
  '#0e9db5',
];

const DEFAULT_COLOR = '#1a56db';

/** Deterministic fallback color derived from an entity id (stable across renders). */
export function fallbackTripColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % FALLBACK_PALETTE.length;
  }
  return FALLBACK_PALETTE.at(Math.abs(hash) % FALLBACK_PALETTE.length) ?? DEFAULT_COLOR;
}

/** Darkens a `#rrggbb` hex color by `factor` (0..1); returns the input unchanged if not hex. */
export function darkenHex(hex: string, factor = 0.72): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  const captured = match?.[1];
  if (!captured) return hex;
  const num = parseInt(captured, 16);
  const r = Math.round(((num >> 16) & 0xff) * factor);
  const g = Math.round(((num >> 8) & 0xff) * factor);
  const b = Math.round((num & 0xff) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Cover gradient for a trip cover/hero — `Travel.color` if set, else a deterministic fallback. */
export function tripCoverGradient(id: string, color?: string): string {
  const base = color ?? fallbackTripColor(id);
  return `linear-gradient(135deg, ${base} 0%, ${darkenHex(base)} 100%)`;
}
