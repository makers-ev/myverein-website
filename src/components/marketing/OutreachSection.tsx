'use client';

import { useLanguage } from '@/contexts/LanguageContext';

import { getItem, outreachItemIds } from './marketingData';
import { MK_SECTION, SectionHead, StatusSketch } from './Sketch';

/** Home page chapter "Dein Verein nach außen": public club page, enquiries, sponsors, federation report and external access. */
export default function OutreachSection() {
    const { t } = useLanguage();

    return (
        <section id="aussenwirkung" className="border-t border-hairline" aria-labelledby="mk-out-title">
            <div className={MK_SECTION}>
                <SectionHead id="mk-out-title" title={`${t('mk.out.title.pre')} ${t('mk.out.title.mark')}`} intro={t('mk.out.intro')} />
                <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {outreachItemIds.map((id) => {
                        const item = getItem(id);
                        return (
                            <StatusSketch key={id} as="li" status={item.status} className="h-full">
                                <h3 className="font-semibold">{t(`${item.i18nKey}.title`)}</h3>
                                <p className="mt-1.5 text-sm leading-relaxed">{t(`${item.i18nKey}.body`)}</p>
                            </StatusSketch>
                        );
                    })}
                </ul>
                <p className="mt-6 text-sm text-muted-foreground">{t('mk.out.note')}</p>
            </div>
        </section>
    );
}
