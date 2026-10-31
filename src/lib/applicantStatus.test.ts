import { describe, expect, it } from 'vitest';

import { decidedSubmissions, decisionMessage, findOpenDraft, LAST_CLUB_SLUG_KEY, latestRejection, openApplications, readLastClubSlug, rememberClubSlug } from './applicantStatus';
import type { MySubmission } from './formSchema';

let n = 0;
function sub(over: Partial<MySubmission> & { slug?: string }): MySubmission {
    n += 1;
    const { slug = 'demo', ...rest } = over;
    return {
        id: `s${n}`,
        formVersionId: 'v1',
        onBehalfOf: 'self',
        status: 'draft',
        answers: {},
        files: [],
        submittedAt: null,
        decidedAt: null,
        decisionNote: null,
        createdAt: `2026-01-${String(10 + n).padStart(2, '0')}T10:00:00.000Z`,
        purpose: 'aufnahme',
        version: 1,
        club: { id: 'c1', name: 'Demo', slug },
        ...rest,
    };
}

function memoryStore(initial: Record<string, string> = {}) {
    const data = { ...initial };
    return { data, getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v), removeItem: (k: string) => void delete data[k] };
}

describe('last club slug', () => {
    it('remembers a normalised slug and reads it back', () => {
        const store = memoryStore();
        rememberClubSlug('  Demo-Verein ', store);
        expect(store.data[LAST_CLUB_SLUG_KEY]).toBe('demo-verein');
        expect(readLastClubSlug(store)).toBe('demo-verein');
    });
    it('ignores malformed values and never throws on blocked storage', () => {
        const store = memoryStore();
        rememberClubSlug('<script>', store);
        expect(store.data[LAST_CLUB_SLUG_KEY]).toBeUndefined();
        expect(readLastClubSlug(memoryStore({ [LAST_CLUB_SLUG_KEY]: 'a b' }))).toBe('');
        const broken = {
            getItem: () => {
                throw new Error('blocked');
            },
            setItem: () => {
                throw new Error('blocked');
            },
            removeItem: () => {},
        };
        expect(() => rememberClubSlug('demo', broken)).not.toThrow();
        expect(readLastClubSlug(broken)).toBe('');
        expect(readLastClubSlug(null)).toBe('');
    });
});

describe('decidedSubmissions', () => {
    it('lists decided applications of the club, newest decision first, and leaves drafts and other clubs out', () => {
        const old = sub({ status: 'rejected', decidedAt: '2026-02-01T10:00:00.000Z' });
        const recent = sub({ status: 'accepted', decidedAt: '2026-03-01T10:00:00.000Z' });
        const wd = sub({ status: 'withdrawn', decidedAt: '2026-02-15T10:00:00.000Z' });
        const list = decidedSubmissions([old, sub({ status: 'draft' }), sub({ status: 'submitted' }), sub({ status: 'rejected', slug: 'other', decidedAt: '2026-04-01T10:00:00.000Z' }), recent, wd, sub({ purpose: 'austritt', status: 'rejected' })], 'demo');
        expect(list.map((s) => s.id)).toEqual([recent.id, wd.id, old.id]);
    });
    it('caps the list', () => {
        const many = Array.from({ length: 8 }, (_, i) => sub({ status: 'rejected', decidedAt: `2026-02-0${i + 1}T10:00:00.000Z` }));
        expect(decidedSubmissions(many, 'demo')).toHaveLength(5);
    });
});

describe('decisionMessage', () => {
    it('returns trimmed text or null', () => {
        expect(decisionMessage({ decisionNote: '  Bitte erneut bewerben.  ' })).toBe('Bitte erneut bewerben.');
        expect(decisionMessage({ decisionNote: '   ' })).toBeNull();
        expect(decisionMessage({ decisionNote: null })).toBeNull();
    });
    it('keeps markup as text (it is rendered as plain text)', () => {
        expect(decisionMessage({ decisionNote: '<b>x</b>' })).toBe('<b>x</b>');
    });
});

describe('openApplications / findOpenDraft', () => {
    it('lists drafts and pending applications of every club', () => {
        const a = sub({ status: 'draft' });
        const b = sub({ status: 'submitted', slug: 'other' });
        const list = openApplications([sub({ status: 'rejected' }), a, b, sub({ status: 'accepted' })]);
        expect(list.map((s) => s.id)).toEqual([b.id, a.id]);
    });
    it('finds the newest draft of the same club and mode only', () => {
        const older = sub({ status: 'draft' });
        const newer = sub({ status: 'draft' });
        const child = sub({ status: 'draft', onBehalfOf: 'guardian' });
        const mine = [older, newer, child, sub({ status: 'draft', slug: 'other' }), sub({ status: 'submitted' })];
        expect(findOpenDraft(mine, 'demo', 'self')?.id).toBe(newer.id);
        expect(findOpenDraft(mine, 'demo', 'guardian')?.id).toBe(child.id);
        expect(findOpenDraft([], 'demo', 'self')).toBeUndefined();
    });
});

describe('latestRejection', () => {
    it('returns the newest decided application when it was rejected', () => {
        const accepted = sub({ status: 'accepted', decidedAt: '2026-01-01T10:00:00.000Z' });
        const rejected = sub({ status: 'rejected', decidedAt: '2026-03-01T10:00:00.000Z', decisionNote: 'Leider nein.' });
        expect(latestRejection([accepted, rejected])?.id).toBe(rejected.id);
    });
    it('is null when the newest decision is not a rejection or the person applied again', () => {
        expect(latestRejection([sub({ status: 'rejected', decidedAt: '2026-01-01T10:00:00.000Z' }), sub({ status: 'accepted', decidedAt: '2026-02-01T10:00:00.000Z' })])).toBeNull();
        const rejected = sub({ status: 'rejected', decidedAt: '2026-01-20T10:00:00.000Z' });
        expect(latestRejection([rejected, sub({ status: 'submitted' })])).toBeNull();
        expect(latestRejection([])).toBeNull();
    });
});
