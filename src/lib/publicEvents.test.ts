import { describe, expect, it, vi } from 'vitest';

import { cancelManaged, confirmGuest, getPublicEvent, guestLanguage, isPlausibleSecret, publicResultKey, registerGuest } from './publicEvents';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('public event calls', () => {
    it('sends no cookies and no referrer and never caches', async () => {
        const f = vi.fn().mockResolvedValue(json(200, { data: { event: {}, registration: {} } }));
        await getPublicEvent('tok_abcdefghijklmnop', f);
        const [url, init] = f.mock.calls[0]!;
        expect(String(url)).toContain('/public/events/tok_abcdefghijklmnop');
        expect(init).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', method: 'GET' });
    });

    it('answers every unknown token with the same neutral result', async () => {
        expect(await getPublicEvent('x', vi.fn().mockResolvedValue(json(404, {})))).toEqual({ kind: 'notFound' });
        expect(await confirmGuest('x', 'de', vi.fn().mockResolvedValue(json(404, {})))).toEqual({ kind: 'notFound' });
    });

    it('maps rate limiting, conflicts and field errors', async () => {
        const body = { name: 'A', email: 'a@b.de', privacyAccepted: true as const, website: '' };
        expect(await registerGuest('t', body, vi.fn().mockResolvedValue(json(429, {})))).toEqual({ kind: 'rateLimited' });
        expect(await registerGuest('t', body, vi.fn().mockResolvedValue(json(409, { error: { details: { code: 'registration_closed' } } })))).toEqual({ kind: 'conflict', code: 'registration_closed' });
        const invalid = await registerGuest('t', body, vi.fn().mockResolvedValue(json(422, { error: { details: { fields: { a: 'required', b: 'weird' } } } })));
        expect(invalid).toEqual({ kind: 'invalid', fields: { a: 'required', b: 'invalid_value' }, code: null });
    });

    it('treats a network failure as a generic error and 204 as ok', async () => {
        expect(await getPublicEvent('x', vi.fn().mockRejectedValue(new Error('offline')))).toEqual({ kind: 'error' });
        expect(await cancelManaged('t', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))).toEqual({ kind: 'ok', data: undefined });
    });

    it('picks translation keys', () => {
        expect(publicResultKey({ kind: 'conflict', code: 'too_many_pending' })).toBe('guest.err.tooManyPending');
        expect(publicResultKey({ kind: 'invalid', fields: {}, code: 'party_too_large' })).toBe('guest.err.partyTooLarge');
        expect(publicResultKey({ kind: 'rateLimited' })).toBe('guest.err.rateLimited');
    });

    it('checks secrets and language', () => {
        expect(isPlausibleSecret('abc')).toBe(false);
        expect(isPlausibleSecret('a'.repeat(43))).toBe(true);
        expect(isPlausibleSecret('a b'.repeat(10))).toBe(false);
        expect(guestLanguage('en')).toBe('en');
        expect(guestLanguage('fr')).toBe('de');
    });
});
