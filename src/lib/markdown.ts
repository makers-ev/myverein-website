/**
 * Minimal, safe Markdown parser for club documents (Wave 13 W1). Decision (one for website and app): an in-repo renderer instead of
 * a library -- the club documents need headings, paragraphs, lists, quotes, code, bold/italic and links, nothing else, and a parser that
 * only ever produces a typed tree (rendered as React elements, never as an HTML string) cannot emit raw HTML. Raw HTML in the source
 * stays plain text; links are limited to http(s) and mailto; images are shown as their alt text.
 */

export type Inline =
    | { t: 'text'; text: string }
    | { t: 'strong'; children: Inline[] }
    | { t: 'em'; children: Inline[] }
    | { t: 'code'; text: string }
    | { t: 'br' }
    | { t: 'link'; href: string; children: Inline[] };

export type Block =
    | { t: 'heading'; level: number; children: Inline[] }
    | { t: 'paragraph'; children: Inline[] }
    | { t: 'list'; ordered: boolean; items: Inline[][] }
    | { t: 'quote'; children: Inline[] }
    | { t: 'code'; text: string }
    | { t: 'table'; align: TableAlign[]; head: Inline[][]; rows: Inline[][][] }
    | { t: 'hr' };

export type TableAlign = 'left' | 'center' | 'right' | null;

const MAX_TABLE_COLUMNS = 20;
const MAX_TABLE_ROWS = 500;

/** Only `http(s)` and `mailto` targets are links; anything else (javascript:, data:, relative, with whitespace or control characters) is not. */
export function safeHref(raw: string): string | null {
    const href = raw.trim();
    if (href === '' || href.length > 2048 || /[\u0000- \u007f-\u009f‪-‮⁦-⁩]/.test(href)) return null;
    if (!/^(https?:\/\/|mailto:)/i.test(href)) return null;
    try {
        const url = new URL(href);
        return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:' ? href : null;
    } catch {
        return null;
    }
}

