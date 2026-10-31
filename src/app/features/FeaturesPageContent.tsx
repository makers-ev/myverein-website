'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LayoutGrid, Monitor, Smartphone, MonitorSmartphone, Sparkles } from 'lucide-react';

import Reveal from '@/components/Reveal';
import { useLanguage } from '@/contexts/LanguageContext';
import { localizeDeEn } from '@/contexts/supportedLanguages';

import { BUILT_FEATURE_AREAS, type BuiltPlatform } from './builtFeaturesData';

const PLATFORM_STYLES: Record<BuiltPlatform, { icon: typeof Monitor; className: string }> = {
    web: { icon: Monitor, className: 'bg-muted text-muted-foreground' },
    app: { icon: Smartphone, className: 'bg-muted text-muted-foreground' },
    both: { icon: MonitorSmartphone, className: 'bg-primary/10 text-primary' },
};

type Filter = 'all' | 'web' | 'app';
const FILTERS: Filter[] = ['all', 'web', 'app'];

function PlatformBadge({ platform }: { platform: BuiltPlatform }) {
    const { t } = useLanguage();
    const { icon: Icon, className } = PLATFORM_STYLES[platform];

    return (
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
            <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
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
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl bg-primary/10 px-6 py-12 text-center sm:px-12">
                <div aria-hidden className="animate-drift absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/15" />
                <div aria-hidden className="animate-drift absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-accent/15 [animation-delay:-7s]" />
                <div className="relative">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-card shadow-sm">
                        <LayoutGrid className="h-6 w-6 text-primary" strokeWidth={2.25} />
                    </div>
                    <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">{t('features.title')}</h1>
                    <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{t('features.intro')}</p>
                </div>
            </div>

            <div role="tablist" className="mt-8 flex justify-center gap-2">
                {FILTERS.map((f) => (
                    <button
                        key={f}
                        type="button"
                        role="tab"
                        aria-selected={filter === f}
                        onClick={() => setFilter(f)}
                        className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                            filter === f
                                ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                        {f === 'all' ? t('features.filter-all') : t(`features.platform.${f}`)}
                    </button>
                ))}
            </div>

            <div key={filter} className="mt-8 grid gap-4 sm:grid-cols-2">
                {areas.map((area, i) => (
                    <Reveal key={area.id} delay={(i % 2) * 80} className="h-full">
                        <div className="group h-full rounded-2xl border border-border bg-card p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 transition duration-300 group-hover:rotate-6 group-hover:scale-110">
                                    <area.icon className="h-5 w-5 text-primary" strokeWidth={2.25} />
                                </div>
                                <h2 className="flex-1 font-semibold text-foreground">{localizeDeEn(area.title, language)}</h2>
                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                                    {area.capabilities.length}
                                </span>
                            </div>
                            <ul className="mt-3 divide-y divide-border">
                                {area.capabilities.map((capability, index) => (
                                    <li key={index} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                                        <span className="text-sm text-muted-foreground">{localizeDeEn(capability.label, language)}</span>
                                        <PlatformBadge platform={capability.platform} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </Reveal>
                ))}
            </div>

            <Reveal className="mt-8">
                <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5 sm:flex-row sm:items-center">
                    <p className="text-sm text-muted-foreground">{t('features.roadmap-teaser')}</p>
                    <Link
                        href="/roadmap"
                        className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary hover:brightness-110"
                    >
                        <Sparkles className="h-4 w-4" />
                        {t('features.roadmap-teaser-link')}
                    </Link>
                </div>
            </Reveal>
        </div>
    );
}
