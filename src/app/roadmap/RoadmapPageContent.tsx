'use client';

// import Link from 'next/link';
import { Map, CircleDot, Loader, CircleCheck, Bug, Search, Wrench /*, ArrowRight */ } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { localizeDeEn } from '@/contexts/supportedLanguages';

import { ROADMAP_ITEMS, type RoadmapStatus, type RoadmapType } from './roadmapData';
import { KNOWN_BUGS, type BugStatus } from './knownBugsData';

const STATUS_STYLES: Record<RoadmapStatus, { icon: typeof CircleDot; className: string }> = {
    planned: { icon: CircleDot, className: 'bg-muted text-muted-foreground' },
    'in-progress': { icon: Loader, className: 'bg-warning/15 text-warning' },
    done: { icon: CircleCheck, className: 'bg-success/15 text-success' },
};

function StatusBadge({ status }: { status: RoadmapStatus }) {
    const { t } = useLanguage();
    const { icon: Icon, className } = STATUS_STYLES[status];

    return (
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
            <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
            {t(`roadmap.status.${status}`)}
        </span>
    );
}

const TYPE_STYLES: Record<RoadmapType, string> = {
    feature: 'bg-primary/10 text-primary',
    fix: 'bg-destructive/10 text-destructive',
};

function TypeTag({ type }: { type: RoadmapType }) {
    const { t } = useLanguage();

    return (
        <span className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${TYPE_STYLES[type]}`}>
            {t(`roadmap.type.${type}`)}
        </span>
    );
}

const BUG_STATUS_STYLES: Record<BugStatus, { icon: typeof CircleDot; className: string }> = {
    open: { icon: CircleDot, className: 'bg-muted text-muted-foreground' },
    investigating: { icon: Search, className: 'bg-warning/15 text-warning' },
    'fix-in-progress': { icon: Wrench, className: 'bg-primary/15 text-primary' },
};

function BugStatusBadge({ status }: { status: BugStatus }) {
    const { t } = useLanguage();
    const { icon: Icon, className } = BUG_STATUS_STYLES[status];

    return (
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
            <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
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
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                    <Map className="h-5 w-5 text-primary" strokeWidth={2.25} />
                </div>
                <h1 className="text-2xl font-bold text-foreground">{t('roadmap.title')}</h1>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{t('roadmap.intro')}</p>

            {periods.length === 0 ? (
                <div className="mt-6 rounded-xl border border-border bg-card p-4">
                    <p className="text-sm text-muted-foreground">{t('roadmap.empty')}</p>
                </div>
            ) : (
                <ol className="mt-8">
                    {periods.map((group, groupIndex) => (
                        <li key={group.period} className="flex gap-4">
                            {/* Timeline gutter: dot + connecting line down to the next period. */}
                            <div className="flex w-4 shrink-0 flex-col items-center">
                                <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-primary ring-4 ring-primary/15" />
                                {groupIndex < periods.length - 1 && (
                                    <span className="mt-1 w-0.5 flex-1 bg-border" aria-hidden="true" />
                                )}
                            </div>

                            <div className="min-w-0 flex-1 pb-8">
                                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-foreground">
                                    {group.period}
                                </h2>
                                <div className="space-y-2.5">
                                    {group.items.map((item) => (
                                        <div key={item.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex min-w-0 items-start gap-3">
                                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                                        <item.icon className="h-5 w-5 text-primary" strokeWidth={2.25} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <TypeTag type={item.type} />
                                                        <p className="mt-1 font-semibold text-foreground">{localizeDeEn(item.title, language)}</p>
                                                        <p className="mt-1 text-sm text-muted-foreground">{localizeDeEn(item.description, language)}</p>
                                                    </div>
                                                </div>
                                                <StatusBadge status={item.status} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </li>
                    ))}
                </ol>
            )}

            <section className="mt-4 border-t border-border pt-8">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                    <Bug className="h-5 w-5 text-primary" strokeWidth={2.25} />
                    {t('roadmap.bugs.title')}
                </h2>

                {KNOWN_BUGS.length === 0 ? (
                    <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-sm text-muted-foreground">{t('roadmap.bugs.empty')}</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {KNOWN_BUGS.map((bug) => (
                            <div key={bug.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                            <bug.icon className="h-5 w-5 text-primary" strokeWidth={2.25} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-foreground">{localizeDeEn(bug.title, language)}</p>
                                            <p className="mt-1 text-sm text-muted-foreground">{localizeDeEn(bug.description, language)}</p>
                                        </div>
                                    </div>
                                    <BugStatusBadge status={bug.status} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Bug report link hidden on the public-only site (needs Link + ArrowRight imports).
                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border p-4">
                    <p className="text-sm text-muted-foreground">{t('roadmap.bugs.report-info')}</p>
                    <Link
                        href="/contact#bug"
                        className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary hover:brightness-110"
                    >
                        {t('roadmap.bugs.report-link')}
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
                */}
            </section>
        </div>
    );
}
