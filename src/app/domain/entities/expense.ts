import type { ExpenseCategory } from '../enums/expense-category';
import type { Money } from '../value-objects/money';

import type { BaseEntity } from './base-entity';

/**
 * A recorded spend within a Travel (design §2, spec "Expenses").
 */
export interface Expense extends BaseEntity {
  travelId: string;
  destinationId?: string;
  category: ExpenseCategory;
  amount: Money;
  approxUsd?: Money;
  date: string;
  description?: string;
  /**
   * Id of the attached receipt photo blob, if any (feature: receipt photo on
   * expenses). Mirrors `Travel.coverImageId` — the blob itself lives in
   * `StorageProvider.blobs`, never inline on the entity/record.
   */
  receiptBlobId?: string;
}
