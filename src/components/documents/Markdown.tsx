'use client';

import type { ReactNode } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { type Block, type Inline, type TableAlign, parseMarkdown } from '@/lib/markdown';

function renderInline(nodes: Inline[]): ReactNode[] {
    return nodes.map((n, i) => {
        switch (n.t) {
            case 'text':
                return n.text;
            case 'strong':
                return <strong key={i}>{renderInline(n.children)}</strong>;
            case 'em':
                return <em key={i}>{renderInline(n.children)}</em>;
            case 'br':
                return <br key={i} />;
            case 'code':
                return (
                    <code key={i} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">
                        {n.text}
                    </code>
                );
            case 'link':
                return (
                    <a key={i} href={n.href} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline">
                        {renderInline(n.children)}
                    </a>
                );
        }
    });
}

const HEADING_CLASS = ['', 'text-xl', 'text-lg', 'text-base', 'text-base', 'text-sm', 'text-sm'];

function renderBlock(b: Block, i: number, tableLabel: string): ReactNode {
    switch (b.t) {
        case 'heading': {
            // The page owns the h1; document headings start at h2.
            const Tag = `h${Math.min(6, b.level + 1)}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
            return (
                <Tag key={i} className={`mt-4 font-bold text-foreground ${HEADING_CLASS[b.level]}`}>
                    {renderInline(b.children)}
                </Tag>
            );
        }
        case 'paragraph':
            return (
                <p key={i} className="mt-2">
                    {renderInline(b.children)}
                </p>
            );
        case 'list': {
            const Tag = b.ordered ? 'ol' : 'ul';
            return (
                <Tag key={i} className={`mt-2 space-y-1 pl-5 ${b.ordered ? 'list-decimal' : 'list-disc'}`}>
                    {b.items.map((item, j) => (
                        <li key={j}>{renderInline(item)}</li>
                    ))}
                </Tag>
            );
        }
        case 'quote':
            return (
                <blockquote key={i} className="mt-2 border-l-4 border-border pl-3 text-muted-foreground">
                    {renderInline(b.children)}
                </blockquote>
            );
        case 'code':
            return (
                <pre key={i} className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs">
                    <code>{b.text}</code>
                </pre>
            );
        case 'table': {
            const alignClass = (a: TableAlign) => (a === 'center' ? 'text-center' : a === 'right' ? 'text-right' : 'text-left');
            return (
                <div key={i} className="mt-3 overflow-x-auto rounded-lg border border-border" tabIndex={0} role="region" aria-label={tableLabel}>
                    <table className="w-full border-collapse text-sm text-foreground">
                        <thead className="bg-muted">
                            <tr>
                                {b.head.map((cell, c) => (
                                    <th key={c} scope="col" className={`border-b border-border px-3 py-2 font-semibold ${alignClass(b.align[c] ?? null)}`}>
                                        {renderInline(cell)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {b.rows.map((row, r) => (
                                <tr key={r} className="border-b border-border last:border-b-0">
                                    {row.map((cell, c) => (
                                        <td key={c} className={`px-3 py-2 align-top ${alignClass(b.align[c] ?? null)}`}>
                                            {renderInline(cell)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }
        case 'hr':
            return <hr key={i} className="my-4 border-border" />;
    }
}

/** Sanitised Markdown: typed tree rendered as React elements (no HTML injection), only http(s)/mailto links. */
export default function Markdown({ source, className = '' }: { source: string; className?: string }) {
    const { t } = useLanguage();
    const label = t('docs.markdown.table');
    return <div className={`break-words text-sm leading-relaxed text-foreground ${className}`.trim()}>{parseMarkdown(source).map((b, i) => renderBlock(b, i, label))}</div>;
}
