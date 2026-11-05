'use client';

import Link from 'next/link';

import { useLanguage } from '@/contexts/LanguageContext';

import { Draw, Marker } from './Sketch';

export default function Finale() {
    const { t } = useLanguage();

    return (
        <section id="finale" className="border-t border-border" aria-labelledby="mk-finale-title">
            <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 sm:py-32">
                <h2 id="mk-finale-title" className="font-display text-5xl leading-[1.05] text-foreground sm:text-6xl">
                    {t('mk.finale.title.pre')} <Marker>{t('mk.finale.title.mark')}</Marker>
                </h2>
                {/* The last stroke of the whole page: a hand-drawn underline that finishes the picture. */}
                <Draw
                    paths={['M6 24 C60 8 140 32 230 14 C270 8 290 14 294 18', 'M240 34 C262 30 280 30 292 26']}
                    viewBox="0 0 300 40"
                    className="mx-auto mt-3 h-8 w-64 max-w-full sm:w-80"
                    pathClassName="stroke-accent stroke-[3]"
                    delay={3}
                />
                <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground">{t('mk.finale.body')}</p>
                <div className="mt-8 flex flex-col items-center gap-3">
                    <Link
                        href="/contact#beta"
                        className="inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                        {t('mk.finale.cta')}
                    </Link>
                    <p className="text-sm text-muted-foreground">{t('mk.finale.honest')}</p>
                </div>
            </div>
        </section>
    );
}
