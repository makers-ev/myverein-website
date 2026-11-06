'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Monitor, Smartphone, MonitorSmartphone } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import Reveal from '@/components/Reveal';
import { useLanguage } from '@/contexts/LanguageContext';
import { localizeDeEn } from '@/contexts/supportedLanguages';

import { BUILT_FEATURE_AREAS, type BuiltPlatform } from './builtFeaturesData';

const PLATFORM_ICONS: Record<BuiltPlatform, typeof Monitor> = {
    web: Monitor,
    app: Smartphone,
    both: MonitorSmartphone,
};

type Filter = 'all' | 'web' | 'app';
const FILTERS: Filter[] = ['all', 'web', 'app'];

function PlatformBadge({ platform }: { platform: BuiltPlatform }) {
    const { t } = useLanguage();
    const Icon = PLATFORM_ICONS[platform];

    return (
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            {t(`features.platform.${platform}`)}
        </span>
    );
}

export default function FeaturesPageContent() {
    const { language, t } = useLanguage();
    const [filter, setFilter] = useState<Filter>('all');

    // "both" ships on web and app, so it matches either filter.
    const areas = BUILT_FEATURE_AREAS.map((area) => ({
        ...area,
        capabilities: area.capabilities.filter((c) => filter === 'all' || c.platform === 'both' || c.platform === filter),
    })).filter((area) => area.capabilities.length > 0);

    return (
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
            <PageHeader title={t('features.title')} intro={t('features.intro')} />

            <div role="tablist" className="mt-10 inline-flex gap-1 rounded-xl border border-border bg-card p-1">
                {FILTERS.map((f) => (
                    <button
                        key={f}
                        type="button"
                        role="tab"
                        aria-selected={filter === f}
                        onClick={() => setFilter(f)}
                        className={`min-h-11 rounded-lg px-4 text-sm font-medium transition-colors active:scale-[0.98] ${
                            filter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                        {f === 'all' ? t('features.filter-all') : t(`features.platform.${f}`)}
                    </button>
                ))}
            </div>

            <div key={filter} className="mt-8 gap-4 sm:columns-2">
                {areas.map((area, i) => (
                    <Reveal key={area.id} delay={(i % 2) * 60} className="mb-4 break-inside-avoid">
                        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                            <div className="flex items-center gap-3">
                                <area.icon className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} aria-hidden="true" />
                                <h2 className="flex-1 text-base font-semibold text-foreground">{localizeDeEn(area.title, language)}</h2>
                                <span className="font-mono text-xs text-muted-foreground">{area.capabilities.length}</span>
                            </div>
                            <ul className="mt-4 divide-y divide-border">
                                {area.capabilities.map((capability, index) => (
                                    <li key={index} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                                        <span className="text-sm text-foreground">{localizeDeEn(capability.label, language)}</span>
                                        <PlatformBadge platform={capability.platform} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </Reveal>
                ))}
            </div>

            <Reveal className="mt-8">
                <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-dashed border-muted-foreground/60 p-6 sm:flex-row sm:items-center">
                    <p className="text-sm text-muted-foreground">{t('features.roadmap-teaser')}</p>
                    <Link
                        href="/roadmap"
                        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                        {t('features.roadmap-teaser-link')}
                        <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                    </Link>
                </div>
            </Reveal>
        </div>
    );
}
