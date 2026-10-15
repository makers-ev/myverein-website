'use client';

import { useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';

import { getItem } from './marketingData';
import { Draw, Marker, PaperCard, StatusSketch } from './Sketch';

const CLUBS: { id: string; prop: string[] }[] = [
    { id: 'sport', prop: ['M6 20 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0', 'M6 20 h28 M20 6 v28'] },
    { id: 'chor', prop: ['M12 32 a5 4 0 1 0 10 0 a5 4 0 1 0 -10 0', 'M22 32 V8 q9 2 9 12'] },
    { id: 'feuerwehr', prop: ['M8 26 q0 -16 12 -16 q12 0 12 16 z', 'M4 26 h32 M20 10 v-4'] },
    { id: 'schach', prop: ['M16 10 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0', 'M16 16 h8 l3 14 h-14 z', 'M10 32 h20'] },
    { id: 'tanz', prop: ['M12 8 v18 h20 q0 -7 -9 -9 l-5 -9 z', 'M8 32 h26'] },
    { id: 'schuetzen', prop: ['M5 20 a15 15 0 1 0 30 0 a15 15 0 1 0 -30 0', 'M13 20 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0', 'M20 20 L35 5'] },
    { id: 'kleingarten', prop: ['M20 36 V16', 'M15 11 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0', 'M20 28 q9 -2 9 -9', 'M20 30 q-9 -2 -9 -9'] },
    { id: 'musik', prop: ['M6 18 h28 v14 h-28 z', 'M6 18 q14 -6 28 0', 'M12 6 l8 12 M28 6 l-8 12'] },
];

const LISTS = [
    { key: 'cat', item: 'categories' },
    { key: 'dep', item: 'departments' },
    { key: 'rol', item: 'rights-deny-default' },
] as const;

export default function ClubTypes() {
    const { t } = useLanguage();
    const [clubId, setClubId] = useState('sport');
    const club = CLUBS.find((c) => c.id === clubId) ?? CLUBS[0];
    const forms = getItem('custom-forms');

    return (
        <section id="vielfalt" aria-labelledby="vielfalt-title" className="scroll-mt-20 px-4 py-16 sm:px-6">
            <div className="mx-auto max-w-5xl">
                <h2 id="vielfalt-title" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    {t('mk.clubs.title.before')} <Marker>{t('mk.clubs.title.marked')}</Marker>
                </h2>
                <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{t('mk.clubs.intro')}</p>

                <div role="group" aria-label={t('mk.clubs.pick')} className="mt-8 flex flex-wrap gap-2">
                    {CLUBS.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            aria-pressed={clubId === c.id}
                            onClick={() => setClubId(c.id)}
                            className={`min-h-11 rounded-full border-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                                clubId === c.id ? 'border-foreground/70 bg-accent text-accent-foreground' : 'border-border bg-card text-foreground hover:bg-muted'
                            }`}
                        >
                            {t(`mk.clubs.${c.id}.name`)}
                        </button>
                    ))}
                </div>

                <div aria-live="polite" className="mt-6">
                    <PaperCard tape className="pt-8">
                        <div className="flex items-center gap-4">
                            <Draw key={club.id} paths={club.prop} viewBox="0 0 40 40" className="size-14 shrink-0" pathClassName="stroke-accent stroke-[2.5]" />
                            <div>
                                <h3 className="text-xl font-bold text-foreground">{t(`mk.clubs.${club.id}.name`)}</h3>
                                <p className="text-muted-foreground">{t(`mk.clubs.${club.id}.scene`)}</p>
                            </div>
                        </div>
                        <div className="mt-5 grid gap-4 md:grid-cols-3">
                            {LISTS.map(({ key, item }) => (
                                <div key={key} className="rounded-md border border-border bg-background p-4">
                                    <h4 className="font-semibold text-foreground">{t(`mk.clubs.list.${key}`)}</h4>
                                    <ul className="mt-2 list-inside list-disc space-y-1 text-foreground">
                                        {[1, 2, 3].map((n) => (
                                            <li key={n}>{t(`mk.clubs.${club.id}.${key}${n}`)}</li>
                                        ))}
                                    </ul>
                                    <p className="mt-3 text-sm text-muted-foreground">{t(`${getItem(item).i18nKey}.title`)}</p>
                                </div>
                            ))}
                        </div>
                    </PaperCard>
                </div>

                <StatusSketch status={forms.status} wave={forms.wave} className="mt-6">
                    <p className="font-semibold text-foreground">{t(`${forms.i18nKey}.title`)}</p>
                    <p className="text-muted-foreground">{t('mk.clubs.forms')}</p>
                </StatusSketch>
            </div>
        </section>
    );
}
