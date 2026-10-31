import { describe, expect, it } from 'vitest';

import { flattenSearch, isSearchable, searchPath } from '@/lib/globalSearch';

describe('globalSearch', () => {
    it('flattens only the groups that are present, in a fixed order', () => {
        const hits = flattenSearch({ events: [{ id: 'e', title: 'Training', startsAt: '2026-01-01T10:00:00Z' }], locations: [{ id: 'l', name: 'Halle' }] });
        expect(hits.map((h) => h.group)).toEqual(['events', 'locations']);
    });
    it('needs two characters after trimming and encodes the query', () => {
        expect(isSearchable(' a ')).toBe(false);
        expect(isSearchable('ab')).toBe(true);
        expect(searchPath('c1', ' a&b ')).toBe('/clubs/c1/search?q=a%26b&limit=5');
    });
});
