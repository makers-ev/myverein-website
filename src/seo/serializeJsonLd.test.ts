import { describe, expect, it } from 'vitest';

import { serializeJsonLd } from './serializeJsonLd';

describe('serializeJsonLd', () => {
    it('cannot close the script element or open a comment', () => {
        const out = serializeJsonLd({ name: '</script><script>alert(1)</script><!--' });
        expect(out).not.toContain('<');
        expect(out).toContain('\\u003c/script');
    });
    it('escapes the line separators', () => {
        const out = serializeJsonLd({ a: 'x\u2028y\u2029z' });
        expect(out).not.toMatch(/[\u2028\u2029]/);
    });
    it('round-trips to the same data', () => {
        const data = { '@type': 'SportsOrganization', name: 'A < B & "C"\u2028' };
        expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
    });
});
