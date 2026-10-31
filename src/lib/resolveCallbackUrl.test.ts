import { describe, expect, it } from 'vitest';
import { loginHrefWithCallback, resolveCallbackUrl, verifyEmailCallback } from './resolveCallbackUrl';

describe('resolveCallbackUrl', () => {
    it('accepts a same-origin relative path', () => {
        expect(resolveCallbackUrl('/settings')).toBe('/settings');
    });

    it('falls back to the default when there is no callbackUrl', () => {
        expect(resolveCallbackUrl(null)).toBe('/heute');
    });

    it('rejects a protocol-relative URL (open-redirect attempt)', () => {
        expect(resolveCallbackUrl('//evil.com')).toBe('/heute');
    });

    it('rejects an absolute URL', () => {
        expect(resolveCallbackUrl('https://evil.com')).toBe('/heute');
    });

    it('rejects a path with no leading slash', () => {
        expect(resolveCallbackUrl('evil.com')).toBe('/heute');
    });

    it('rejects a backslash after the leading slash (browsers treat it as //)', () => {
        expect(resolveCallbackUrl('/\\evil.com')).toBe('/heute');
    });
});

describe('verify-email round trip', () => {
    it('adds a non-default target to the verification callback', () => {
        expect(verifyEmailCallback('https://a.test', '/heute')).toBe('https://a.test/verify-email');
        expect(verifyEmailCallback('https://a.test', '/einladung')).toBe('https://a.test/verify-email?callbackUrl=%2Feinladung');
    });

    it('builds the login link only with a safe target', () => {
        expect(loginHrefWithCallback('/einladung')).toBe('/login-signup?callbackUrl=%2Feinladung');
        expect(loginHrefWithCallback(null)).toBe('/login-signup');
        expect(loginHrefWithCallback('//evil.com')).toBe('/login-signup');
    });
});
