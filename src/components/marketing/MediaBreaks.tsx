'use client';

import { useLanguage } from '@/contexts/LanguageContext';

import { ToolIcon, type ToolId } from './HeroScene';
import { getItem } from './marketingData';
import { MK_SECTION, SectionHead, StatusSketch } from './Sketch';
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
        <section aria-labelledby="mk-breaks-title" className={MK_SECTION}>
            <SectionHead id="mk-breaks-title" title={t('mk.breaks.title')} intro={t('mk.breaks.intro')} />

            <div ref={ref} className={`${stateClass} mt-12 overflow-x-clip`}>
                <div className="rounded-3xl border border-border bg-muted/50 p-4 sm:p-6">
                    <p className="mb-4 px-1 text-lg font-semibold text-foreground">{t('mk.breaks.app')}</p>
                    <ul className="grid gap-4 md:grid-cols-6">
                        {BREAKS.map(({ tool, item }, i) => {
                            const entry = getItem(item);
                            return (
                                <li key={tool} className={`mk-b1-fly mk-b1-fly-${i + 1} mk-d${i + 1} ${i < 3 ? 'md:col-span-2' : 'md:col-span-3'}`}>
                                    <StatusSketch status={entry.status} className="h-full">
                                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <ToolIcon tool={tool} className="size-6" />
                                            <span>
                                                {t('mk.breaks.from')} <span className="font-medium">{t(`mk.hero.obj.${tool}`)}</span>
                                            </span>
                                        </p>
                                        <h3 className="mt-4 text-lg font-semibold leading-snug">
                                            <span className="sr-only">{t('mk.breaks.to')} </span>
                                            {t(`${entry.i18nKey}.title`)}
                                        </h3>
                                        <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">{t(`${entry.i18nKey}.body`)}</p>
                                    </StatusSketch>
                                </li>
                            );
                        })}
                    </ul>
                </div>
                <p className="mt-4 max-w-2xl text-sm text-muted-foreground">{t('mk.breaks.legend')}</p>
            </div>
        </section>
    );
}
