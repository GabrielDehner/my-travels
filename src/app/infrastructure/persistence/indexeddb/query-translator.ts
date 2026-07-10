import type { Collection, Table } from 'dexie';

import type { QueryCondition, QuerySpec } from '../../../domain/shared/query-spec';

/**
 * Translates a domain-owned, serializable `QuerySpec<T>` into a Dexie
 * query (design §6). MVP intentionally supports only AND-composition
 * across `where` conditions — matching the domain kernel's documented
 * scope. A future `ApiStorageProvider` translates the SAME spec into
 * REST query params instead.
 */
export async function runQuery<T>(table: Table<T, string>, spec: QuerySpec<T>): Promise<T[]> {
  const conditions = spec.where ?? [];

  let collection: Collection<T, string>;
  if (conditions.length === 0) {
    collection = table.toCollection();
  } else {
    const [first, ...rest] = conditions;
    // `conditions.length` guard above guarantees `first` is defined.
    collection = table.filter((record) => matchesCondition(record, first!));
    for (const condition of rest) {
      collection = collection.filter((record) => matchesCondition(record, condition));
    }
  }

  let results = await collection.toArray();

  if (spec.sort && spec.sort.length > 0) {
    const sorts = spec.sort;
    results = [...results].sort((a, b) => {
      for (const sort of sorts) {
        const direction = sort.direction === 'desc' ? -1 : 1;
        const aValue = a[sort.field as keyof T];
        const bValue = b[sort.field as keyof T];
        if (aValue === bValue) continue;
        return (aValue! > bValue! ? 1 : -1) * direction;
      }
      return 0;
    });
  }

  const offset = spec.offset ?? 0;
  const limit = spec.limit;
  if (offset > 0 || limit !== undefined) {
    results = results.slice(offset, limit !== undefined ? offset + limit : undefined);
  }

  return results;
}

function matchesCondition<T>(record: T, condition: QueryCondition<T>): boolean {
  const fieldValue = record[condition.field as keyof T];
  const { op, value } = condition;

  switch (op) {
    case 'eq':
      return fieldValue === value;
    case 'neq':
      return fieldValue !== value;
    case 'gt':
      return compare(fieldValue) > compare(value);
    case 'gte':
      return compare(fieldValue) >= compare(value);
    case 'lt':
      return compare(fieldValue) < compare(value);
    case 'lte':
      return compare(fieldValue) <= compare(value);
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue);
    case 'contains':
      return (
        typeof fieldValue === 'string' && typeof value === 'string' && fieldValue.includes(value)
      );
    case 'startsWith':
      return (
        typeof fieldValue === 'string' && typeof value === 'string' && fieldValue.startsWith(value)
      );
    default:
      return false;
  }
}

function compare(value: unknown): number | string {
  if (typeof value === 'number' || typeof value === 'string') return value;
  return String(value);
}
