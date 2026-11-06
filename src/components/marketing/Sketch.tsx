'use client';

import type { ElementType, ReactNode } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';

import type { Status } from './marketingData';
import { useInView } from './useInView';

/** Shared page rhythm of every marketing chapter: one container width and one vertical padding (56 on phones, 72 from sm). */
export const MK_SECTION = 'mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8';

/** Chapter heading: display serif title, optional intro, left aligned on a calm column. */
export function SectionHead({ id, title, intro, className = '' }: { id: string; title: ReactNode; intro?: ReactNode; className?: string }) {
    return (
        <div className={`max-w-2xl ${className}`}>
            <h2 id={id} className="font-display text-4xl leading-[1.08] text-foreground sm:text-5xl">
                {title}
            </h2>
            {intro && <p className="mt-4 text-lg leading-8 text-muted-foreground">{intro}</p>}
        </div>
    );
}

/** Raised sheet of paper: hairline, soft neutral shadow. */
export function PaperCard({
    children,
    as: Tag = 'div',
    className = '',
}: {
    children: ReactNode;
    as?: ElementType;
    className?: string;
}) {
    return <Tag className={`mk-paper relative rounded-2xl border border-border bg-card p-6 text-card-foreground ${className}`}>{children}</Tag>;
}

/** Highlighter stroke behind the hero's key phrase. The text stays readable without the stroke. */
export function Marker({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <span className={`mk-marker ${className}`}>{children}</span>;
}

/**
 * Quiet status line that always states the status in words and shape (solid dot = built, dashed ring = planned),
 * so it never relies on colour alone.
 */
export function StatusBadge({ status, className = '' }: { status: Status; className?: string }) {
    const { t } = useLanguage();
    const live = status === 'live';
    return (
        <span className={`inline-flex items-center gap-2 whitespace-nowrap text-xs font-medium text-muted-foreground ${className}`}>
            <span aria-hidden="true" className={`size-2 rounded-full ${live ? 'bg-success' : 'border border-dashed border-muted-foreground'}`} />
            {live ? t('mk.status.live') : t('mk.status.soon')}
        </span>
    );
}

/**
 * Wrapper that renders a feature as solid ink (built) or as a dashed sketch (planned). A planned sketch "inks in" on
 * hover, keyboard focus inside it, and when scrolled into view, but it stays dashed and keeps its "planned" status.
 * `bodyClassName` lays out the content below the status line, so a row layout never squeezes the badge.
 */
export function StatusSketch({
    status,
    children,
    badge = true,
    as: Tag = 'div',
    className = '',
    bodyClassName = '',
}: {
    status: Status;
    children: ReactNode;
    badge?: boolean;
    as?: ElementType;
    className?: string;
    bodyClassName?: string;
}) {
    const { ref, stateClass } = useInView<HTMLElement>();
    const live = status === 'live';
    return (
        <Tag
            ref={ref}
            className={`relative rounded-2xl border p-5 sm:p-6 ${
                live ? 'border-solid border-border bg-card text-card-foreground shadow-xs' : `mk-sketch border-dashed ${stateClass}`
            } ${className}`}
        >
            {badge && <StatusBadge status={status} className="mb-3" />}
            <div className={bodyClassName}>{children}</div>
        </Tag>
    );
}

/**
 * Hand-drawn stroke(s) that draw themselves once scrolled into view. Paths use `pathLength=1`, so the CSS needs no
 * per-path lengths. `delay` picks one of the predefined mk-d1..mk-d12 steps.
 */
export function Draw({
    paths,
    viewBox,
    className = '',
    pathClassName = 'stroke-accent',
    delay,
    label,
}: {
    paths: string | string[];
    viewBox: string;
    className?: string;
    /** Stroke colour/width classes for the paths, e.g. `stroke-primary stroke-[3]`. */
    pathClassName?: string;
    delay?: number;
    /** Gives the drawing an accessible name; omit for decorative strokes. */
    label?: string;
}) {
    const { ref, stateClass } = useInView<SVGSVGElement>();
    const list = Array.isArray(paths) ? paths : [paths];
    const delayClass = delay ? `mk-d${Math.min(Math.max(Math.round(delay), 1), 12)}` : '';
    return (
        <svg
            ref={ref}
            viewBox={viewBox}
            fill="none"
            className={`${stateClass} ${className}`}
            {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: false })}
        >
            {list.map((d) => (
                <path key={d} d={d} pathLength={1} strokeLinecap="round" strokeLinejoin="round" className={`mk-draw ${delayClass} ${pathClassName}`} />
            ))}
        </svg>
    );
}
