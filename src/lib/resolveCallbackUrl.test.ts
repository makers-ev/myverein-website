import { describe, expect, it } from 'vitest';
import { resolveCallbackUrl } from './resolveCallbackUrl';

describe('resolveCallbackUrl', () => {
    it('accepts a same-origin relative path', () => {
        expect(resolveCallbackUrl('/settings')).toBe('/settings');
    });

    it('falls back to the default when there is no callbackUrl', () => {
        expect(resolveCallbackUrl(null)).toBe('/settings');
    });

    it('rejects a protocol-relative URL (open-redirect attempt)', () => {
        expect(resolveCallbackUrl('//evil.com')).toBe('/settings');
    });

    it('rejects an absolute URL', () => {
        expect(resolveCallbackUrl('https://evil.com')).toBe('/settings');
    });

    it('rejects a path with no leading slash', () => {
        expect(resolveCallbackUrl('evil.com')).toBe('/settings');
    });
});
