import type { EntityRef } from '../value-objects/entity-ref';

import type { BaseEntity } from './base-entity';

/**
 * A local reminder tied to a Travel, resolved on app open/resume only
 * (MVP notification scope — design §2, §11 resolved decision #3).
 */
export interface Notification extends BaseEntity {
  travelId: string;
  entityRef?: EntityRef;
  triggerAt: string;
  offsetLabel: string;
  fired: boolean;
  message: string;
}
