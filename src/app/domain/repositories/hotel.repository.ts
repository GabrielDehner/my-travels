import type { Hotel } from '../entities/hotel';
import type { QuerySpec } from '../shared/query-spec';

/**
 * Port for Hotel/Lodging persistence (MVP — design §5, §7).
 */
export interface HotelRepository {
  getByDestination(destinationId: string): Promise<Hotel[]>;
  save(hotel: Hotel): Promise<void>;
  softDelete(id: string): Promise<void>;
  query(spec: QuerySpec<Hotel>): Promise<Hotel[]>;
}
