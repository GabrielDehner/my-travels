import { buildMapsUrl, hasMapsTarget, openInMaps, resolveMapsUrl, type MapsTarget } from './maps.util';

describe('maps.util', () => {
  describe('buildMapsUrl', () => {
    it('builds a directions URL from coordinates', () => {
      const url = buildMapsUrl({ geo: { lat: 35.0116, lng: 135.7681 } }, 'directions');
      expect(url).toBe('https://www.google.com/maps/dir/?api=1&destination=35.0116,135.7681');
    });

    it('builds a view (search) URL from coordinates', () => {
      const url = buildMapsUrl({ geo: { lat: 35.0116, lng: 135.7681 } }, 'view');
      expect(url).toBe('https://www.google.com/maps/search/?api=1&query=35.0116,135.7681');
    });

    it('prefers coordinates over address when both are present', () => {
      const url = buildMapsUrl(
        { geo: { lat: 1, lng: 2, address: 'Ignored Address' }, address: 'Also ignored' },
        'directions',
      );
      expect(url).toBe('https://www.google.com/maps/dir/?api=1&destination=1,2');
    });

    it('falls back to the target address when no coordinates are present', () => {
      const url = buildMapsUrl({ address: 'Ryokan Yoshida, Kyoto' }, 'directions');
      expect(url).toBe(
        'https://www.google.com/maps/dir/?api=1&destination=' +
          encodeURIComponent('Ryokan Yoshida, Kyoto'),
      );
    });

    it('falls back to geo.address when the target has no top-level address', () => {
      const url = buildMapsUrl({ geo: { address: 'Kyoto Station' } }, 'view');
      expect(url).toBe(
        'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Kyoto Station'),
      );
    });

    it('falls back to label when no coordinates or address are present', () => {
      const url = buildMapsUrl({ label: 'Terminal 2' }, 'directions');
      expect(url).toBe(
        'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent('Terminal 2'),
      );
    });

    it('falls back to geo.label when nothing else resolves', () => {
      const url = buildMapsUrl({ geo: { label: 'Gate B12' } }, 'view');
      expect(url).toBe(
        'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Gate B12'),
      );
    });

    it('URL-encodes special characters in the address', () => {
      const url = buildMapsUrl({ address: 'Café & Résumé, 1er piso' }, 'directions');
      expect(url).toContain(encodeURIComponent('Café & Résumé, 1er piso'));
    });

    it('returns null when the target has no usable location data', () => {
      const url = buildMapsUrl({}, 'directions');
      expect(url).toBeNull();
    });

    it('returns null when address/label are blank strings', () => {
      const url = buildMapsUrl({ address: '   ', label: '' }, 'view');
      expect(url).toBeNull();
    });
  });

  describe('hasMapsTarget', () => {
    it('is true when a target resolves to a usable location', () => {
      expect(hasMapsTarget({ geo: { lat: 1, lng: 2 } })).toBe(true);
    });

    it('is false when a target has no usable location', () => {
      expect(hasMapsTarget({})).toBe(false);
    });

    it('is true when only a mapsUrl is present', () => {
      expect(hasMapsTarget({ mapsUrl: 'https://maps.app.goo.gl/ht7gwUz7BfUKnGUm9' })).toBe(true);
    });
  });

  describe('resolveMapsUrl (prefer mapsUrl, else build from geo/address)', () => {
    it('prefers a pasted mapsUrl over geo/address', () => {
      const target: MapsTarget = {
        mapsUrl: 'https://maps.app.goo.gl/ht7gwUz7BfUKnGUm9',
        geo: { lat: 1, lng: 2 },
        address: 'Ignored Address',
      };
      expect(resolveMapsUrl(target, 'directions')).toBe(
        'https://maps.app.goo.gl/ht7gwUz7BfUKnGUm9',
      );
    });

    it('trims a pasted mapsUrl before using it', () => {
      const target: MapsTarget = { mapsUrl: '  https://goo.gl/maps/abc123  ' };
      expect(resolveMapsUrl(target, 'view')).toBe('https://goo.gl/maps/abc123');
    });

    it('accepts an http (non-https) maps link', () => {
      const target: MapsTarget = { mapsUrl: 'http://maps.google.com/?q=Kyoto' };
      expect(resolveMapsUrl(target, 'view')).toBe('http://maps.google.com/?q=Kyoto');
    });

    it('falls back to building from geo when mapsUrl is not a URL', () => {
      const target: MapsTarget = { mapsUrl: 'not a url', geo: { lat: 1, lng: 2 } };
      expect(resolveMapsUrl(target, 'directions')).toBe(
        'https://www.google.com/maps/dir/?api=1&destination=1,2',
      );
    });

    it('falls back to building from address when mapsUrl is blank', () => {
      const target: MapsTarget = { mapsUrl: '   ', address: 'Ryokan Yoshida, Kyoto' };
      expect(resolveMapsUrl(target, 'directions')).toBe(
        'https://www.google.com/maps/dir/?api=1&destination=' +
          encodeURIComponent('Ryokan Yoshida, Kyoto'),
      );
    });

    it('returns null when neither mapsUrl nor geo/address/label resolve', () => {
      expect(resolveMapsUrl({ mapsUrl: 'not a url' }, 'view')).toBeNull();
    });
  });

  describe('openInMaps', () => {
    let openSpy: jasmine.Spy;

    beforeEach(() => {
      openSpy = spyOn(window, 'open');
    });

    it('opens the resolved URL in a new tab', () => {
      const target: MapsTarget = { geo: { lat: 35.0116, lng: 135.7681 } };
      openInMaps(target, 'directions');
      expect(openSpy).toHaveBeenCalledWith(
        'https://www.google.com/maps/dir/?api=1&destination=35.0116,135.7681',
        '_blank',
      );
    });

    it('does nothing (no window.open call) when there is no maps target', () => {
      openInMaps({}, 'view');
      expect(openSpy).not.toHaveBeenCalled();
    });
  });
});
