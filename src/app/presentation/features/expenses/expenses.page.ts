import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { trashOutline, cashOutline, cameraOutline, closeCircle, eyeOutline } from 'ionicons/icons';

import { DestinationService } from '../../../application/services/destination.service';
import { ExpenseService } from '../../../application/services/expense.service';
import type { Expense } from '../../../domain/entities/expense';
import type { Currency } from '../../../domain/enums/currency';
import type { ExpenseCategory } from '../../../domain/enums/expense-category';
import type { Money } from '../../../domain/value-objects/money';
import { createMoney } from '../../../domain/value-objects/money';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { tripId$ } from '../../shared/utils/trip-route.util';

const CURRENCIES: Currency[] = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CNY',
  'AUD',
  'CAD',
  'CHF',
  'MXN',
  'BRL',
  'ARS',
  'CLP',
  'COP',
  'PEN',
  'INR',
  'THB',
  'VND',
  'KRW',
  'SGD',
  'NZD',
];

/** Enum values in display order; the i18n label lives at `expenses.categories.{value}`. */
const EXPENSE_CATEGORY_VALUES: readonly ExpenseCategory[] = [
  'food',
  'lodging',
  'transport',
  'shopping',
  'activities',
  'insurance',
  'other',
];

interface CategoryTotal {
  category: ExpenseCategory;
  label: string;
  approxUsdMinor: number;
}

interface DestinationTotal {
  destinationId: string;
  label: string;
  approxUsdMinor: number;
}

/**
 * Expenses — record expenses (amount + original currency + category +
 * optional destination + date + description) and summarize totals by
 * category and by destination with an approximate USD conversion (design
 * §13, spec "Expenses"). Category/destination totals are aggregated in
 * approx-USD (rather than raw minor-unit amounts) so mixed-currency trips
 * summarize meaningfully instead of summing incompatible currencies.
 */