const INLINE = /(\*\*([^*]+?)\*\*)|(\*([^*\s][^*]*?)\*)|(`([^`]+)`)|(!?\[([^\]]*)\]\(([^)\s]*)\))/g;
const MAX_DEPTH = 3;

export function parseInline(src: string, depth = 0): Inline[] {
    const out: Inline[] = [];
    let last = 0;
    const push = (text: string) => {
        if (text) out.push({ t: 'text', text });
    };
    for (const m of src.matchAll(INLINE)) {
        const index = m.index ?? 0;
        push(src.slice(last, index));
        last = index + m[0].length;
        if (m[1] !== undefined) out.push(depth < MAX_DEPTH ? { t: 'strong', children: parseInline(m[2]!, depth + 1) } : { t: 'text', text: m[2]! });
        else if (m[3] !== undefined) out.push(depth < MAX_DEPTH ? { t: 'em', children: parseInline(m[4]!, depth + 1) } : { t: 'text', text: m[4]! });
        else if (m[5] !== undefined) out.push({ t: 'code', text: m[6]! });
        else {
            const label = m[8] ?? '';
            const href = m[7]!.startsWith('!') ? null : safeHref(m[9] ?? '');
            if (href) out.push({ t: 'link', href, children: depth < MAX_DEPTH ? parseInline(label, depth + 1) : [{ t: 'text', text: label }] });
            else push(label || m[9] || '');
        }
    }
    push(src.slice(last));
    return out;
}

/** Cells of a pipe-table row: optional outer pipes, `\|` is a literal pipe, cells are trimmed. */
export function splitTableRow(line: string): string[] {
    const cells: string[] = [];
    let cur = '';
    const text = line.trim();
    for (let k = 0; k < text.length; k++) {
        const ch = text[k]!;
        if (ch === '\\' && text[k + 1] === '|') {
            cur += '|';
            k++;
        } else if (ch === '|') {
            cells.push(cur);
            cur = '';
        } else cur += ch;
    }
    cells.push(cur);
    if (text.startsWith('|')) cells.shift();
    if (cells.length > 0 && text.endsWith('|') && !text.endsWith('\\|')) cells.pop();
    return cells.map((c) => c.trim());
}

const SEPARATOR_CELL = /^:?-+:?$/;

function separatorAlign(line: string): TableAlign[] | null {
    if (!line.includes('-') || !/^[\s|:-]+$/.test(line)) return null;
    const cells = splitTableRow(line);
    if (cells.length === 0 || !cells.every((c) => SEPARATOR_CELL.test(c))) return null;
    return cells.map((c) => (c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : c.startsWith(':') ? 'left' : null));
}

/** Inline content of a paragraph: a line ending in two spaces or a backslash is a hard line break, otherwise lines flow together. */
function paragraphInline(rawLines: string[]): Inline[] {
    const out: Inline[] = [];
    rawLines.forEach((raw, idx) => {
        const hard = / {2,}$/.test(raw) || raw.endsWith('\\');
        const text = raw.trim().replace(/\\$/, '').trim();
        const nodes = parseInline(text);
        if (idx > 0 && !(out[out.length - 1]?.t === 'br')) out.push({ t: 'text', text: ' ' });
        out.push(...nodes);
        if (hard && idx < rawLines.length - 1) out.push({ t: 'br' });
    });
    // Merge neighbouring text nodes so soft line breaks do not split a sentence into pieces.
    return out.reduce<Inline[]>((acc, n) => {
        const prev = acc[acc.length - 1];
        if (prev?.t === 'text' && n.t === 'text') prev.text += n.text;
        else acc.push(n);
        return acc;
    }, []);
}

export function parseMarkdown(source: string): Block[] {
    const lines = source.replace(/\r\n?/g, '\n').split('\n');
    const blocks: Block[] = [];
    let i = 0;
    const tableAt = (k: number) => k + 1 < lines.length && lines[k]!.includes('|') && separatorAlign(lines[k + 1]!) !== null && splitTableRow(lines[k]!).length === separatorAlign(lines[k + 1]!)!.length;
    const startsBlock = (line: string) => /^(#{1,6}\s|>\s?|```|\s*[-*]\s+|\s*\d+[.)]\s+|(-{3,}|\*{3,}|_{3,})\s*$)/.test(line);
    while (i < lines.length) {
        const line = lines[i]!;
        if (line.trim() === '') {
            i++;
            continue;
        }
        if (line.startsWith('```')) {
            const body: string[] = [];
            i++;
            while (i < lines.length && !lines[i]!.startsWith('```')) body.push(lines[i++]!);
            i++;
            blocks.push({ t: 'code', text: body.join('\n') });
            continue;
        }
        const heading = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
        if (heading) {
            blocks.push({ t: 'heading', level: heading[1]!.length, children: parseInline(heading[2]!) });
            i++;
            continue;
        }
        if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
            blocks.push({ t: 'hr' });
            i++;
            continue;
        }
        if (/^>\s?/.test(line)) {
            const body: string[] = [];
            while (i < lines.length && /^>\s?/.test(lines[i]!)) body.push(lines[i++]!.replace(/^>\s?/, ''));
            blocks.push({ t: 'quote', children: parseInline(body.join(' ').trim()) });
            continue;
        }
        const listMatch = /^\s*([-*]|\d+[.)])\s+/.exec(line);
        if (listMatch) {
            const ordered = /\d/.test(listMatch[1]!);
            const items: Inline[][] = [];
            while (i < lines.length) {
                const m = /^\s*([-*]|\d+[.)])\s+(.*)$/.exec(lines[i]!);
                if (!m || /\d/.test(m[1]!) !== ordered) break;
                items.push(parseInline(m[2]!));
                i++;
            }
            blocks.push({ t: 'list', ordered, items });
            continue;
        }
        if (tableAt(i)) {
            const align = separatorAlign(lines[i + 1]!)!.slice(0, MAX_TABLE_COLUMNS);
            const width = align.length;
            const cell = (c: string | undefined) => parseInline(c ?? '');
            const head = splitTableRow(lines[i]!).slice(0, width).map(cell);
            i += 2;
            const rows: Inline[][][] = [];
            while (i < lines.length && lines[i]!.trim() !== '' && lines[i]!.includes('|') && !startsBlock(lines[i]!) && rows.length < MAX_TABLE_ROWS) {
                const cells = splitTableRow(lines[i]!);
                rows.push(Array.from({ length: width }, (_, c) => cell(cells[c])));
                i++;
            }
            blocks.push({ t: 'table', align, head, rows });
            continue;
        }
        const para: string[] = [];
        while (i < lines.length && lines[i]!.trim() !== '' && (para.length === 0 || (!startsBlock(lines[i]!) && !tableAt(i)))) para.push(lines[i++]!);
        blocks.push({ t: 'paragraph', children: paragraphInline(para) });
    }
    return blocks;
}
