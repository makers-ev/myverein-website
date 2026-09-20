'use client';

import Link from 'next/link';
import { LayoutGrid, Monitor, Smartphone, MonitorSmartphone, Sparkles } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { localizeDeEn } from '@/contexts/supportedLanguages';

import { BUILT_FEATURE_AREAS, type BuiltPlatform } from './builtFeaturesData';

const PLATFORM_STYLES: Record<BuiltPlatform, { icon: typeof Monitor; className: string }> = {
    web: { icon: Monitor, className: 'bg-muted text-muted-foreground' },
    app: { icon: Smartphone, className: 'bg-muted text-muted-foreground' },
    both: { icon: MonitorSmartphone, className: 'bg-primary/10 text-primary' },
};

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

    return (
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                    <LayoutGrid className="h-5 w-5 text-primary" strokeWidth={2.25} />
                </div>
                <h1 className="text-2xl font-bold text-foreground">{t('features.title')}</h1>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{t('features.intro')}</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {BUILT_FEATURE_AREAS.map((area) => (
                    <div key={area.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                <area.icon className="h-5 w-5 text-primary" strokeWidth={2.25} />
                            </div>
                            <h2 className="font-semibold text-foreground">{localizeDeEn(area.title, language)}</h2>
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
                ))}
            </div>

            <div className="mt-8 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border p-4">
                <p className="text-sm text-muted-foreground">{t('features.roadmap-teaser')}</p>
                <Link
                    href="/roadmap"
                    className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary hover:brightness-110"
                >
                    <Sparkles className="h-4 w-4" />
                    {t('features.roadmap-teaser-link')}
                </Link>
            </div>
        </div>
    );
}
