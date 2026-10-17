'use client';

import Link from 'next/link';

import { useLanguage } from '@/contexts/LanguageContext';

import { outOfScopeItems, roadmapGroups, soonItems } from './marketingData';
import { Marker, PaperCard, StatusSketch } from './Sketch';

export default function RoadmapSketches() {
    const { t } = useLanguage();
    const groups = roadmapGroups.map((group) => [group, soonItems.filter((item) => item.group === group)] as const).filter(([, items]) => items.length > 0);

    return (
        <section id="roadmap-teaser" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="mk-road-title">
            <h2 id="mk-road-title" className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                {t('mk.road.title.pre')} <Marker>{t('mk.road.title.mark')}</Marker>
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">{t('mk.road.intro')}</p>

            <div className="mt-10 space-y-10">
                {groups.map(([group, items]) => (
                    <div key={group}>
                        <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">{t(`mk.road.group.${group}`)}</h3>
                        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {items.map((item) => (
                                <StatusSketch key={item.id} as="li" status={item.status} className="h-full">
                                    <h4 className="font-bold">{t(`${item.i18nKey}.title`)}</h4>
                                    <p className="mt-1.5 text-sm leading-relaxed">{t(`${item.i18nKey}.body`)}</p>
                                </StatusSketch>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="mt-12 grid items-start gap-8 lg:grid-cols-[1fr_auto]">
                <PaperCard tilt="l" tape>
                    <h3 className="text-xl font-bold text-foreground">{t('mk.road.billing.title')}</h3>
                    <p className="mt-2 leading-relaxed text-muted-foreground">{t('mk.road.billing.body')}</p>
                    <ul className="mt-4 flex flex-wrap gap-2">
                        {outOfScopeItems.map((item) => (
                            <li key={item.id} className="rounded-full border border-border bg-muted px-3 py-1 text-sm text-foreground">
                                {t(`${item.i18nKey}.title`)}
                            </li>
                        ))}
                    </ul>
                </PaperCard>
                <Link
                    href="/roadmap"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-6 py-3 font-semibold text-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                    {t('mk.road.link')}
                </Link>
            </div>
        </section>
    );
}
