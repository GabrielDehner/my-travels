import type { Transport } from '../entities/transport';
import type { QuerySpec } from '../shared/query-spec';

/**
 * Port for Transport/Ticket persistence (MVP promotion — design §5, §7).
 */
export interface TransportRepository {
  getByDestination(destinationId: string): Promise<Transport[]>;
  save(transport: Transport): Promise<void>;
  softDelete(id: string): Promise<void>;
  query(spec: QuerySpec<Transport>): Promise<Transport[]>;
}
