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
    | { t: 'link'; href: string; children: Inline[] };

export type Block =
    | { t: 'heading'; level: number; children: Inline[] }
    | { t: 'paragraph'; children: Inline[] }
    | { t: 'list'; ordered: boolean; items: Inline[][] }
    | { t: 'quote'; children: Inline[] }
    | { t: 'code'; text: string }
    | { t: 'hr' };

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

export function parseMarkdown(source: string): Block[] {
    const lines = source.replace(/\r\n?/g, '\n').split('\n');
    const blocks: Block[] = [];
    let i = 0;
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
        const para: string[] = [];
        while (i < lines.length && lines[i]!.trim() !== '' && (para.length === 0 || !startsBlock(lines[i]!))) para.push(lines[i++]!.trim());
        blocks.push({ t: 'paragraph', children: parseInline(para.join(' ')) });
    }
    return blocks;
}
