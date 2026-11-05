'use client';

import Link from 'next/link';

import { useLanguage } from '@/contexts/LanguageContext';

import { outOfScopeItems, roadmapGroups, soonItems } from './marketingData';
import { MK_SECTION, PaperCard, SectionHead, StatusSketch } from './Sketch';

export default function RoadmapSketches() {
    const { t } = useLanguage();
    const groups = roadmapGroups.map((group) => [group, soonItems.filter((item) => item.group === group)] as const).filter(([, items]) => items.length > 0);

    return (
        <section id="roadmap-teaser" className="border-t border-border" aria-labelledby="mk-road-title">
            <div className={MK_SECTION}>
                <SectionHead id="mk-road-title" title={`${t('mk.road.title.pre')} ${t('mk.road.title.mark')}`} intro={t('mk.road.intro')} />

                <div className="mt-12 space-y-10">
                    {groups.map(([group, items]) => (
                        <div key={group}>
                            <h3 className="mb-4 text-sm font-medium text-muted-foreground">{t(`mk.road.group.${group}`)}</h3>
                            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {items.map((item) => (
                                    <StatusSketch key={item.id} as="li" status={item.status} className="h-full">
                                        <h4 className="font-semibold">{t(`${item.i18nKey}.title`)}</h4>
                                        <p className="mt-1.5 text-sm leading-relaxed">{t(`${item.i18nKey}.body`)}</p>
                                    </StatusSketch>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-12 grid items-start gap-6 lg:grid-cols-[1fr_auto]">
                    <PaperCard>
                        <h3 className="text-xl font-semibold text-foreground">{t('mk.road.billing.title')}</h3>
                        <p className="mt-2 max-w-2xl leading-relaxed text-muted-foreground">{t('mk.road.billing.body')}</p>
                        <ul className="mt-4 flex flex-wrap gap-2">
                            {outOfScopeItems.map((item) => (
                                <li key={item.id} className="rounded-md border border-border bg-muted px-2.5 py-1 text-sm text-foreground">
                                    {t(`${item.i18nKey}.title`)}
                                </li>
                            ))}
                        </ul>
                    </PaperCard>
                    <Link
                        href="/roadmap"
                        className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-card px-6 text-base font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                        {t('mk.road.link')}
                    </Link>
                </div>
            </div>
        </section>
    );
}
