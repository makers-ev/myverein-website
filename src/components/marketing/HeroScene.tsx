'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';

import { useLanguage } from '@/contexts/LanguageContext';

import Network from './Network';
import { Marker, PaperCard } from './Sketch';
import { useInView } from './useInView';

export type ToolId = 'excel' | 'whatsapp' | 'doodle' | 'zettel' | 'anwesenheit';

const WORD_COUNT = 7;
const WORD_KEYS = Array.from({ length: WORD_COUNT }, (_, i) => `mk.hero.word.${i}`);
const TOOLS: ToolId[] = ['excel', 'whatsapp', 'doodle', 'zettel', 'anwesenheit'];
const CARD_LINES = ['mk.hero.card.l1', 'mk.hero.card.l2', 'mk.hero.card.l3', 'mk.hero.card.l4'];

const ICONS: Record<ToolId, ReactNode> = {
    excel: (
        <>
            <rect x="4" y="5" width="24" height="22" rx="2" />
            <path d="M4 12h24M4 19h24M12 5v22M20 5v22" />
        </>
    ),
    whatsapp: (
        <>
            <path d="M6 7h20a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H15l-6 5v-5H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
            <path d="M10 14h.01M16 14h.01M22 14h.01" strokeWidth="3" />
        </>
    ),
    doodle: (
        <>
            <rect x="4" y="6" width="24" height="21" rx="2" />
            <path d="M4 12h24M10 3v6M22 3v6M9 20l2.5 2.5L15 17M19 20h6" />
        </>
    ),
    zettel: (
        <>
            <path d="M6 5h20v16l-6 6H6z" />
            <path d="M20 27v-6h6M10 11h12M10 16h8" />
        </>
    ),
    anwesenheit: (
        <>
            <rect x="7" y="6" width="18" height="22" rx="2" />
            <rect x="12" y="3" width="8" height="5" rx="1" />
            <path d="M11 14l1.5 1.5L15 12M18 14h4M11 21l1.5 1.5L15 19M18 21h4" />
        </>
    ),
};

/** Small hand-drawn glyph for one of the five classic club tools. Decorative; the label is always next to it. */
export function ToolIcon({ tool, className = '' }: { tool: ToolId; className?: string }) {
    return (
        <svg
            viewBox="0 0 32 32"
            aria-hidden="true"
            focusable="false"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`size-8 shrink-0 stroke-current ${className}`}
        >
            {ICONS[tool]}
        </svg>
    );
}

/**
 * Chapter 0. The server renders the tidy end state (everything in one MyVerein card). After mount the tools scatter, and
 * the "Aufräumen" toggle flutters them back into the card. With reduced motion nothing is animated, the states just swap.
 */
export default function HeroScene() {
    const { t } = useLanguage();
    const { ref, ready } = useInView<HTMLDivElement>();
    const [wordIndex, setWordIndex] = useState(0);
    const [tidy, setTidy] = useState(false);
    const [touched, setTouched] = useState(false);
    const messy = ready && !tidy;

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const id = window.setInterval(() => setWordIndex((i) => (i + 1) % WORD_COUNT), 2600);
        return () => window.clearInterval(id);
    }, []);

    const allWords = WORD_KEYS.map((key) => t(key)).join(', ');

    return (
        <section className="relative mx-auto max-w-5xl px-4 pb-10 pt-8 text-center sm:px-6 sm:pt-12 lg:px-8">
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
                {t('mk.hero.title-1')}
                <span className="mt-2 block">
                    <Marker>{t('mk.hero.title-2')}</Marker>
                </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{t('mk.hero.subtitle')}</p>
            <p className="mx-auto mt-4 text-xl font-bold text-foreground">
                <span aria-hidden="true">
                    <span className="mk-note font-normal text-muted-foreground">{t('mk.hero.eg')}</span>{' '}
                    <span key={wordIndex} className="mk-b1-word text-primary">
                        {t(WORD_KEYS[wordIndex])}
                    </span>
                </span>
                <span className="sr-only">{t('mk.hero.words.sr', { words: allWords })}</span>
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link
                    href="/contact#beta"
                    className="btn-shimmer inline-flex min-h-11 items-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                    {t('home.cta-primary')}
                </Link>
                <a
                    href="#woche"
                    className="inline-flex min-h-11 items-center rounded-xl border border-border px-6 py-3 font-semibold text-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                    {t('mk.hero.cta-week')}
                </a>
            </div>

            <div
                ref={ref}
                role="group"
                aria-label={t('mk.hero.stage.alt')}
                className={`relative mx-auto mt-10 h-[26rem] max-w-3xl sm:h-[30rem] ${messy ? 'mk-b1-messy' : ''}`}
            >
                <Network className="absolute inset-0 size-full opacity-60" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <PaperCard tilt="r" tape className="mk-b1-card w-56 text-left sm:w-64">
                        <p className="text-lg font-extrabold text-foreground">{t('mk.hero.card.title')}</p>
                        <ul className="mt-3 space-y-1.5 text-sm text-card-foreground">
                            {CARD_LINES.map((key) => (
                                <li key={key} className="flex gap-2">
                                    <span aria-hidden="true" className="font-bold text-success">
                                        ✓
                                    </span>
                                    {t(key)}
                                </li>
                            ))}
                        </ul>
                        <p className="mk-note mt-3 text-xs text-muted-foreground">{t('mk.hero.card.note')}</p>
                    </PaperCard>
                </div>
                {TOOLS.map((tool, i) => (
                    <div key={tool} aria-hidden="true" className={`mk-b1-obj mk-b1-o${i + 1} mk-d${i + 1}`}>
                        <div className="mk-paper flex w-28 flex-col items-center gap-1 rounded-sm border border-border bg-card px-2 py-3 text-foreground">
                            <ToolIcon tool={tool} />
                            <span className="text-xs font-semibold">{t(`mk.hero.obj.${tool}`)}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-2 flex flex-col items-center gap-3">
                <button
                    type="button"
                    aria-pressed={tidy}
                    onClick={() => {
                        setTouched(true);
                        setTidy((v) => !v);
                    }}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-foreground/70 px-6 py-2 font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        tidy ? 'bg-accent text-accent-foreground' : 'bg-card text-foreground hover:bg-muted'
                    }`}
                >
                    <span aria-hidden="true">{tidy ? '✓' : '✎'}</span>
                    {t('mk.hero.tidy')}
                </button>
                <p role="status" className="sr-only">
                    {touched ? t(tidy ? 'mk.hero.tidy.on' : 'mk.hero.tidy.off') : ''}
                </p>
                <p className="mk-note max-w-xl text-sm text-muted-foreground">{t('mk.hero.honest')}</p>
            </div>
        </section>
    );
}
