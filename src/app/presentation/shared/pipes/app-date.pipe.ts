import { Pipe, type PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { formatDateRange, formatHumanDate } from '../utils/date-format.util';

/**
 * Renders an ISO date string as a short, human-friendly localized date
 * (e.g. "Jul 10, 2026" in `en`, "10 jul 2026" in `es`) instead of a raw ISO
 * string — per the governing "simple for non-technical users" principle.
 * `pure: false` so it recomputes when the app language changes at runtime
 * (mirrors `TranslatePipe`'s own impurity for the same reason).
 */
@Pipe({ name: 'appDate', standalone: true, pure: false })
export class AppDatePipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(value: string | null | undefined): string {
    if (!value) return '';
    return formatHumanDate(value, this.translate.currentLang());
  }
}

/**
 * Renders a start/end ISO date pair as a human-friendly localized range
 * (single date when start === end), e.g. "Mar 12 - Mar 22" or "Jul 10, 2026".
 */
@Pipe({ name: 'appDateRange', standalone: true, pure: false })
export class AppDateRangePipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(start: string | null | undefined, end: string | null | undefined): string {
    if (!start || !end) return '';
    return formatDateRange(start, end, this.translate.currentLang());
  }
}
