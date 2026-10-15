'use client';

import { useLanguage } from '@/contexts/LanguageContext';

import { ToolIcon, type ToolId } from './HeroScene';
import { getItem } from './marketingData';
import { Marker, PaperCard, StatusSketch } from './Sketch';
import { useInView } from './useInView';

// Which MyVerein feature takes over from which classic tool. Status and wave come from marketingData, so flipping an
// item to 'live' there turns the dashed sketch into ink here.
const BREAKS: { tool: ToolId; item: string }[] = [
    { tool: 'excel', item: 'csv-import-export' },
    { tool: 'doodle', item: 'scheduling-poll' },
    { tool: 'whatsapp', item: 'broadcast' },
    { tool: 'zettel', item: 'bulletin-board' },
    { tool: 'anwesenheit', item: 'training-attendance' },
];

/** Chapter 1: five classic tools fly into one app card as the section scrolls into view. */
export default function MediaBreaks() {
    const { t } = useLanguage();
    const { ref, stateClass } = useInView<HTMLDivElement>({ threshold: 0.25 });

    return (
        <section aria-labelledby="mk-breaks-title" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
            <h2 id="mk-breaks-title" className="text-center text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                <Marker>{t('mk.breaks.title')}</Marker>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-lg leading-relaxed text-muted-foreground">{t('mk.breaks.intro')}</p>

            <div ref={ref} className={`${stateClass} mt-10 overflow-x-clip px-1 py-3`}>
                <PaperCard className="mx-auto max-w-3xl p-4 sm:p-6">
                    <p className="mb-4 text-xl font-extrabold text-foreground">{t('mk.breaks.app')}</p>
                    <ul className="grid gap-4 sm:grid-cols-2">
                        {BREAKS.map(({ tool, item }, i) => {
                            const entry = getItem(item);
                            return (
                                <li key={tool} className={`mk-b1-fly mk-b1-fly-${i + 1} mk-d${i + 1} sm:last:col-span-2`}>
                                    <StatusSketch status={entry.status} wave={entry.wave} className="h-full">
                                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <ToolIcon tool={tool} className="size-6" />
                                            <span>
                                                {t('mk.breaks.from')} <span className="font-semibold">{t(`mk.hero.obj.${tool}`)}</span>
                                            </span>
                                        </p>
                                        <h3 className="mt-3 text-base font-bold">
                                            <span className="sr-only">{t('mk.breaks.to')} </span>
                                            {t(`${entry.i18nKey}.title`)}
                                        </h3>
                                        <p className="mt-1 text-sm leading-relaxed">{t(`${entry.i18nKey}.body`)}</p>
                                    </StatusSketch>
                                </li>
                            );
                        })}
                    </ul>
                </PaperCard>
                <p className="mk-note mx-auto mt-4 max-w-2xl text-center text-sm text-muted-foreground">{t('mk.breaks.legend')}</p>
            </div>
        </section>
    );
}
