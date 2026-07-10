import type { Expense } from '../entities/expense';
import type { QuerySpec } from '../shared/query-spec';

/**
 * Port for Expense persistence (design §5, §7).
 */
export interface ExpenseRepository {
  getByTravel(travelId: string): Promise<Expense[]>;
  save(expense: Expense): Promise<void>;
  softDelete(id: string): Promise<void>;
  query(spec: QuerySpec<Expense>): Promise<Expense[]>;
}
