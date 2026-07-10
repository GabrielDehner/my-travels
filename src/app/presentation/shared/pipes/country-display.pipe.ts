import { Pipe, type PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { countryDisplayLabel } from '../utils/country-display.util';

/**
 * Renders a destination's country as "flag + localized name" (e.g.
 * "🇪🇸 España"), falling back to the legacy free-text `country` when no
 * `countryCode` is set, and to `''` when neither is present. `pure: false`
 * so it re-resolves the name when the app language changes at runtime
 * (mirrors `AppDatePipe`).
 */
@Pipe({ name: 'countryDisplay', standalone: true, pure: false })
export class CountryDisplayPipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(countryCode: string | null | undefined, fallbackCountry?: string | null): string {
    return countryDisplayLabel(countryCode, fallbackCountry, this.translate.currentLang());
  }
}
