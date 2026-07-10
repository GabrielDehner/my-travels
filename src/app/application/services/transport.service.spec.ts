import { TestBed } from '@angular/core/testing';

import { TRANSPORT_REPOSITORY } from '../../core/di/repository.tokens';
import type { Transport } from '../../domain/entities/transport';
import type { TransportRepository } from '../../domain/repositories/transport.repository';
import type { QuerySpec } from '../../domain/shared/query-spec';

import { TransportService, type NewTransportInput } from './transport.service';

/** In-memory fake — no real IndexedDB/Dexie involved. */
class FakeTransportRepository implements TransportRepository {
  readonly items = new Map<string, Transport>();

  async getByDestination(destinationId: string): Promise<Transport[]> {
    return [...this.items.values()].filter(
      (t) => t.destinationId === destinationId && t.deletedAt === null,
    );
  }

  async save(transport: Transport): Promise<void> {
    this.items.set(transport.id, transport);
  }

  async softDelete(id: string): Promise<void> {
    const existing = this.items.get(id);
    if (!existing) return;
    this.items.set(id, { ...existing, deletedAt: new Date().toISOString() });
  }

  async query(_spec: QuerySpec<Transport>): Promise<Transport[]> {
    return [...this.items.values()];
  }
}

describe('TransportService', () => {
  let service: TransportService;
  let repo: FakeTransportRepository;

  const destinationId = 'destination-1';
  const baseInput: NewTransportInput = {
    destinationId,
    type: 'flight',
  };

  beforeEach(() => {
    repo = new FakeTransportRepository();
    TestBed.configureTestingModule({
      providers: [TransportService, { provide: TRANSPORT_REPOSITORY, useValue: repo }],
    });
    service = TestBed.inject(TransportService);
  });

  it('creates a transport with a generated uuid, timestamps, and syncStatus "local"', async () => {
    const created = await service.create(baseInput);

    expect(created).toBeDefined();
    expect(created!.id).toBeTruthy();
    expect(created!.syncStatus).toBe('local');
    expect(created!.createdAt).toBeTruthy();
    expect(created!.updatedAt).toBeTruthy();
    expect(created!.deletedAt).toBeNull();
    expect(repo.items.has(created!.id)).toBe(true);
  });

  it('updates the exposed `transports` signal after create', async () => {
    expect(service.transports()).toEqual([]);

    const created = await service.create(baseInput);

    expect(service.transports().map((t) => t.id)).toEqual([created!.id]);
  });

  it('sorts loaded transports by departAt ascending, undated last', async () => {
    await service.create({ ...baseInput, departAt: '2026-03-14T12:00:00.000Z' });
    await service.create({ ...baseInput, departAt: '2026-03-10T08:00:00.000Z' });
    await service.create({ ...baseInput }); // no departAt

    const sorted = await service.listFor(destinationId);
    expect(sorted.map((t) => t.departAt)).toEqual([
      '2026-03-10T08:00:00.000Z',
      '2026-03-14T12:00:00.000Z',
      undefined,
    ]);
  });

  it('softDelete removes the transport from the exposed list', async () => {
    const created = await service.create(baseInput);
    expect(service.transports().length).toBe(1);

    await service.softDelete(created!.id, destinationId);

    expect(service.transports()).toEqual([]);
    expect(repo.items.get(created!.id)?.deletedAt).not.toBeNull();
  });

  it('update applies changes and refreshes timestamps without touching the id', async () => {
    const created = await service.create(baseInput);
    const originalUpdatedAt = created!.updatedAt;

    await new Promise((resolve) => setTimeout(resolve, 2));
    await service.update(created!, { company: 'ANA', number: 'NH123' });

    const stored = repo.items.get(created!.id)!;
    expect(stored.company).toBe('ANA');
    expect(stored.number).toBe('NH123');
    expect(stored.id).toBe(created!.id);
    expect(stored.updatedAt).not.toBe(originalUpdatedAt);
  });

  it('surfaces repository failures via the error signal instead of throwing', async () => {
    spyOn(repo, 'save').and.throwError('boom');

    const result = await service.create(baseInput);

    expect(result).toBeUndefined();
    expect(service.error()).toContain('boom');
  });
});
