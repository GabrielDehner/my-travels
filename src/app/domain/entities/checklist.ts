import type { BaseEntity } from './base-entity';

/**
 * A custom checklist owned by a Travel (design §2, spec "Checklists").
 */
export interface Checklist extends BaseEntity {
  travelId: string;
  title: string;
}
