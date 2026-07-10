import type { BaseEntity } from './base-entity';

/**
 * A single togglable item within a Checklist (design §2, §3).
 */
export interface ChecklistItem extends BaseEntity {
  checklistId: string;
  label: string;
  done: boolean;
  order: number;
}
