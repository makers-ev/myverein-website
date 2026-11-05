'use client';

import Link from 'next/link';
import { CircleDot, Loader, CircleCheck, Search, Wrench, ArrowRight } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { localizeDeEn } from '@/contexts/supportedLanguages';

import { ROADMAP_ITEMS, type RoadmapStatus, type RoadmapType } from './roadmapData';
import { KNOWN_BUGS, type BugStatus } from './knownBugsData';

const STATUS_STYLES: Record<RoadmapStatus, { icon: typeof CircleDot; className: string }> = {
    planned: { icon: CircleDot, className: 'text-muted-foreground' },
    'in-progress': { icon: Loader, className: 'text-foreground' },
    done: { icon: CircleCheck, className: 'text-success' },
};

function StatusBadge({ status }: { status: RoadmapStatus }) {
    const { t } = useLanguage();
    const { icon: Icon, className } = STATUS_STYLES[status];

    return (
        <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium ${className}`}>
            <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            {t(`roadmap.status.${status}`)}
        </span>
    );
}

const TYPE_STYLES: Record<RoadmapType, string> = {
    feature: 'text-muted-foreground',
    fix: 'text-muted-foreground',
};

function TypeTag({ type }: { type: RoadmapType }) {
    const { t } = useLanguage();

    return (
        <span className={`inline-block text-xs font-medium ${TYPE_STYLES[type]}`}>
            {t(`roadmap.type.${type}`)}
        </span>
    );
}

const BUG_STATUS_STYLES: Record<BugStatus, { icon: typeof CircleDot; className: string }> = {
    open: { icon: CircleDot, className: 'text-muted-foreground' },
    investigating: { icon: Search, className: 'text-foreground' },
    'fix-in-progress': { icon: Wrench, className: 'text-foreground' },
};

function BugStatusBadge({ status }: { status: BugStatus }) {
    const { t } = useLanguage();
    const { icon: Icon, className } = BUG_STATUS_STYLES[status];

    return (
        <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium ${className}`}>
            <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            {t(`roadmap.bugs.status.${status}`)}
        </span>
    );
}

export default function RoadmapPageContent() {
    const { language, t } = useLanguage();

    // Group consecutive-by-sortKey items sharing a `period` label under one heading,
    // in ascending order.
    const sortedItems = [...ROADMAP_ITEMS].sort((a, b) => a.sortKey - b.sortKey);
    const periods: { period: string; items: typeof sortedItems }[] = [];
    for (const item of sortedItems) {
        const lastGroup = periods[periods.length - 1];
        if (lastGroup && lastGroup.period === item.period) {
            lastGroup.items.push(item);
        } else {
            periods.push({ period: item.period, items: [item] });
        }
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
            <PageHeader title={t('roadmap.title')} intro={t('roadmap.intro')} />

            {periods.length === 0 ? (
                <div className="mt-8 rounded-xl border border-border bg-card p-4">
                    <p className="text-sm text-muted-foreground">{t('roadmap.empty')}</p>
                </div>
            ) : (
                <ol className="mt-12 border-t border-border">
                    {periods.map((group) => (
                        <li key={group.period} className="grid gap-4 border-b border-border py-8 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-10">
                            <h2 className="text-lg font-semibold leading-snug text-foreground">{group.period}</h2>
                            <ul className="space-y-3">
                                {group.items.map((item) => (
                                    <li key={item.id} className="rounded-xl border border-border bg-card p-5 shadow-xs">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex min-w-0 items-start gap-3">
                                                <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                                                <div className="min-w-0">
                                                    <TypeTag type={item.type} />
                                                    <p className="font-medium text-foreground">{localizeDeEn(item.title, language)}</p>
                                                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{localizeDeEn(item.description, language)}</p>
                                                </div>
                                            </div>
                                            <StatusBadge status={item.status} />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ol>
            )}

            <section className="mt-14">
                <h2 className="mb-5 text-xl font-semibold text-foreground">{t('roadmap.bugs.title')}</h2>

                {KNOWN_BUGS.length === 0 ? (
                    <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-sm text-muted-foreground">{t('roadmap.bugs.empty')}</p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {KNOWN_BUGS.map((bug) => (
                            <li key={bug.id} className="rounded-xl border border-border bg-card p-5 shadow-xs">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <bug.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
                                        <div>
                                            <p className="font-medium text-foreground">{localizeDeEn(bug.title, language)}</p>
                                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{localizeDeEn(bug.description, language)}</p>
                                        </div>
                                    </div>
                                    <BugStatusBadge status={bug.status} />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="mt-4 flex flex-col items-start justify-between gap-3 rounded-xl border border-dashed border-muted-foreground/60 p-5 sm:flex-row sm:items-center">
                    <p className="text-sm text-muted-foreground">{t('roadmap.bugs.report-info')}</p>
                    <Link
                        href="/contact#bug"
                        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                        {t('roadmap.bugs.report-link')}
                        <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                    </Link>
                </div>
            </section>
        </div>
    );
}
