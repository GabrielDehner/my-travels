import type { Provider } from '@angular/core';
import { provideTranslateService } from '@ngx-translate/core';

/**
 * Minimal TranslateService provider for unit tests. Components that use the
 * `translate` pipe (or inject `TranslateService`) need a provider in the
 * TestBed — this uses the default in-memory loader (no HTTP calls), so specs
 * stay fast and isolated. Import this in any spec whose component tree
 * renders a `| translate` binding.
 */
export function provideTranslateTesting(): Provider[] {
  return provideTranslateService({ lang: 'en', fallbackLang: 'en' });
}
