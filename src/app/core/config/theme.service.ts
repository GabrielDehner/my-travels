import { Injectable, signal } from '@angular/core';

/** User-facing theme preference (design §13/§15, task 7.3). */
export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'my-travels:theme-preference';
const THEME_ATTRIBUTE = 'data-theme';

/**
 * Applies the manual light/dark override (or falls back to
 * `prefers-color-scheme` when set to `'system'`) by toggling a
 * `data-theme` attribute on `<html>`, which `src/theme/light.scss` and
 * `src/theme/dark.scss` key off of. Persisted in `localStorage` so it is
 * available before IndexedDB is ready (design §13 open question, resolved:
 * localStorage over an IndexedDB settings record).
 *
 * Intentionally has NO dependency on Angular DI tokens beyond `Injectable`
 * so it can run as early as app bootstrap, and no dependency on the data
 * layer at all — theme preference must work even before a trip exists.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly preference = signal<ThemePreference>(this.readStored());

  constructor() {
    this.apply(this.preference());
  }

  setPreference(preference: ThemePreference): void {
    this.preference.set(preference);
    localStorage.setItem(STORAGE_KEY, preference);
    this.apply(preference);
  }

  private apply(preference: ThemePreference): void {
    const root = document.documentElement;
    if (preference === 'system') {
      root.removeAttribute(THEME_ATTRIBUTE);
    } else {
      root.setAttribute(THEME_ATTRIBUTE, preference);
    }
  }

  private readStored(): ThemePreference {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    return 'system';
  }
}
