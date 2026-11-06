'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Pencil } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { docsUrl } from '@/lib/docs';

import { heroCardLineCount, heroToolIds, heroWordCount } from './marketingData';
import Network from './Network';
import { Marker, PaperCard } from './Sketch';
import { useInView } from './useInView';

export type ToolId = 'excel' | 'whatsapp' | 'doodle' | 'zettel' | 'anwesenheit';

const WORD_COUNT = heroWordCount;
const WORD_CYCLES = 2;
const WORD_KEYS = Array.from({ length: WORD_COUNT }, (_, i) => `mk.hero.word.${i}`);
const TOOLS: ToolId[] = [...heroToolIds];
const CARD_LINES = Array.from({ length: heroCardLineCount }, (_, i) => `mk.hero.card.l${i + 1}`);

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
            strokeWidth="1.5"
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

    // Hovering or focusing inside the hero holds the word; after two full rounds it stays put for good.
    const [wordPaused, setWordPaused] = useState(false);
    const [wordDone, setWordDone] = useState(false);
    const wordSteps = useRef(0);

    useEffect(() => {
        if (wordPaused || wordDone || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const id = window.setInterval(() => {
            wordSteps.current += 1;
            setWordIndex(wordSteps.current % WORD_COUNT);
            if (wordSteps.current >= WORD_COUNT * WORD_CYCLES) setWordDone(true);
        }, 2600);
        return () => window.clearInterval(id);
    }, [wordPaused, wordDone]);

    const allWords = WORD_KEYS.map((key) => t(key)).join(', ');

    return (
        <section
            className="relative border-b border-border"
            onMouseEnter={() => setWordPaused(true)}
            onMouseLeave={() => setWordPaused(false)}
            onFocus={() => setWordPaused(true)}
            onBlur={() => setWordPaused(false)}
        >
            <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:min-h-[calc(100svh-4rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16 lg:px-8 lg:pb-20 lg:pt-16">
                <div>
                    <h1 className="font-display text-5xl leading-[1.04] text-foreground sm:text-6xl lg:text-7xl">
                        {t('mk.hero.title-1')}
                        <span className="mt-1 block">
                            <Marker>{t('mk.hero.title-2')}</Marker>
                        </span>
                    </h1>
                    <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl sm:leading-8">{t('mk.hero.subtitle')}</p>
                    <p className="mt-5 text-lg text-foreground">
                        <span aria-hidden="true">
                            <span className="text-muted-foreground">{t('mk.hero.eg')}</span>{' '}
                            <span key={wordIndex} className="mk-b1-word font-medium text-primary">
                                {t(WORD_KEYS[wordIndex])}
                            </span>
                        </span>
                        <span className="sr-only">{t('mk.hero.words.sr', { words: allWords })}</span>
                    </p>

                    <div className="mt-8 flex flex-wrap items-center gap-3">
                        <Link
                            href="/contact#beta"
                            className="inline-flex min-h-12 items-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                            {t('mk.hero.cta')}
                        </Link>
                        <a
                            href="#woche"
                            className="inline-flex min-h-12 items-center rounded-lg border border-border bg-card px-6 text-base font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                            {t('mk.hero.cta-week')}
                        </a>
                    </div>
                    <a
                        href={docsUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t('help.nav.label')}
                        className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                        {t('mk.help.hero')}
                        <ArrowUpRight className="size-4" strokeWidth={1.5} aria-hidden="true" />
                    </a>
                </div>

                <div>
                    <div
                        ref={ref}
                        role="group"
                        aria-label={t('mk.hero.stage.alt')}
                        className={`relative h-[28rem] overflow-hidden rounded-3xl border border-border bg-muted/50 sm:h-[30rem] lg:h-[34rem] ${messy ? 'mk-b1-messy' : ''}`}
                    >
                        <Network className="absolute inset-0 size-full opacity-40" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <PaperCard className="mk-b1-card w-56 p-4 text-left sm:w-72 sm:p-5">
                                <p className="text-lg font-semibold text-foreground">{t('mk.hero.card.title')}</p>
                                <ul className="mt-3 space-y-2 text-sm text-card-foreground">
                                    {CARD_LINES.map((key) => (
                                        <li key={key} className="flex gap-2.5">
                                            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={1.5} />
                                            {t(key)}
                                        </li>
                                    ))}
                                </ul>
                                <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">{t('mk.hero.card.note')}</p>
                            </PaperCard>
                        </div>
                        {TOOLS.map((tool, i) => (
                            <div key={tool} aria-hidden="true" className={`mk-b1-obj mk-b1-o${i + 1} mk-d${i + 1}`}>
                                <div className="mk-paper flex w-24 flex-col sm:w-28 items-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 text-foreground">
                                    <ToolIcon tool={tool} />
                                    <span className="text-xs font-medium">{t(`mk.hero.obj.${tool}`)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
                        <button
                            type="button"
                            aria-pressed={tidy}
                            onClick={() => {
                                setTouched(true);
                                setTidy((v) => !v);
                            }}
                            className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                                tidy ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-muted'
                            }`}
                        >
                            {tidy ? <Check className="size-4" strokeWidth={1.5} aria-hidden="true" /> : <Pencil className="size-4" strokeWidth={1.5} aria-hidden="true" />}
                            {t('mk.hero.tidy')}
                        </button>
                        <p role="status" className="sr-only">
                            {touched ? t(tidy ? 'mk.hero.tidy.on' : 'mk.hero.tidy.off') : ''}
                        </p>
                        <p className="min-w-0 max-w-md flex-1 text-sm text-muted-foreground">{t('mk.hero.honest')}</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
