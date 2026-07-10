import type { EntityType } from '../enums/entity-type';

/**
 * Generic pointer letting a Document/Notification attach to any
 * addressable entity (e.g. `{ type: 'hotel', id }`) — design §2, §5.
 */
export interface EntityRef {
  readonly type: EntityType;
  readonly id: string;
}
