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

describe('tables', () => {
    const t = (s: string) => parseMarkdown(s)[0] as Extract<ReturnType<typeof parseMarkdown>[number], { t: 'table' }>;
    const text = (cell: ReturnType<typeof parseInline>) => cell.map((n) => (n.t === 'text' ? n.text : '?')).join('');

    it('parses the exact sample from the bylaws', () => {
        const blocks = parseMarkdown('| Kategorie | Jahresbeitrag |\n| --- | --- |\n| Aktiv | 120 € |');
        expect(blocks).toHaveLength(1);
        const table = blocks[0] as { t: string; head: never[]; rows: never[][]; align: unknown[] };
        expect(table.t).toBe('table');
        expect(table.head.map(text)).toEqual(['Kategorie', 'Jahresbeitrag']);
        expect(table.rows.map((r) => r.map(text))).toEqual([['Aktiv', '120 €']]);
        expect(table.align).toEqual([null, null]);
    });
    it('does not merge consecutive rows into a paragraph, also after text', () => {
        const blocks = parseMarkdown('Beiträge:\n| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n\nDanach.');
        expect(blocks.map((b) => b.t)).toEqual(['paragraph', 'table', 'paragraph']);
        expect(t('| A |\n|---|\n| 1 |\n| 2 |').rows).toHaveLength(2);
    });
    it('reads alignment colons', () => {
        expect(t('a | b | c | d\n:--- | :---: | ---: | ---\n1|2|3|4').align).toEqual(['left', 'center', 'right', null]);
    });
    it('tolerates ragged rows and escaped pipes', () => {
        const table = t('| A | B |\n| - | - |\n| only |\n| x \\| y | 2 | extra |');
        expect(table.rows[0]!.map(text)).toEqual(['only', '']);
        expect(table.rows[1]!.map(text)).toEqual(['x | y', '2']);
    });
    it('formats cell content inline', () => {
        const table = t('| **Name** | Link |\n| --- | --- |\n| *kursiv* | [x](https://x.de) |');
        expect(table.head[0]![0]!.t).toBe('strong');
        expect(table.rows[0]![0]![0]!.t).toBe('em');
        expect(table.rows[0]![1]![0]!.t).toBe('link');
    });
    it('keeps HTML and unsafe links in cells harmless', () => {
        const table = t('| <script>alert(1)</script> | [a](javascript:alert) |\n| --- | --- |\n| <img src=x onerror=alert(1)> | ![i](data:x) |');
        expect(text(table.head[0]!)).toBe('<script>alert(1)</script>');
        expect(text(table.head[1]!)).toBe('a');
        expect(text(table.rows[0]![0]!)).toBe('<img src=x onerror=alert(1)>');
        expect(text(table.rows[0]![1]!)).toBe('i');
    });
    it('needs a separator row, otherwise it stays a paragraph', () => {
        expect(parseMarkdown('| a | b |\n| c | d |').map((b) => b.t)).toEqual(['paragraph']);
        expect(parseMarkdown('| a | b |\n| --- |').map((b) => b.t)).toEqual(['paragraph']);
    });
    it('does not turn a horizontal rule under text into a table', () => {
        expect(parseMarkdown('Text\n---').map((b) => b.t)).toEqual(['paragraph', 'hr']);
    });
});

describe('line breaks', () => {
    it('breaks hard after two spaces or a backslash, flows soft lines together', () => {
        const [p] = parseMarkdown('eins  \nzwei\\\ndrei\nvier');
        expect((p as { children: { t: string }[] }).children.map((n) => n.t)).toEqual(['text', 'br', 'text', 'br', 'text']);
        expect(parseMarkdown('a\nb')[0]).toEqual({ t: 'paragraph', children: [{ t: 'text', text: 'a b' }] });
    });
});
