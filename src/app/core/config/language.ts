/**
 * Supported UI languages (task 8.1/8.2). Spanish is the primary language for
 * this app's users; English is the fallback and secondary option.
 */
export type AppLanguage = 'es' | 'en';

export const SUPPORTED_LANGUAGES: readonly AppLanguage[] = ['es', 'en'];

const STORAGE_KEY = 'my-travels:language';

/**
 * Resolves the language to boot the app with: a previously persisted
 * choice takes priority, otherwise the device/browser language is used
 * (falling back to Spanish for anything that isn't English), so a user who
 * has never touched the language selector still gets a sensible default.
 * Read once, synchronously, at bootstrap (`app.config.ts`) — no dependency
 * on Angular DI so it can run before the injector exists.
 */
export function resolveInitialLanguage(): AppLanguage {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'es' || stored === 'en') return stored;

  const device = navigator.language?.toLowerCase().slice(0, 2);
  return device === 'en' ? 'en' : 'es';
}

/** Persists the user's manual language choice for the next app launch. */
export function persistLanguage(lang: AppLanguage): void {
  localStorage.setItem(STORAGE_KEY, lang);
}
