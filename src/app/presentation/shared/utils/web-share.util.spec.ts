import { canShareFile, isShareAbortError, type ShareCapableNavigator } from './web-share.util';

describe('web-share.util', () => {
  describe('canShareFile', () => {
    const file = new File(['zip-bytes'], 'trip-kyoto.zip', { type: 'application/zip' });

    it('returns true when canShare/share exist and canShare({ files }) resolves truthy', () => {
      const nav: ShareCapableNavigator = {
        canShare: jasmine.createSpy('canShare').and.returnValue(true),
        share: jasmine.createSpy('share'),
      };

      expect(canShareFile(nav, file)).toBe(true);
      expect(nav.canShare).toHaveBeenCalledWith({ files: [file] });
    });

    it('returns false when canShare({ files }) resolves falsy (e.g. desktop Chrome)', () => {
      const nav: ShareCapableNavigator = {
        canShare: jasmine.createSpy('canShare').and.returnValue(false),
        share: jasmine.createSpy('share'),
      };

      expect(canShareFile(nav, file)).toBe(false);
    });

    it('returns false when navigator.canShare is not a function (unsupported browser)', () => {
      const nav: ShareCapableNavigator = {};

      expect(canShareFile(nav, file)).toBe(false);
    });

    it('returns false when navigator.share is not a function even if canShare exists', () => {
      const nav: ShareCapableNavigator = {
        canShare: jasmine.createSpy('canShare').and.returnValue(true),
      };

      expect(canShareFile(nav, file)).toBe(false);
    });
  });

  describe('isShareAbortError', () => {
    it('returns true for a DOMException named AbortError (user cancelled the share sheet)', () => {
      expect(isShareAbortError(new DOMException('cancelled', 'AbortError'))).toBe(true);
    });

    it('returns false for a DOMException with a different name', () => {
      expect(isShareAbortError(new DOMException('nope', 'NotAllowedError'))).toBe(false);
    });

    it('returns false for a plain Error', () => {
      expect(isShareAbortError(new Error('boom'))).toBe(false);
    });

    it('returns false for non-error values', () => {
      expect(isShareAbortError(undefined)).toBe(false);
      expect(isShareAbortError('AbortError')).toBe(false);
    });
  });
});
