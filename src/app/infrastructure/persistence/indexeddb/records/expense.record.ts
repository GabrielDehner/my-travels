import type { ExpenseCategory } from '../../../../domain/enums/expense-category';
import type { SyncStatus } from '../../../../domain/enums/sync-status';
import type { Money } from '../../../../domain/value-objects/money';

/** Dexie row shape for the `expenses` store (design §7). */
export interface ExpenseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: SyncStatus;
  lastModified: string;
  travelId: string;
  destinationId?: string;
  category: ExpenseCategory;
  amount: Money;
  approxUsd?: Money;
  date: string;
  description?: string;
  receiptBlobId?: string;
}
