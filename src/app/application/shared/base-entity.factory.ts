import type { BaseEntity } from '../../domain/entities/base-entity';

/**
 * Builds the shared `BaseEntity` fields for a newly created domain entity
 * (design §2, §14). `id` generation is an application-boundary concern per
 * the domain's own documentation — `crypto.randomUUID()` is used here, not
 * in domain code. MVP always writes `syncStatus: 'local'` (design §11).
 */
export function createBaseEntityFields(): BaseEntity {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    syncStatus: 'local',
    lastModified: now,
  };
}

/** Returns a fresh `updatedAt`/`lastModified` timestamp pair for a mutation. */
export function touchTimestamps(): Pick<BaseEntity, 'updatedAt' | 'lastModified'> {
  const now = new Date().toISOString();
  return { updatedAt: now, lastModified: now };
}
