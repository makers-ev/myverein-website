import { describe, expect, it } from 'vitest';

import { parseInline, parseMarkdown, safeHref } from './markdown';

describe('safeHref', () => {
    it('allows http(s) and mailto only', () => {
        expect(safeHref('https://example.org/a')).toBe('https://example.org/a');
        expect(safeHref('http://example.org')).toBe('http://example.org');
        expect(safeHref('mailto:a@b.de')).toBe('mailto:a@b.de');
    });
    it('rejects script-like, relative and spaced targets', () => {
        for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,x', '/intern', 'ftp://x.de', 'https://a b.de', 'java\nscript:alert(1)', '', ' vbscript:x']) expect(safeHref(bad), bad).toBeNull();
    });
});

describe('parseInline', () => {
    it('keeps raw HTML as text', () => {
        expect(parseInline('<img src=x onerror=alert(1)>')).toEqual([{ t: 'text', text: '<img src=x onerror=alert(1)>' }]);
    });
    it('parses bold, italic, code and links', () => {
        expect(parseInline('a **b** *c* `d` [e](https://x.de)')).toEqual([
            { t: 'text', text: 'a ' },
            { t: 'strong', children: [{ t: 'text', text: 'b' }] },
            { t: 'text', text: ' ' },
            { t: 'em', children: [{ t: 'text', text: 'c' }] },
            { t: 'text', text: ' ' },
            { t: 'code', text: 'd' },
            { t: 'text', text: ' ' },
            { t: 'link', href: 'https://x.de', children: [{ t: 'text', text: 'e' }] },
        ]);
    });
    it('drops an unsafe link target but keeps the label', () => {
        expect(parseInline('[klick](javascript:alert)')).toEqual([{ t: 'text', text: 'klick' }]);
    });
    it('shows images as their alt text', () => {
        expect(parseInline('![Logo](https://x.de/a.png)')).toEqual([{ t: 'text', text: 'Logo' }]);
    });
});

describe('parseMarkdown', () => {
    it('builds headings, paragraphs, lists, quotes, code and rules', () => {
        const blocks = parseMarkdown('# Satzung\n\n§ 1 Name\nzweite Zeile\n\n- eins\n- zwei\n\n1. a\n2. b\n\n> Zitat\n\n```\ncode <b>\n```\n\n---');
        expect(blocks.map((b) => b.t)).toEqual(['heading', 'paragraph', 'list', 'list', 'quote', 'code', 'hr']);
        expect(blocks[1]).toEqual({ t: 'paragraph', children: [{ t: 'text', text: '§ 1 Name zweite Zeile' }] });
        expect((blocks[2] as { ordered: boolean }).ordered).toBe(false);
        expect((blocks[3] as { ordered: boolean }).ordered).toBe(true);
        expect(blocks[5]).toEqual({ t: 'code', text: 'code <b>' });
    });
    it('returns nothing for empty input', () => expect(parseMarkdown('  \n\n')).toEqual([]));
});
