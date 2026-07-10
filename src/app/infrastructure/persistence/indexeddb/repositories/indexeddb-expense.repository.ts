import { inject, Injectable } from '@angular/core';

import { STORAGE_PROVIDER } from '../../../../core/di/storage.tokens';
import type { Expense } from '../../../../domain/entities/expense';
import type { ExpenseRepository } from '../../../../domain/repositories/expense.repository';
import type { QuerySpec } from '../../../../domain/shared/query-spec';
import { ExpenseMapper } from '../mappers/expense.mapper';
import type { ExpenseRecord } from '../records/expense.record';

/**
 * Dexie-backed `ExpenseRepository` implementation (design §7). Provided
 * only via `provideDataLayer()`'s `EXPENSE_REPOSITORY` binding.
 */
@Injectable()
export class IndexedDBExpenseRepository implements ExpenseRepository {
  private readonly mapper = new ExpenseMapper();
  private readonly storage = inject(STORAGE_PROVIDER);

  async getByTravel(travelId: string): Promise<Expense[]> {
    const records = await this.storage.getAll<ExpenseRecord>('expenses');
    return records
      .filter((r) => r.travelId === travelId && r.deletedAt === null)
      .map((r) => this.mapper.toEntity(r));
  }

  async save(expense: Expense): Promise<void> {
    await this.storage.put('expenses', this.mapper.toRecord(expense));
  }

  async softDelete(id: string): Promise<void> {
    const record = await this.storage.getById<ExpenseRecord>('expenses', id);
    if (!record) return;
    const now = new Date().toISOString();
    await this.storage.put('expenses', { ...record, deletedAt: now, lastModified: now });
  }

  async query(spec: QuerySpec<Expense>): Promise<Expense[]> {
    const records = await this.storage.query<ExpenseRecord>(
      'expenses',
      spec as QuerySpec<ExpenseRecord>,
    );
    return records.filter((r) => r.deletedAt === null).map((r) => this.mapper.toEntity(r));
  }

  async saveReceipt(expenseId: string, blob: Blob): Promise<string> {
    const receiptBlobId = `receipt-${expenseId}`;
    await this.storage.blobs.put(receiptBlobId, blob);
    return receiptBlobId;
  }

  async getReceipt(receiptBlobId: string): Promise<Blob | undefined> {
    return this.storage.blobs.get(receiptBlobId);
  }
}
