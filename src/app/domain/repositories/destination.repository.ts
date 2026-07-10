import type { Destination } from '../entities/destination';
import type { QuerySpec } from '../shared/query-spec';

/**
 * Port for Destination persistence (design §5, §7).
 */
export interface DestinationRepository {
  getByTravel(travelId: string): Promise<Destination[]>;
  save(destination: Destination): Promise<void>;
  softDelete(id: string): Promise<void>;
  query(spec: QuerySpec<Destination>): Promise<Destination[]>;
}
