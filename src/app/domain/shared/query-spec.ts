/**
 * Domain-owned, provider-neutral query kernel (design §6).
 *
 * `QuerySpec<T>` is a plain, JSON-serializable data object — NOT a predicate
 * function — so it can be translated equally to Dexie calls (today) or REST
 * query params (v2). This type MUST stay in `domain/shared`: infrastructure
 * (e.g. `StorageProvider`, `query-translator.ts`) imports and consumes it,
 * but domain never imports infrastructure. This is the critical isolation
 * invariant enforced by dependency-cruiser (design §15).
 *
 * MVP intentionally supports only AND-composition across `where` conditions;
 * OR composition is deferred to keep both translators simple.
 */
export type QueryOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'startsWith';

export interface QueryCondition<T> {
  readonly field: keyof T & string;
  readonly op: QueryOp;
  readonly value: unknown;
}

export interface QuerySort<T> {
  readonly field: keyof T & string;
  readonly direction: 'asc' | 'desc';
}

export interface QuerySpec<T> {
  /** Implicit AND across conditions. */
  readonly where?: QueryCondition<T>[];
  readonly sort?: QuerySort<T>[];
  readonly limit?: number;
  readonly offset?: number;
}