@Component({
  selector: 'app-expenses',
  templateUrl: './expenses.page.html',
  styleUrl: './expenses.page.scss',
  imports: [
    FormsModule,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    EmptyStateComponent,
    TranslatePipe,
    AppDatePipe,
  ],
})
export class ExpensesPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly destinationService = inject(DestinationService);
  protected readonly expenseService = inject(ExpenseService);
  private readonly translate = inject(TranslateService);

  protected readonly currencies = CURRENCIES;
  protected readonly categories = EXPENSE_CATEGORY_VALUES;

  protected readonly tripId = signal('');

  protected readonly amount = signal('');
  protected readonly currency = signal<Currency>('USD');
  protected readonly category = signal<ExpenseCategory>('other');
  protected readonly destinationId = signal('');
  protected readonly date = signal(new Date().toISOString().slice(0, 10));
  protected readonly description = signal('');
  protected readonly formError = signal<string | null>(null);
  protected readonly saving = signal(false);

  /** The newly-picked receipt photo file, if any — stored via `setReceipt` after the expense saves. */
  protected readonly selectedReceiptFile = signal<File | null>(null);
  /** Local object URL preview for the newly-picked receipt file — revoked on replace/remove/destroy. */
  protected readonly receiptPreviewUrl = signal<string | null>(null);
  /** Object URLs for already-saved receipts, keyed by expense id — revoked when no longer needed/on destroy. */
  protected readonly receiptUrls = signal<Map<string, string>>(new Map());

  protected readonly recentExpenses = computed(() =>
    [...this.expenseService.expenses()].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    ),
  );

  protected readonly totalApproxUsdMinor = computed(() =>
    this.expenseService.totalApproxUsdMinor(),
  );

  protected readonly byCategory = computed<CategoryTotal[]>(() => {
    // Read `currentLang()` so this recomputes (and re-translates category
    // labels) when the user switches language at runtime.
    this.translate.currentLang();
    const totals = new Map<ExpenseCategory, number>();
    for (const expense of this.expenseService.expenses()) {
      const usd = expense.approxUsd?.amountMinor ?? 0;
      totals.set(expense.category, (totals.get(expense.category) ?? 0) + usd);
    }
    return EXPENSE_CATEGORY_VALUES.filter((value) => totals.has(value)).map((value) => ({
      category: value,
      label: this.translate.instant(`expenses.categories.${value}`),
      approxUsdMinor: totals.get(value) ?? 0,
    }));
  });

  protected readonly byDestination = computed<DestinationTotal[]>(() => {
    this.translate.currentLang();
    const totals = new Map<string, number>();
    for (const expense of this.expenseService.expenses()) {
      const key = expense.destinationId ?? '';
      const usd = expense.approxUsd?.amountMinor ?? 0;
      totals.set(key, (totals.get(key) ?? 0) + usd);
    }
    const entries: DestinationTotal[] = [];
    for (const [destinationId, approxUsdMinor] of totals.entries()) {
      entries.push({
        destinationId,
        label: destinationId
          ? this.destinationName(destinationId)
          : this.translate.instant('expenses.noDestination'),
        approxUsdMinor,
      });
    }
    return entries;
  });

  constructor() {
    addIcons({ trashOutline, cashOutline, cameraOutline, closeCircle, eyeOutline });
    this.destroyRef.onDestroy(() => {
      const preview = this.receiptPreviewUrl();
      if (preview) URL.revokeObjectURL(preview);
      for (const url of this.receiptUrls().values()) URL.revokeObjectURL(url);
    });
  }

  ngOnInit(): void {
    // Reactive resolution (fix: robust `tripId` — see trip-route.util.ts).
    tripId$(this.route)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((tripId) => {
        this.tripId.set(tripId);
        void Promise.all([this.expenseService.load(tripId), this.destinationService.load(tripId)]).then(
          () => this.refreshReceiptUrls(),
        );
      });
  }

  async addExpense(): Promise<void> {
    this.formError.set(null);
    const amountValue = Number.parseFloat(this.amount());
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      this.formError.set(this.translate.instant('expenses.validAmount'));
      return;
    }

    this.saving.set(true);
    try {
      const destinationId = this.destinationId();
      const description = this.description().trim();

      const created = await this.expenseService.create({
        travelId: this.tripId(),
        category: this.category(),
        amount: createMoney(Math.round(amountValue * 100), this.currency()),
        date: this.date(),
        ...(destinationId ? { destinationId } : {}),
        ...(description ? { description } : {}),
      });

      const receiptFile = this.selectedReceiptFile();
      if (receiptFile && created) {
        await this.expenseService.setReceipt(created, receiptFile);
      }

      this.amount.set('');
      this.description.set('');
      this.clearReceiptSelection();
      await this.refreshReceiptUrls();
    } finally {
      this.saving.set(false);
    }
  }

  async deleteExpense(expense: Expense, slidingItem: IonItemSliding): Promise<void> {
    await slidingItem.close();
    await this.expenseService.softDelete(expense.id, this.tripId());
    await this.refreshReceiptUrls();
  }

  /** Handles the "Receipt photo" file picker — camera on mobile via `capture="environment"`. */
  protected onReceiptFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    const previous = this.receiptPreviewUrl();
    if (previous) URL.revokeObjectURL(previous);

    this.selectedReceiptFile.set(file);
    this.receiptPreviewUrl.set(file ? URL.createObjectURL(file) : null);
  }

  /** Clears the not-yet-saved receipt selection (revokes its preview URL). */
  protected clearReceiptSelection(): void {
    const previous = this.receiptPreviewUrl();
    if (previous) URL.revokeObjectURL(previous);
    this.selectedReceiptFile.set(null);
    this.receiptPreviewUrl.set(null);
  }

  /** Opens a saved expense's receipt photo in a new tab/viewer. */
  protected viewReceipt(expenseId: string): void {
    const url = this.receiptUrls().get(expenseId);
    if (url) window.open(url, '_blank', 'noopener');
  }

  /**
   * Resolves an object URL for every expense that has a saved receipt,
   * reusing already-resolved URLs and revoking ones that are no longer
   * needed (expense deleted or receipt removed).
   */
  private async refreshReceiptUrls(): Promise<void> {
    const current = this.receiptUrls();
    const next = new Map<string, string>();

    for (const expense of this.expenseService.expenses()) {
      if (!expense.receiptBlobId) continue;
      const existing = current.get(expense.id);
      if (existing) {
        next.set(expense.id, existing);
        continue;
      }
      const url = await this.expenseService.getReceiptUrl(expense);
      if (url) next.set(expense.id, url);
    }

    for (const [id, url] of current.entries()) {
      if (!next.has(id)) URL.revokeObjectURL(url);
    }

    this.receiptUrls.set(next);
  }

  protected formatMoney(money: Money): string {
    return `${money.currency} ${(money.amountMinor / 100).toFixed(2)}`;
  }

  protected formatUsd(amountMinor: number): string {
    return `USD ${(amountMinor / 100).toFixed(2)}`;
  }

  private destinationName(id: string): string {
    return (
      this.destinationService.destinations().find((d) => d.id === id)?.name ??
      this.translate.instant('expenses.unknownDestination')
    );
  }
}
