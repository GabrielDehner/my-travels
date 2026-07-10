import { Injectable, computed, inject, signal } from '@angular/core';

import { EXPENSE_REPOSITORY } from '../../core/di/repository.tokens';
import type { Expense } from '../../domain/entities/expense';
import type { ExpenseCategory } from '../../domain/enums/expense-category';
import type { Money } from '../../domain/value-objects/money';
import { createBaseEntityFields, touchTimestamps } from '../shared/base-entity.factory';
import { convertToApproxUsd } from '../shared/currency-rates';
import { toErrorMessage } from '../shared/error.util';

/** Fields required to create a new Expense; `BaseEntity` fields are generated. */
export interface NewExpenseInput {
  travelId: string;
  category: ExpenseCategory;
  amount: Money;
  date: string;
  destinationId?: string;
  description?: string;
}

/**
 * Use-case service for Expenses, including totals/summaries and an
 * approximate-USD conversion for the Expenses summary screen (design §5,
 * §13). `approxUsd` is computed at write time from the seeded rate table —
 * see `currency-rates.ts` for the offline-constraint rationale.
 */
@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly repo = inject(EXPENSE_REPOSITORY);

  readonly expenses = signal<Expense[]>([]);
  readonly error = signal<string | null>(null);

  /** Sum of every expense's `approxUsd` (minor units), or 0 if none carry one. */
  readonly totalApproxUsdMinor = computed(() =>
    this.expenses().reduce((sum, e) => sum + (e.approxUsd?.amountMinor ?? 0), 0),
  );

  /** Total (in minor units, mixed currencies) grouped by category. */
  readonly totalsByCategory = computed(() => {
    const totals = new Map<ExpenseCategory, number>();
    for (const expense of this.expenses()) {
      totals.set(
        expense.category,
        (totals.get(expense.category) ?? 0) + expense.amount.amountMinor,
      );
    }
    return totals;
  });

  async load(travelId: string): Promise<void> {
    try {
      this.expenses.set(await this.repo.getByTravel(travelId));
    } catch (err) {
      this.error.set(toErrorMessage(err));
    }
  }

  async create(input: NewExpenseInput): Promise<Expense | undefined> {
    try {
      const expense: Expense = {
        ...createBaseEntityFields(),
        ...input,
        approxUsd: convertToApproxUsd(input.amount),
      };
      await this.repo.save(expense);
      await this.load(input.travelId);
      return expense;
    } catch (err) {
      this.error.set(toErrorMessage(err));
      return undefined;
    }
  }

  async update(expense: Expense, changes: Partial<NewExpenseInput>): Promise<void> {
    try {
      const amount = changes.amount ?? expense.amount;
      const updated: Expense = {
        ...expense,
        ...changes,
        amount,
        approxUsd: convertToApproxUsd(amount),
        ...touchTimestamps(),
      };
      await this.repo.save(updated);
      await this.load(updated.travelId);
    } catch (err) {
      this.error.set(toErrorMessage(err));
    }
  }

  async softDelete(id: string, travelId: string): Promise<void> {
    try {
      await this.repo.softDelete(id);
      await this.load(travelId);
    } catch (err) {
      this.error.set(toErrorMessage(err));
    }
  }

  /**
   * Stores a receipt photo for an expense and links it via `receiptBlobId`
   * (feature: receipt photo on expenses). Mirrors `TravelService.setCoverImage`
   * — presentation never touches `StorageProvider` directly.
   */
  async setReceipt(expense: Expense, blob: Blob): Promise<void> {
    try {
      const receiptBlobId = await this.repo.saveReceipt(expense.id, blob);
      const updated: Expense = { ...expense, receiptBlobId, ...touchTimestamps() };
      await this.repo.save(updated);
      await this.load(expense.travelId);
    } catch (err) {
      this.error.set(toErrorMessage(err));
    }
  }

  /** Resolves an expense's receipt photo as a revocable object URL, or `undefined` if none is set. */
  async getReceiptUrl(expense: Expense): Promise<string | undefined> {
    if (!expense.receiptBlobId) return undefined;
    try {
      const blob = await this.repo.getReceipt(expense.receiptBlobId);
      return blob ? URL.createObjectURL(blob) : undefined;
    } catch (err) {
      this.error.set(toErrorMessage(err));
      return undefined;
    }
  }
}
