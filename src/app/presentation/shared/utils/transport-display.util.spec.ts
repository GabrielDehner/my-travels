import type { Transport } from '../../../domain/entities/transport';

import { ticketLabel, transportMeta } from './transport-display.util';

describe('transportMeta', () => {
  it('joins company, number, and terminal name with a middle dot', () => {
    const transport = {
      company: 'ANA',
      number: 'NH123',
      terminal: { address: 'Kansai Airport' },
    } as Transport;

    expect(transportMeta(transport)).toBe('ANA · NH123 · Kansai Airport');
  });

  it('falls back to the terminal label when no address is set', () => {
    const transport = { terminal: { label: 'Terminal 2' } } as Transport;

    expect(transportMeta(transport)).toBe('Terminal 2');
  });

  it('returns undefined when there is nothing to show', () => {
    const transport = {} as Transport;

    expect(transportMeta(transport)).toBeUndefined();
  });
});

describe('ticketLabel', () => {
  it('returns the transport title when present', () => {
    expect(ticketLabel({ title: 'Flight to Tokyo' }, 'Flight')).toBe('Flight to Tokyo');
  });

  it('trims the title before using it', () => {
    expect(ticketLabel({ title: '  Flight to Tokyo  ' }, 'Flight')).toBe('Flight to Tokyo');
  });

  it('falls back when the title is absent', () => {
    expect(ticketLabel({}, 'Flight')).toBe('Flight');
  });

  it('falls back when the title is only whitespace', () => {
    expect(ticketLabel({ title: '   ' }, 'Flight')).toBe('Flight');
  });
});
