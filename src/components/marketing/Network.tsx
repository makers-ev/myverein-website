'use client';

import { useLanguage } from '@/contexts/LanguageContext';

import { useInView } from './useInView';

type Node = { x: number; y: number; r: number; tone: 'primary' | 'accent' | 'success' | 'warning' };

// Deterministic layout (no randomness, so SSR and client agree). Order = growth order, so early nodes are the "core".
const NODES: Node[] = [
    { x: 300, y: 170, r: 17, tone: 'primary' },
    { x: 210, y: 120, r: 14, tone: 'primary' },
    { x: 395, y: 115, r: 14, tone: 'success' },
    { x: 235, y: 235, r: 14, tone: 'warning' },
    { x: 380, y: 245, r: 14, tone: 'primary' },
    { x: 120, y: 175, r: 12, tone: 'success' },
    { x: 490, y: 175, r: 12, tone: 'warning' },
    { x: 150, y: 70, r: 11, tone: 'primary' },
    { x: 305, y: 55, r: 11, tone: 'warning' },
    { x: 470, y: 65, r: 11, tone: 'primary' },
    { x: 110, y: 285, r: 11, tone: 'warning' },
    { x: 300, y: 310, r: 11, tone: 'success' },
    { x: 505, y: 285, r: 11, tone: 'success' },
    { x: 45, y: 110, r: 9, tone: 'primary' },
    { x: 555, y: 120, r: 9, tone: 'primary' },
    // The newcomer: knits itself in last.
    { x: 440, y: 335, r: 13, tone: 'accent' },
];
const NEW_NODE = NODES.length - 1;

const EDGES: [number, number][] = [
    [0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [2, 6], [1, 7], [1, 8], [2, 8], [2, 9],
    [3, 5], [3, 10], [3, 11], [4, 11], [4, 12], [4, 6], [5, 13], [6, 14], [7, 13], [9, 14],
    [1, 3], [2, 4], [8, 0], [10, 11], [12, 6],
    [NEW_NODE, 4], [NEW_NODE, 11], [NEW_NODE, 12],
];

const FILL = { primary: 'fill-primary', accent: 'fill-accent', success: 'fill-success', warning: 'fill-warning' } as const;
const STROKE = { primary: 'stroke-primary', accent: 'stroke-accent', success: 'stroke-success', warning: 'stroke-warning' } as const;

// Nodes 0..14 spread over mk-d1..mk-d11; the newcomer takes the last step.
const stepFor = (i: number) => (i === NEW_NODE ? 12 : Math.min(i + 1, 11));

/**
 * The "Vereinsgeflecht": people as nodes, lines for who trains, sings and helps together. It grows with a stagger once
 * scrolled into view and a new node (a membership application) connects last. The server renders the finished net.
 */
export default function Network({ className = '', label }: { className?: string; label?: string }) {
    const { t } = useLanguage();
    const { ref, stateClass } = useInView<SVGSVGElement>({ threshold: 0.3 });
    const a11y = label !== undefined ? { role: 'img', 'aria-label': label || t('mk.net.alt') } : { 'aria-hidden': true as const };

    return (
        <svg ref={ref} viewBox="0 0 600 360" focusable="false" className={`mk-net ${stateClass} ${className}`} {...a11y}>
            <g>
                {EDGES.map(([a, b]) => {
                    const from = NODES[a];
                    const to = NODES[b];
                    const isNew = a === NEW_NODE || b === NEW_NODE;
                    const step = stepFor(Math.max(a, b));
                    return (
                        <path
                            key={`${a}-${b}`}
                            d={`M${from.x} ${from.y} L${to.x} ${to.y}`}
                            pathLength={1}
                            className={`mk-edge mk-d${step} ${isNew ? 'mk-edge-new stroke-accent' : 'stroke-primary/45'} fill-none stroke-[2.5]`}
                            strokeLinecap="round"
                        />
                    );
                })}
            </g>
            <g>
                {NODES.map((n, i) => {
                    const isNew = i === NEW_NODE;
                    return (
                        <g key={i} className={`mk-node mk-d${stepFor(i)} ${isNew ? 'mk-node-new' : ''}`}>
                            {isNew && <circle cx={n.x} cy={n.y} r={n.r + 7} className={`mk-ring fill-none ${STROKE.accent} stroke-[1.5] [stroke-dasharray:4_3]`} />}
                            <circle cx={n.x + 1.5} cy={n.y + 2.5} r={n.r} className="fill-foreground/15" />
                            <circle cx={n.x} cy={n.y} r={n.r} className={FILL[n.tone]} />
                            <circle cx={n.x} cy={n.y - n.r * 0.25} r={n.r * 0.3} className="fill-card" />
                            <path d={`M${n.x - n.r * 0.55} ${n.y + n.r * 0.6} Q${n.x} ${n.y - n.r * 0.2} ${n.x + n.r * 0.55} ${n.y + n.r * 0.6} Z`} className="fill-card" />
                        </g>
                    );
                })}
            </g>
        </svg>
    );
}
