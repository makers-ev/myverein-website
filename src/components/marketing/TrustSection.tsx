'use client';

import { useLanguage } from '@/contexts/LanguageContext';

import { getItem } from './marketingData';
import { Draw, Marker, PaperCard, StatusBadge, StatusSketch, type Tilt } from './Sketch';

const POINTS: { id: string; tilt: Tilt }[] = [
    { id: 'rights-deny-default', tilt: 'l' },
    { id: 'profile-photo-minors', tilt: 'r' },
    { id: 'signed-links', tilt: 'r' },
    { id: 'sensitive-audit', tilt: 'l' },
    { id: 'consents', tilt: 'r' },
    { id: 'privacy-tools', tilt: 'l' },
];

/** Paper-cut padlock with a keyhole; the accent ring around it is drawn once scrolled into view. */
function LockCollage() {
    const { t } = useLanguage();
    return (
        <div className="mk-trust relative mx-auto w-40 shrink-0 sm:w-48">
            <svg viewBox="0 0 160 180" role="img" aria-label={t('mk.trust.lock.alt')} className="w-full overflow-visible">
                <path d="M45 82 V52 a35 35 0 0 1 70 0 V82" fill="none" strokeLinecap="round" className="mk-shackle stroke-muted-foreground stroke-[10]" />
                <rect x={29} y={84} width={110} height={88} rx={6} className="fill-foreground/15" />
                <rect x={25} y={80} width={110} height={88} rx={6} className="fill-primary" />
                <rect x={52} y={72} width={56} height={14} rx={1} className="fill-accent/50" transform="rotate(-3 80 79)" />
                <circle cx={80} cy={114} r={11} className="fill-card" />
                <path d="M74 122 L86 122 L89 148 L71 148 Z" className="fill-card" />
            </svg>
            <Draw
                paths="M14 98 C10 40 40 6 82 4 C130 2 156 40 150 100 C146 150 118 178 78 176 C40 174 18 150 14 98"
                viewBox="0 0 160 180"
                className="pointer-events-none absolute inset-0 size-full overflow-visible"
                pathClassName="stroke-accent stroke-[3]"
                delay={2}
            />
        </div>
    );
}

export default function TrustSection() {
    const { t } = useLanguage();
    const consents = getItem('consents');

    return (
        <section id="vertrauen" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24" aria-labelledby="mk-trust-title">
            <div className="flex flex-col items-center gap-8 text-center sm:flex-row sm:text-left">
                <LockCollage />
                <div>
                    <h2 id="mk-trust-title" className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                        {t('mk.trust.title.pre')} <Marker>{t('mk.trust.title.mark')}</Marker>
                    </h2>
                    <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">{t('mk.trust.intro')}</p>
                </div>
            </div>

            <ul className="mt-12 grid gap-6 sm:grid-cols-2">
                {POINTS.map(({ id, tilt }) => {
                    const item = getItem(id);
                    return (
                        <li key={id}>
                            <PaperCard tilt={tilt} tape className="h-full">
                                <StatusBadge status={item.status} className="mb-3" />
                                <h3 className="text-lg font-bold text-foreground">{t(`${item.i18nKey}.title`)}</h3>
                                <p className="mt-2 leading-relaxed text-muted-foreground">{t(`${item.i18nKey}.body`)}</p>
                                <p className="mk-note mt-3 border-t border-dashed border-border pt-3 text-sm text-foreground">
                                    {t(`mk.trust.check.${id}`)}
                                </p>
                            </PaperCard>
                        </li>
                    );
                })}
            </ul>

            <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted-foreground">{t('mk.trust.honest')}</p>

            {consents.status === 'soon' && (
                <StatusSketch status="soon" className="mx-auto mt-8 max-w-2xl">
                    <h3 className="text-lg font-bold">{t('mk.trust.soon.title')}</h3>
                    <p className="mt-2 leading-relaxed">{t('mk.trust.soon.body')}</p>
                </StatusSketch>
            )}
        </section>
    );
}
