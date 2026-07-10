import type { Collection, Table } from 'dexie';

import type { QuerySpec } from '../../../domain/shared/query-spec';

import { runQuery } from './query-translator';

interface Item {
  id: string;
  name: string;
  age: number;
  tags: string;
  deletedAt: string | null;
}

/** Minimal fake Dexie `Table`/`Collection` chain — only the members `runQuery` uses. */
function fakeCollection<T>(data: T[]): Collection<T, string> {
  const collection = {
    filter: (predicate: (record: T) => boolean) => fakeCollection(data.filter(predicate)),
    toArray: async () => data,
  };
  return collection as unknown as Collection<T, string>;
}

function fakeTable<T>(data: T[]): Table<T, string> {
  const table = {
    toCollection: () => fakeCollection(data),
    filter: (predicate: (record: T) => boolean) => fakeCollection(data.filter(predicate)),
  };
  return table as unknown as Table<T, string>;
}

describe('runQuery', () => {
  const items: Item[] = [
    { id: '1', name: 'Alice', age: 30, tags: 'admin,editor', deletedAt: null },
    { id: '2', name: 'Bob', age: 25, tags: 'viewer', deletedAt: null },
    { id: '3', name: 'Carol', age: 40, tags: 'admin', deletedAt: '2026-01-01T00:00:00.000Z' },
    { id: '4', name: 'Dana', age: 35, tags: 'editor', deletedAt: null },
  ];

  it('returns all records when the spec has no where conditions', async () => {
    const results = await runQuery(fakeTable(items), {});
    expect(results.length).toBe(4);
  });

  it('applies an "eq" condition', async () => {
    const spec: QuerySpec<Item> = { where: [{ field: 'name', op: 'eq', value: 'Bob' }] };
    const results = await runQuery(fakeTable(items), spec);
    expect(results.map((r) => r.id)).toEqual(['2']);
  });

  it('applies a "gt" condition', async () => {
    const spec: QuerySpec<Item> = { where: [{ field: 'age', op: 'gt', value: 30 }] };
    const results = await runQuery(fakeTable(items), spec);
    expect(results.map((r) => r.id).sort()).toEqual(['3', '4']);
  });

  it('applies an "in" condition', async () => {
    const spec: QuerySpec<Item> = { where: [{ field: 'id', op: 'in', value: ['1', '3'] }] };
    const results = await runQuery(fakeTable(items), spec);
    expect(results.map((r) => r.id).sort()).toEqual(['1', '3']);
  });

  it('applies a "contains" condition on a string field', async () => {
    const spec: QuerySpec<Item> = { where: [{ field: 'tags', op: 'contains', value: 'admin' }] };
    const results = await runQuery(fakeTable(items), spec);
    expect(results.map((r) => r.id).sort()).toEqual(['1', '3']);
  });

  it('applies a "startsWith" condition on a string field', async () => {
    const spec: QuerySpec<Item> = { where: [{ field: 'name', op: 'startsWith', value: 'Da' }] };
    const results = await runQuery(fakeTable(items), spec);
    expect(results.map((r) => r.id)).toEqual(['4']);
  });

  it('applies a "neq" condition', async () => {
    const spec: QuerySpec<Item> = { where: [{ field: 'name', op: 'neq', value: 'Bob' }] };
    const results = await runQuery(fakeTable(items), spec);
    expect(results.map((r) => r.id).sort()).toEqual(['1', '3', '4']);
  });

  it('composes multiple where conditions with AND semantics', async () => {
    const spec: QuerySpec<Item> = {
      where: [
        { field: 'deletedAt', op: 'eq', value: null },
        { field: 'age', op: 'gte', value: 30 },
      ],
    };
    const results = await runQuery(fakeTable(items), spec);
    expect(results.map((r) => r.id).sort()).toEqual(['1', '4']);
  });

  it('excludes soft-deleted records when filtering deletedAt eq null (soft-delete pattern)', async () => {
    const spec: QuerySpec<Item> = { where: [{ field: 'deletedAt', op: 'eq', value: null }] };
    const results = await runQuery(fakeTable(items), spec);
    expect(results.find((r) => r.id === '3')).toBeUndefined();
    expect(results.length).toBe(3);
  });

  it('sorts ascending by the given field', async () => {
    const results = await runQuery(fakeTable(items), { sort: [{ field: 'age', direction: 'asc' }] });
    expect(results.map((r) => r.id)).toEqual(['2', '1', '4', '3']);
  });

  it('sorts descending by the given field', async () => {
    const results = await runQuery(fakeTable(items), {
      sort: [{ field: 'age', direction: 'desc' }],
    });
    expect(results.map((r) => r.id)).toEqual(['3', '4', '1', '2']);
  });

  it('applies offset and limit (pagination)', async () => {
    const results = await runQuery(fakeTable(items), {
      sort: [{ field: 'age', direction: 'asc' }],
      offset: 1,
      limit: 2,
    });
    expect(results.map((r) => r.id)).toEqual(['1', '4']);
  });
});
