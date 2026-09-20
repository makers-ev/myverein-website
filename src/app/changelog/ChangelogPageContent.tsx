'use client';

import { History, Sparkles, Wrench, Bug } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { localizeDeEn } from '@/contexts/supportedLanguages';

import { CHANGELOG_RELEASES, type ChangelogChangeType } from './changelogData';

const TYPE_STYLES: Record<ChangelogChangeType, { icon: typeof Sparkles; className: string }> = {
    feature: { icon: Sparkles, className: 'text-primary' },
    improvement: { icon: Wrench, className: 'text-warning' },
    fix: { icon: Bug, className: 'text-destructive' },
};

export default function ChangelogPageContent() {
    const { language, t } = useLanguage();

    // Newest release first.
    const releases = [...CHANGELOG_RELEASES].sort((a, b) => b.date.localeCompare(a.date));

    return (
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                    <History className="h-5 w-5 text-primary" strokeWidth={2.25} />
                </div>
                <h1 className="text-2xl font-bold text-foreground">{t('changelog.title')}</h1>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{t('changelog.intro')}</p>

            {releases.length === 0 ? (
                <div className="mt-6 rounded-xl border border-border bg-card p-4">
                    <p className="text-sm text-muted-foreground">{t('changelog.empty')}</p>
                </div>
            ) : (
                <ol className="relative mt-10">
                    {/* Spine: left-aligned on mobile, centered from sm up. */}
                    <div className="absolute top-1 bottom-1 left-3 w-px bg-border sm:left-1/2" aria-hidden="true" />

                    {releases.map((release, index) => {
                        const isRight = index % 2 === 0;
                        return (
                            <li key={release.id} className="relative mb-6 last:mb-0 sm:mb-10">
                                {/* Dot on the spine. */}
                                <span className="absolute top-1.5 left-3 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-primary ring-4 ring-primary/15 sm:left-1/2" />

                                {/* Mobile: single column, indented past the spine. Desktop: two columns either side of it, with a real gap in between. */}
                                <div className="grid grid-cols-1 pl-8 sm:grid-cols-2 sm:gap-x-12 sm:pl-0">
                                    <div className={isRight ? 'sm:col-start-2' : 'sm:text-right'}>
                                        <div className={`mb-2 flex items-baseline gap-2 ${isRight ? '' : 'sm:justify-end'}`}>
                                            <h2 className="text-sm font-bold text-foreground">{localizeDeEn(release.title, language)}</h2>
                                            <time dateTime={release.date} className="text-xs font-medium text-muted-foreground">
                                                {new Date(release.date).toLocaleDateString(language === 'de' ? 'de-DE' : 'en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                            </time>
                                        </div>

                                        <div className="rounded-xl border border-border bg-card p-3 text-left shadow-sm">
                                            <ul className="divide-y divide-border">
                                                {release.changes.map((change, changeIndex) => {
                                                    const { icon: Icon, className } = TYPE_STYLES[change.type];
                                                    return (
                                                        <li key={changeIndex} className="flex gap-2 py-2 first:pt-0 last:pb-0">
                                                            <Icon
                                                                className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${className}`}
                                                                strokeWidth={2.5}
                                                                aria-label={t(`changelog.type.${change.type}`)}
                                                            />
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold text-foreground">{localizeDeEn(change.title, language)}</p>
                                                                <p className="text-xs text-muted-foreground">{localizeDeEn(change.description, language)}</p>
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}
        </div>
    );
}
