import type { Transport } from '../../../../domain/entities/transport';

import { TransportMapper } from './transport.mapper';

describe('TransportMapper', () => {
  const mapper = new TransportMapper();

  const fullTransport: Transport = {
    id: 'transport-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    deletedAt: null,
    syncStatus: 'local',
    lastModified: '2026-01-02T00:00:00.000Z',
    destinationId: 'destination-1',
    type: 'flight',
    title: 'Flight to Tokyo',
    bookingUrl: 'https://airline.example/booking/abc123',
    terminal: { lat: 35.0116, lng: 135.7681, label: 'Terminal 2', address: 'Kansai Airport' },
    company: 'ANA',
    number: 'NH123',
    departAt: '2026-03-14T09:10:00.000Z',
    arriveAt: '2026-03-14T11:30:00.000Z',
    seat: '14A',
    price: { amountMinor: 45000, currency: 'JPY' },
    notes: 'Window seat requested',
  };

  it('round-trips a fully populated entity through toRecord/toEntity losslessly', () => {
    const record = mapper.toRecord(fullTransport);
    const roundTripped = mapper.toEntity(record);

    expect(roundTripped).toEqual(fullTransport);
  });

  it('preserves every optional field individually (type, terminal, bookingUrl, company, etc.)', () => {
    const record = mapper.toRecord(fullTransport);

    expect(record.type).toBe('flight');
    expect(record.title).toBe('Flight to Tokyo');
    expect(record.terminal).toEqual(fullTransport.terminal);
    expect(record.bookingUrl).toBe(fullTransport.bookingUrl);
    expect(record.company).toBe('ANA');
    expect(record.number).toBe('NH123');
    expect(record.departAt).toBe(fullTransport.departAt);
    expect(record.arriveAt).toBe(fullTransport.arriveAt);
    expect(record.seat).toBe('14A');
    expect(record.price).toEqual(fullTransport.price);
    expect(record.notes).toBe('Window seat requested');
  });

  it('round-trips a minimal entity (only required fields, no optionals) losslessly', () => {
    const minimalTransport: Transport = {
      id: 'transport-2',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
      syncStatus: 'local',
      lastModified: '2026-01-01T00:00:00.000Z',
      destinationId: 'destination-2',
      type: 'bus',
    };

    const roundTripped = mapper.toEntity(mapper.toRecord(minimalTransport));

    expect(roundTripped).toEqual(minimalTransport);
    expect(roundTripped.title).toBeUndefined();
    expect(roundTripped.bookingUrl).toBeUndefined();
    expect(roundTripped.terminal).toBeUndefined();
  });

  it('does not mutate the original entity/record it maps', () => {
    const record = mapper.toRecord(fullTransport);
    record.company = 'Mutated';

    expect(fullTransport.company).toBe('ANA');
  });
});
