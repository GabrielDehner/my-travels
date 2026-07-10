import { NgClass } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward } from 'ionicons/icons';

import { formatDateRange, resolveDateLocale, todayDateOnly } from '../../utils/date-format.util';
import {
  type CalendarDay,
  type TapStage,
  buildMonthGrid,
  isInRange,
  nextTapState,
  parseYearMonth,
  shiftMonth,
} from '../../utils/date-range-picker.util';

/**
 * Single reusable date-RANGE field (design fix — replaces the two separate
 * "start date" / "end date" `<ion-input type="date">` fields across the
 * trip/destination/lodging forms). Shows one closed-field summary (e.g.
 * "10 jul - 14 jul 2026", or a single date when start/end are the same day)
 * that opens a full-screen `ion-modal` month calendar: first tap picks the
 * start, second tap picks the end (an earlier second tap becomes the new
 * start instead of producing an inverted range — see
 * {@link nextTapState}). Confirm/Cancel keep edits a no-op until applied.
 *
 * Emits date-only "YYYY-MM-DD" strings — the same shape the domain
 * `DateRange` value object expects — and never constructs a display `Date`
 * from them without pinning to UTC (see `date-range-picker.util.ts` header
 * comment), so the selected days can never shift due to the viewer's local
 * timezone.
 *
 * Presentation-only: reuses `date-format.util`/`date-range-picker.util`, no
 * domain/application imports (dependency-cruiser boundary).
 */
@Component({
  selector: 'app-date-range-picker',
  standalone: true,
  imports: [
    NgClass,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonModal,
    IonTitle,
    IonToolbar,
    TranslatePipe,
  ],
  templateUrl: './date-range-picker.component.html',
  styleUrl: './date-range-picker.component.scss',
})
export class DateRangePickerComponent {
  private readonly translate = inject(TranslateService);

  /** Selected range start, "YYYY-MM-DD" (or '' when unset). */
  readonly start = input<string>('');
  /** Selected range end, "YYYY-MM-DD" (or '' when unset). */
  readonly end = input<string>('');
  /** Emitted only when the user taps "Confirm" — never on every tap. */
  readonly rangeChange = output<{ start: string; end: string }>();

  protected readonly isOpen = signal(false);

  /** Draft state edited inside the modal; discarded on Cancel. */
  protected readonly draftStart = signal('');
  protected readonly draftEnd = signal('');
  protected readonly stage = signal<TapStage>('start');
  protected readonly viewYear = signal(0);
  protected readonly viewMonth = signal(1);

  constructor() {
    addIcons({ chevronBack, chevronForward });
  }

  /** Closed-field summary text, or the placeholder when no range is set yet. */
  protected readonly summaryLabel = computed(() => {
    const start = this.start();
    const end = this.end();
    if (!start || !end) return '';
    return formatDateRange(start, end, this.translate.currentLang());
  });

  protected readonly placeholder = computed(() =>
    this.translate.instant('dateRangePicker.placeholder'),
  );

  protected readonly monthTitle = computed(() => {
    const locale = resolveDateLocale(this.translate.currentLang());
    const date = new Date(Date.UTC(this.viewYear(), this.viewMonth() - 1, 1));
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
      date,
    );
  });

  /** Localized short weekday headers (Sun..Sat), matching the grid's Sunday-first layout. */
  protected readonly weekdayLabels = computed(() => {
    const locale = resolveDateLocale(this.translate.currentLang());
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
    // 2023-01-01 is a Sunday — an arbitrary UTC anchor, never displayed.
    return Array.from({ length: 7 }, (_, i) =>
      formatter.format(new Date(Date.UTC(2023, 0, 1 + i))),
    );
  });

  protected readonly monthGrid = computed<CalendarDay[]>(() =>
    buildMonthGrid(this.viewYear(), this.viewMonth()),
  );

  protected dayClass(date: string): Record<string, boolean> {
    const start = this.draftStart();
    const end = this.draftEnd();
    return {
      'day--start': !!start && date === start,
      'day--end': !!end && date === end,
      'day--in-range': isInRange(date, start, end),
      'day--today': date === todayDateOnly(),
    };
  }

  protected open(): void {
    const initialStart = this.start() || todayDateOnly();
    const initialEnd = this.end() || initialStart;
    this.draftStart.set(initialStart);
    this.draftEnd.set(initialEnd);
    this.stage.set('start');

    const { year, month } = parseYearMonth(initialStart);
    this.viewYear.set(year);
    this.viewMonth.set(month);

    this.isOpen.set(true);
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  protected onDayTap(date: string): void {
    const { range, nextStage } = nextTapState(this.draftStart() || null, this.stage(), date);
    this.draftStart.set(range.start);
    this.draftEnd.set(range.end);
    this.stage.set(nextStage);
  }

  protected goToday(): void {
    const today = todayDateOnly();
    this.draftStart.set(today);
    this.draftEnd.set(today);
    this.stage.set('end');

    const { year, month } = parseYearMonth(today);
    this.viewYear.set(year);
    this.viewMonth.set(month);
  }

  protected prevMonth(): void {
    const { year, month } = shiftMonth(this.viewYear(), this.viewMonth(), -1);
    this.viewYear.set(year);
    this.viewMonth.set(month);
  }

  protected nextMonth(): void {
    const { year, month } = shiftMonth(this.viewYear(), this.viewMonth(), 1);
    this.viewYear.set(year);
    this.viewMonth.set(month);
  }

  protected confirm(): void {
    this.rangeChange.emit({ start: this.draftStart(), end: this.draftEnd() });
    this.close();
  }
}
