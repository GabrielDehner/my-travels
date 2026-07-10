import type { TravelStatus } from '../enums/travel-status';
import type { DateRange } from '../value-objects/date-range';

import type { BaseEntity } from './base-entity';

/**
 * Aggregate root: a trip (design §2, §3).
 */
export interface Travel extends BaseEntity {
  title: string;
  description?: string;
  coverImageId?: string;
  color?: string;
  dates: DateRange;
  status: TravelStatus;
  notes?: string;
}
