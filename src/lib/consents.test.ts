import { beforeEach, describe, expect, it } from 'vitest';

import { ApiError } from './api-client';
import { consentErrorKey, diffWords, overviewQuery, stashReminder, takeReminder } from './consents';

describe('overviewQuery', () => {
    it('sends state only together with a purpose', () => {
        expect(overviewQuery('c1', { q: '', purposeId: '', state: 'none', page: 1 })).not.toContain('state');
        const q = new URLSearchParams(overviewQuery('c1', { q: ' Anna ', purposeId: 'p1', state: 'none', page: 2 }));
        expect(q.get('q')).toBe('Anna');
        expect(q.get('purposeId')).toBe('p1');
        expect(q.get('state')).toBe('none');
        expect(q.get('page')).toBe('2');
        expect(q.get('clubId')).toBe('c1');
    });
});

describe('consentErrorKey', () => {
    it('maps the consent detail codes', () => {
        expect(consentErrorKey(new ApiError(409, 'CONFLICT', 'x', { code: 'consent_text_outdated' }))).toBe('privacy.err.textOutdated');
        expect(consentErrorKey(new ApiError(403, 'FORBIDDEN', 'x', { code: 'consent_requires_guardian' }))).toBe('privacy.err.requiresGuardian');
        expect(consentErrorKey(new ApiError(409, 'CONFLICT', 'x', { code: 'no_published_text' }))).toBe('privacy.err.noPublishedText');
    });
    it('falls back to the generic mapping', () => expect(consentErrorKey(new ApiError(404, 'NOT_FOUND', 'x'))).toBe('verein.err.notFound'));
});

describe('diffWords', () => {
    it('marks added and removed words', () => {
        const parts = diffWords('Wir zeigen Fotos auf der Website', 'Wir zeigen Fotos in der Vereinszeitung');
        expect(parts.map((p) => p.type)).toEqual(['same', 'del', 'add', 'same', 'del', 'add']);
        expect(parts[1]!.text).toBe('auf');
        expect(parts[2]!.text).toBe('in');
        expect(parts[5]!.text).toBe('Vereinszeitung');
    });
    it('returns one same part for identical texts', () => expect(diffWords('a b c', 'a b c')).toEqual([{ type: 'same', text: 'a b c' }]));
    it('handles an empty previous text', () => expect(diffWords('', 'neu hier')).toEqual([{ type: 'add', text: 'neu hier' }]));
});

describe('reminder stash', () => {
    beforeEach(() => {
        const store = new Map<string, string>();
        globalThis.sessionStorage = {
            getItem: (k: string) => store.get(k) ?? null,
            setItem: (k: string, v: string) => void store.set(k, v),
            removeItem: (k: string) => void store.delete(k),
        } as unknown as Storage;
    });
    it('round-trips once and clears', () => {
        expect(stashReminder({ title: 't', body: 'b', members: [{ id: '1', name: 'A' }] })).toBe(true);
        expect(takeReminder()?.members).toEqual([{ id: '1', name: 'A' }]);
        expect(takeReminder()).toBeNull();
    });
    it('ignores malformed data', () => {
        sessionStorage.setItem('myverein.consentReminder', '{"title":1}');
        expect(takeReminder()).toBeNull();
    });
});
