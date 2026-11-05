'use client';

import { dateLocale } from '@/lib/clubMembers';
import { Plus, Wrench, Bug } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { localizeDeEn } from '@/contexts/supportedLanguages';

import { CHANGELOG_RELEASES, type ChangelogChangeType } from './changelogData';

const TYPE_ICONS: Record<ChangelogChangeType, typeof Plus> = {
    feature: Plus,
    improvement: Wrench,
    fix: Bug,
};

export default function ChangelogPageContent() {
    const { language, t } = useLanguage();

    // Newest release first.
    const releases = [...CHANGELOG_RELEASES].sort((a, b) => b.date.localeCompare(a.date));

    return (
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
            <PageHeader title={t('changelog.title')} intro={t('changelog.intro')} />

            {releases.length === 0 ? (
                <div className="mt-8 rounded-xl border border-border bg-card p-4">
                    <p className="text-sm text-muted-foreground">{t('changelog.empty')}</p>
                </div>
            ) : (
                <ol className="mt-12 border-t border-border">
                    {releases.map((release) => (
                        <li key={release.id} className="grid gap-4 border-b border-border py-8 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-10">
                            <div>
                                <time dateTime={release.date} className="font-mono text-sm text-muted-foreground">
                                    {new Date(release.date).toLocaleDateString(dateLocale(language), {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                    })}
                                </time>
                                <h2 className="mt-1 text-lg font-semibold leading-snug text-foreground">{localizeDeEn(release.title, language)}</h2>
                            </div>

                            <ul className="space-y-5">
                                {release.changes.map((change, changeIndex) => {
                                    const Icon = TYPE_ICONS[change.type];
                                    return (
                                        <li key={changeIndex} className="flex gap-3">
                                            <Icon
                                                className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                                                strokeWidth={1.5}
                                                role="img"
                                                aria-label={t(`changelog.type.${change.type}`)}
                                            />
                                            <div className="min-w-0">
                                                <p className="font-medium text-foreground">{localizeDeEn(change.title, language)}</p>
                                                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{localizeDeEn(change.description, language)}</p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
