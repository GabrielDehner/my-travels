import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { type AppLanguage, persistLanguage } from './language';

/**
 * Thin wrapper over `TranslateService` (task 8.1/8.2) — exposes the current
 * language as a signal (`TranslateService.currentLang`, already reactive)
 * and persists manual language switches to localStorage via
 * `persistLanguage`. The INITIAL language is resolved once at bootstrap in
 * `app.config.ts` (`resolveInitialLanguage`) and passed as `lang` to
 * `provideTranslateService`, so this service does not need to call `use()`
 * on construction — it only handles subsequent user-driven switches.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);

  readonly current = this.translate.currentLang;

  setLanguage(lang: AppLanguage): void {
    persistLanguage(lang);
    this.translate.use(lang).subscribe();
  }
}
