import { TestBed } from '@angular/core/testing';

import { EXPENSE_REPOSITORY } from '../../core/di/repository.tokens';
import type { Expense } from '../../domain/entities/expense';
import type { ExpenseRepository } from '../../domain/repositories/expense.repository';
import type { QuerySpec } from '../../domain/shared/query-spec';

import { ExpenseService } from './expense.service';

/** In-memory fake `ExpenseRepository` — exercises the receipt round-trip only. */
class FakeExpenseRepository implements ExpenseRepository {
  private readonly byId = new Map<string, Expense>();
  private readonly blobs = new Map<string, Blob>();

  constructor(seed: Expense[] = []) {
    for (const expense of seed) this.byId.set(expense.id, expense);
  }

  async getByTravel(travelId: string): Promise<Expense[]> {
    return [...this.byId.values()].filter((e) => e.travelId === travelId);
  }

  async save(expense: Expense): Promise<void> {
    this.byId.set(expense.id, expense);
  }

  async softDelete(id: string): Promise<void> {
    this.byId.delete(id);
  }

  async query(_spec: QuerySpec<Expense>): Promise<Expense[]> {
    return [...this.byId.values()];
  }

  async saveReceipt(expenseId: string, blob: Blob): Promise<string> {
    const receiptBlobId = `receipt-${expenseId}`;
    this.blobs.set(receiptBlobId, blob);
    return receiptBlobId;
  }

  async getReceipt(receiptBlobId: string): Promise<Blob | undefined> {
    return this.blobs.get(receiptBlobId);
  }
}

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'expense-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    syncStatus: 'local',
    lastModified: '2026-01-01T00:00:00.000Z',
    travelId: 'travel-1',
    category: 'food',
    amount: { amountMinor: 1000, currency: 'USD' },
    date: '2026-01-01',
    ...overrides,
  };
}

describe('ExpenseService — receipt photo round-trip', () => {
  let service: ExpenseService;
  let repo: FakeExpenseRepository;

  beforeEach(() => {
    const expense = makeExpense();
    repo = new FakeExpenseRepository([expense]);
    TestBed.configureTestingModule({
      providers: [ExpenseService, { provide: EXPENSE_REPOSITORY, useValue: repo }],
    });
    service = TestBed.inject(ExpenseService);
  });

  it('setReceipt stores the blob and links receiptBlobId on the reloaded expense', async () => {
    const blob = new Blob(['receipt-bytes'], { type: 'image/jpeg' });
    const expense = (await repo.getByTravel('travel-1'))[0]!;

    await service.setReceipt(expense, blob);

    expect(service.error()).toBeNull();
    const [reloaded] = service.expenses();
    expect(reloaded?.receiptBlobId).toBe('receipt-expense-1');
  });

  it('getReceiptUrl resolves a usable object URL after setReceipt', async () => {
    const blob = new Blob(['receipt-bytes'], { type: 'image/jpeg' });
    const expense = (await repo.getByTravel('travel-1'))[0]!;
    await service.setReceipt(expense, blob);
    const [withReceipt] = service.expenses();

    const url = await service.getReceiptUrl(withReceipt!);

    expect(url).toBeTruthy();
    expect(url!.startsWith('blob:')).toBeTrue();
    if (url) URL.revokeObjectURL(url);
  });

  it('getReceiptUrl returns undefined when the expense has no receipt', async () => {
    const expense = makeExpense({ id: 'expense-2' });

    const url = await service.getReceiptUrl(expense);

    expect(url).toBeUndefined();
  });
});
