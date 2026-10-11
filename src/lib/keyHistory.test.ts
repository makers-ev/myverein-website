import { describe, expect, it } from 'vitest';

import { formatBerlinDateTime, isKeyAction, keyHistoryQuery, pageCount } from './keyHistory';

describe('key history helpers', () => {
    it('builds the query and leaves out an empty member filter', () => {
        const q = new URLSearchParams(keyHistoryQuery('c1', 2, ''));
        expect(q.get('clubId')).toBe('c1');
        expect(q.get('page')).toBe('2');
        expect(q.get('pageSize')).toBe('20');
        expect(q.has('memberId')).toBe(false);
        expect(new URLSearchParams(keyHistoryQuery('c1', 1, 'm1')).get('memberId')).toBe('m1');
    });

    it('counts pages, at least one', () => {
        expect(pageCount(0, 20)).toBe(1);
        expect(pageCount(41, 20)).toBe(3);
    });

    it('validates actions', () => {
        expect(isKeyAction('issued')).toBe(true);
        expect(isKeyAction('lost')).toBe(false);
    });

    it('formats in Berlin time, not UTC', () => {
        // 23:30 UTC on 30 Jun is already 01:30 on 1 Jul in Berlin (summer time).
        expect(formatBerlinDateTime('2026-06-30T23:30:00Z', 'de')).toContain('01.07.2026');
        expect(formatBerlinDateTime('nope', 'de')).toBe('—');
    });
});
