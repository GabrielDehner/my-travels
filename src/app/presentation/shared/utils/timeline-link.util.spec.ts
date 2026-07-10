import { destinationLink } from './timeline-link.util';

describe('destinationLink', () => {
  it('builds the place-detail routerLink commands array', () => {
    expect(destinationLink('trip-1', 'dest-1')).toEqual([
      '/tabs/trips',
      'trip-1',
      'destinations',
      'dest-1',
    ]);
  });

  it('preserves the exact tripId/destinationId values (no transformation)', () => {
    expect(destinationLink('t-abc', 'd-xyz')).toEqual(['/tabs/trips', 't-abc', 'destinations', 'd-xyz']);
  });
});
