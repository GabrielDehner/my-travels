/**
 * Generic entity<->record mapper contract (design §5, §7). Each entity owns
 * exactly one mapper; domain/application never import a record type
 * directly — only mappers do.
 */
export interface Mapper<Entity, Record> {
  toRecord(entity: Entity): Record;
  toEntity(record: Record): Entity;
}
