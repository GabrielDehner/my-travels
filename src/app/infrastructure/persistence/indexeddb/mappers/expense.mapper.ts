import type { Expense } from '../../../../domain/entities/expense';
import type { ExpenseRecord } from '../records/expense.record';

import type { Mapper } from './mapper';

export class ExpenseMapper implements Mapper<Expense, ExpenseRecord> {
  toRecord(entity: Expense): ExpenseRecord {
    return { ...entity };
  }

  toEntity(record: ExpenseRecord): Expense {
    return { ...record };
  }
}
