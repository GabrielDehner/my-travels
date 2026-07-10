import type { Travel } from '../entities/travel';
import type { QuerySpec } from '../shared/query-spec';

/**
 * Port for Travel persistence (design §5, §7). Reads exclude soft-deleted
 * records; implementations return domain entities exclusively.
 */
export interface TravelRepository {
  getById(id: string): Promise<Travel | undefined>;
  getAll(): Promise<Travel[]>;
  save(travel: Travel): Promise<void>;
  softDelete(id: string): Promise<void>;
  query(spec: QuerySpec<Travel>): Promise<Travel[]>;
  /** Stores the trip's cover photo blob and returns the id to persist as `Travel.coverImageId`. */
  saveCoverImage(travelId: string, blob: Blob): Promise<string>;
  /** Reads back a trip's cover photo blob by its `coverImageId`. */
  getCoverImage(coverImageId: string): Promise<Blob | undefined>;
}
