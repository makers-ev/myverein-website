'use client';

import { useLanguage } from '@/contexts/LanguageContext';

import { getItem } from './marketingData';
import { Draw, MK_SECTION, PaperCard, SectionHead, StatusBadge, StatusSketch } from './Sketch';

const POINTS: { id: string }[] = [
    { id: 'rights-deny-default' },
    { id: 'profile-photo-minors' },
    { id: 'signed-links' },
    { id: 'sensitive-audit' },
    { id: 'consents' },
    { id: 'privacy-tools' },
];

/** Paper-cut padlock with a keyhole; the accent ring around it is drawn once scrolled into view. */
function LockCollage() {
    const { t } = useLanguage();
    return (
        <div className="mk-trust relative w-32 shrink-0 sm:w-40">
            <svg viewBox="0 0 160 180" role="img" aria-label={t('mk.trust.lock.alt')} className="w-full overflow-visible">
                <path d="M45 82 V52 a35 35 0 0 1 70 0 V82" fill="none" strokeLinecap="round" className="mk-shackle stroke-muted-foreground stroke-[10]" />
                                <rect x={25} y={80} width={110} height={88} rx={6} className="fill-primary" />
                                <circle cx={80} cy={114} r={11} className="fill-card" />
                <path d="M74 122 L86 122 L89 148 L71 148 Z" className="fill-card" />
            </svg>
            <Draw
                paths="M14 98 C10 40 40 6 82 4 C130 2 156 40 150 100 C146 150 118 178 78 176 C40 174 18 150 14 98"
                viewBox="0 0 160 180"
                className="pointer-events-none absolute inset-0 size-full overflow-visible"
                pathClassName="stroke-accent stroke-[2]"
                delay={2}
            />
        </div>
    );
}

export default function TrustSection() {
    const { t } = useLanguage();
    const consents = getItem('consents');

    return (
        <section id="vertrauen" className={MK_SECTION} aria-labelledby="mk-trust-title">
            <div className="flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:gap-12">
                <LockCollage />
                <SectionHead id="mk-trust-title" title={`${t('mk.trust.title.pre')} ${t('mk.trust.title.mark')}`} intro={t('mk.trust.intro')} />
            </div>

            <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {POINTS.map(({ id }) => {
                    const item = getItem(id);
                    return (
                        <li key={id}>
                            <PaperCard className="flex h-full flex-col">
                                <StatusBadge status={item.status} className="mb-3" />
                                <h3 className="text-lg font-semibold text-foreground">{t(`${item.i18nKey}.title`)}</h3>
                                <p className="mt-2 flex-1 leading-relaxed text-muted-foreground">{t(`${item.i18nKey}.body`)}</p>
                                <p className="mt-4 border-t border-border pt-3 text-sm text-foreground">{t(`mk.trust.check.${id}`)}</p>
                            </PaperCard>
                        </li>
                    );
                })}
            </ul>

            <p className="mt-8 max-w-2xl text-sm text-muted-foreground">{t('mk.trust.honest')}</p>

            {consents.status === 'soon' && (
                <StatusSketch status="soon" className="mt-6 max-w-2xl">
                    <h3 className="text-lg font-semibold">{t('mk.trust.soon.title')}</h3>
                    <p className="mt-2 leading-relaxed">{t('mk.trust.soon.body')}</p>
                </StatusSketch>
            )}
        </section>
    );
}
