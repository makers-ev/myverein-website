import { describe, expect, it } from 'vitest';

import { normalizeSuspension } from './suspension';

describe('normalizeSuspension', () => {
    it('is null for a club that is not suspended', () => {
        expect(normalizeSuspension(null)).toBeNull();
        expect(normalizeSuspension(undefined)).toBeNull();
    });
    it('keeps the member-facing note and the start day only', () => {
        expect(normalizeSuspension({ since: '2026-11-01T10:00:00Z', note: 'Wir melden uns.', reason: 'intern' })).toEqual({ since: '2026-11-01T10:00:00Z', note: 'Wir melden uns.' });
        expect(normalizeSuspension({ since: '2026-11-01T10:00:00Z', note: '  ' })).toEqual({ since: '2026-11-01T10:00:00Z', note: null });
    });
});
