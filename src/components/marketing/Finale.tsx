'use client';

import Link from 'next/link';

import { useLanguage } from '@/contexts/LanguageContext';

import { Draw, Marker } from './Sketch';

export default function Finale() {
    const { t } = useLanguage();

    return (
        <section id="finale" className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28" aria-labelledby="mk-finale-title">
            <h2 id="mk-finale-title" className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                {t('mk.finale.title.pre')} <Marker>{t('mk.finale.title.mark')}</Marker>
            </h2>
            {/* The last stroke of the whole page: a hand-drawn underline that finishes the picture. */}
            <Draw
                paths={['M6 24 C60 8 140 32 230 14 C270 8 290 14 294 18', 'M240 34 C262 30 280 30 292 26']}
                viewBox="0 0 300 40"
                className="mx-auto mt-2 h-8 w-64 max-w-full sm:w-80"
                pathClassName="stroke-accent stroke-[4]"
                delay={3}
            />
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">{t('mk.finale.body')}</p>
            <div className="mt-8 flex flex-col items-center gap-3">
                <Link
                    href="/contact#beta"
                    className="btn-shimmer inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                    {t('mk.finale.cta')}
                </Link>
                <p className="mk-note text-sm text-muted-foreground">{t('mk.finale.honest')}</p>
            </div>
        </section>
    );
}
