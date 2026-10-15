'use client';

import type { ElementType, ReactNode } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';

import type { Status } from './marketingData';
import { useInView } from './useInView';

export type Tilt = 'none' | 'l' | 'r' | 'l2' | 'r2';

const TILTS: Record<Tilt, string> = { none: '', l: 'mk-tilt-l', r: 'mk-tilt-r', l2: 'mk-tilt-l2', r2: 'mk-tilt-r2' };

/** Card that looks like a sheet of paper: layered soft shadow, optional slight tilt that straightens on hover. */
export function PaperCard({
    children,
    tilt = 'none',
    as: Tag = 'div',
    tape = false,
    className = '',
}: {
    children: ReactNode;
    tilt?: Tilt;
    as?: ElementType;
    /** Adds a strip of tape on top. */
    tape?: boolean;
    className?: string;
}) {
    return (
        <Tag className={`mk-paper relative rounded-sm border border-border bg-card p-5 text-card-foreground ${TILTS[tilt]} ${tape ? 'mk-tape' : ''} ${className}`}>
            {children}
        </Tag>
    );
}

/** Gold highlighter stroke behind key words. The text stays readable without the stroke. */
export function Marker({ children, className = '' }: { children: ReactNode; className?: string }) {
    return <span className={`mk-marker ${className}`}>{children}</span>;
}

/** Small label that always states the status in words and shape, so it never relies on colour alone. */
export function StatusBadge({ status, className = '' }: { status: Status; className?: string }) {
    const { t } = useLanguage();
    const live = status === 'live';
    return (
        <span
            className={`inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                live ? 'border-solid border-success bg-success/15 text-foreground' : 'border-dashed border-muted-foreground text-muted-foreground'
            } ${className}`}
        >
            <span aria-hidden="true" className={`size-2 rounded-full ${live ? 'bg-success' : 'border border-dashed border-muted-foreground'}`} />
            {live ? t('mk.status.live') : t('mk.status.soon')}
        </span>
    );
}

/**
 * Wrapper that renders a feature as solid ink (built) or as a dashed sketch (planned). A planned sketch "inks in" on
 * hover, keyboard focus inside it, and when scrolled into view, but it stays dashed and keeps its "planned" badge.
 */
export function StatusSketch({
    status,
    children,
    badge = true,
    as: Tag = 'div',
    className = '',
}: {
    status: Status;
    children: ReactNode;
    badge?: boolean;
    as?: ElementType;
    className?: string;
}) {
    const { ref, stateClass } = useInView<HTMLElement>();
    const live = status === 'live';
    return (
        <Tag
            ref={ref}
            className={`relative rounded-md p-5 ${
                live ? 'border-2 border-solid border-foreground/70 bg-card text-card-foreground' : `mk-sketch border-2 border-dashed ${stateClass}`
            } ${className}`}
        >
            {badge && <StatusBadge status={status} className="mb-3" />}
            {children}
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
