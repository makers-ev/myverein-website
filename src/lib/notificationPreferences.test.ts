import { describe, expect, it } from 'vitest';

import { confirmUnsubscribe, isPlausibleToken, previewUnsubscribe, withToggle, type Preferences } from './notificationPreferences';

const prefs: Preferences = {
    categories: [
        {
            category: 'announcements',
            channels: [
                { channel: 'in_app', enabled: true, switchable: false },
                { channel: 'email', enabled: true, switchable: true },
            ],
        },
        { category: 'events', channels: [{ channel: 'email', enabled: true, switchable: true }] },
    ],
    mandatory: [{ key: 'account_security', switchable: false }],
};

describe('withToggle', () => {
    it('flips only the addressed switch', () => {
        const next = withToggle(prefs, 'announcements', 'email', false);
        expect(next.categories[0]!.channels[1]!.enabled).toBe(false);
        expect(next.categories[1]!.channels[0]!.enabled).toBe(true);
        expect(prefs.categories[0]!.channels[1]!.enabled).toBe(true);
    });

    it('never flips a channel that is not switchable', () => {
        expect(withToggle(prefs, 'announcements', 'in_app', false).categories[0]!.channels[0]!.enabled).toBe(true);
    });
});

describe('isPlausibleToken', () => {
    it('accepts the payload.signature shape and rejects the rest', () => {
        expect(isPlausibleToken('eyJzIjoidSIsInAiOiJ4In0.abcDEF123-_abcDEF123')).toBe(true);
        expect(isPlausibleToken('')).toBe(false);
        expect(isPlausibleToken(null)).toBe(false);
        expect(isPlausibleToken('nodot' + 'x'.repeat(30))).toBe(false);
        expect(isPlausibleToken('a.b')).toBe(false);
        expect(isPlausibleToken('<script>alert(1)</script>.xxxxxxxxxxxxxxxxxxxxxxxx')).toBe(false);
    });
});

function fakeFetch(status: number, body: unknown): typeof fetch {
    return (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}

describe('public unsubscribe calls', () => {
    const token = 'eyJzIjoidSIsInAiOiJ4In0.abcDEF123-_abcDEF123';

    it('returns the confirmation payload', async () => {
        const r = await previewUnsubscribe(token, fakeFetch(200, { data: { category: 'announcements', channel: 'email', clubName: 'TV', unsubscribed: false } }));
        expect(r).toEqual({ kind: 'ok', data: { category: 'announcements', channel: 'email', clubName: 'TV', unsubscribed: false } });
    });

    it('treats every bad token the same, whatever the body says', async () => {
        const a = await previewUnsubscribe(token, fakeFetch(404, { error: { code: 'NOT_FOUND', message: 'person deleted' } }));
        const b = await confirmUnsubscribe(token, fakeFetch(404, {}));
        expect(a).toEqual({ kind: 'invalid' });
        expect(b).toEqual({ kind: 'invalid' });
    });

    it('distinguishes rate limit and network errors', async () => {
        expect(await confirmUnsubscribe(token, fakeFetch(429, {}))).toEqual({ kind: 'rateLimited' });
        expect(await confirmUnsubscribe(token, fakeFetch(500, {}))).toEqual({ kind: 'error' });
        const failing = (async () => {
            throw new Error('offline');
        }) as unknown as typeof fetch;
        expect(await previewUnsubscribe(token, failing)).toEqual({ kind: 'error' });
    });
});
