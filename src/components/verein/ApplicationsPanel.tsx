'use client';

import { useEffect, useState } from 'react';
import { Baby, ChevronLeft, ChevronRight, Paperclip, ShieldCheck } from 'lucide-react';

import ApplicationReviewDialog, { type DecisionOutcome } from '@/components/verein/ApplicationReviewDialog';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type ApplicationPage, APPLICATIONS_PAGE_SIZE, clampPage, type ClubApplication, listQuery } from '@/lib/applicationReview';
import { formatDate, secondaryButtonClass } from '@/lib/clubMembers';
import { pageCount } from '@/lib/keyHistory';

export type { ClubApplication } from '@/lib/applicationReview';

/**
 * Open Aufnahmeantraege for the board (members:write), paged (`GET /club-applications?page&pageSize`). Each row shows who the
 * application is for, a short summary of the answers, the number of files and whether a consent exists; "Prüfen" opens the
 * review dialog where the board accepts or rejects. Rows filed before the form builder are marked as such. After a decision
 * the parent reloads the member list and the count badge through `onDecided`.
 */
export default function ApplicationsPanel({ clubId, onDecided }: { clubId: string; onDecided: () => Promise<void> | void }) {
    const { t, language } = useLanguage();
    const [page, setPage] = useState(1);
    const [reload, setReload] = useState(0);
    const [loaded, setLoaded] = useState<{ key: string; data: ApplicationPage } | null>(null);
    const [failedKey, setFailedKey] = useState<string | null>(null);
    const [reviewing, setReviewing] = useState<ClubApplication | null>(null);
    const [outcome, setOutcome] = useState<DecisionOutcome | null>(null);

    const requestKey = `${clubId}:${page}:${reload}`;

    useEffect(() => {
        let cancelled = false;
        apiFetch<ApplicationPage>(`/club-applications?${listQuery(clubId, page)}`)
            .then((res) => {
                if (cancelled) return;
                // Decisions emptied the last page: step back instead of showing an empty page 4.
                if (res.data.length === 0 && res.total > 0 && page > 1) {
                    setPage(clampPage(page, res.total));
                    return;
                }
                setLoaded({ key: requestKey, data: res });
                setFailedKey(null);
            })
            .catch(() => {
                if (!cancelled) setFailedKey(requestKey);
            });
        return () => {
            cancelled = true;
        };
    }, [clubId, page, requestKey]);

    const data = loaded?.data ?? null;
    const stale = loaded !== null && loaded.key !== requestKey;
    const pages = data ? pageCount(data.total, APPLICATIONS_PAGE_SIZE) : 1;

    async function handleDecided(result: DecisionOutcome | null) {
        // A stale decision (`null`) keeps the dialog open so the person reads why; only the list behind it reloads.
        if (result) {
            setReviewing(null);
            setOutcome(result);
        }
        setReload((n) => n + 1);
        try {
            await onDecided();
        } catch {
            // The decision went through; a stale list is fixed by the next refresh.
        }
    }

    const categoryText = (key: string | null) => {
        if (!key) return null;
        const text = t(`verein.category.${key}`);
        return text === `verein.category.${key}` ? key : text;
    };

    return (
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
                {t('verein.applications.title')}
                {data && data.total > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">{data.total}</span>}
            </h2>

            {outcome && (
                <p role="status" className="mb-3 rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-foreground">
                    {t(
                        outcome.action === 'approved' ? (outcome.child ? 'forms.review.outcome.approvedChild' : 'forms.review.outcome.approved') : 'forms.review.outcome.rejected',
                        { name: outcome.name },
                    )}
                    {outcome.skipped > 0 && ` ${t('forms.review.outcome.skipped', { n: outcome.skipped })}`}
                </p>
            )}

            {failedKey === requestKey ? (
                <LoadError onRetry={() => setReload((n) => n + 1)} />
            ) : !data ? (
                <LoadingText />
            ) : data.data.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('verein.applications.empty')}</p>
            ) : (
                <>
                    <ul className="space-y-2" aria-busy={stale}>
                        {data.data.map((a) => {
                            const child = a.onBehalfOf === 'guardian';
                            const category = categoryText(a.category);
                            return (
                                <li key={a.id} className="rounded-lg border border-border px-3 py-2">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                                                <span className="break-words">{a.subjectName ?? a.name ?? '—'}</span>
                                                {child && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                                        <Baby className="h-3.5 w-3.5" aria-hidden="true" />
                                                        {t('forms.review.badge.child')}
                                                    </span>
                                                )}
                                                {a.legacy && <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{t('forms.review.badge.legacy')}</span>}
                                                {category && <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{category}</span>}
                                            </p>
                                            <p className="break-words text-xs text-muted-foreground">
                                                {child ? t('forms.review.list.by', { name: a.name ?? '—' }) : (a.email ?? '—')} · {t('verein.applications.submitted')} {formatDate(a.createdAt, language)}
                                                {a.birthDate && (
                                                    <>
                                                        {' · '}
                                                        {t('verein.applications.birthDate')} {formatDate(a.birthDate, language)}
                                                    </>
                                                )}
                                            </p>
                                            {a.summary.length > 0 && (
                                                <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label={t('forms.review.list.summary')}>
                                                    {a.summary.map((s) => (
                                                        <li key={s.key} className="max-w-full break-words rounded bg-muted px-2 py-0.5 text-xs text-foreground">
                                                            <span className="text-muted-foreground">{s.label}:</span> {s.display}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                {a.fileCount > 0 && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                                                        {t('forms.review.list.files', { n: a.fileCount })}
                                                    </span>
                                                )}
                                                <span className="inline-flex items-center gap-1">
                                                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                                    {a.consentGiven === null ? t('forms.review.list.consentNone') : a.consentGiven ? t('forms.review.list.consentGiven') : t('forms.review.list.consentMissing')}
                                                </span>
                                            </p>
                                        </div>
                                        <button type="button" onClick={() => setReviewing(a)} className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                                            {t('forms.review.open')}
                                            <span className="sr-only"> – {a.subjectName ?? a.name ?? ''}</span>
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    {pages > 1 && (
                        <nav className="mt-3 flex items-center justify-between gap-2" aria-label={t('forms.review.pagination')}>
                            <button type="button" disabled={page <= 1 || stale} onClick={() => setPage((p) => Math.max(1, p - 1))} className={secondaryButtonClass}>
                                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                {t('forms.review.page.prev')}
                            </button>
                            <p className="text-xs text-muted-foreground" aria-live="polite">
                                {t('forms.review.page.of', { page: data.page, pages })}
                            </p>
                            <button type="button" disabled={page >= pages || stale} onClick={() => setPage((p) => Math.min(pages, p + 1))} className={secondaryButtonClass}>
                                {t('forms.review.page.next')}
                                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </nav>
                    )}
                </>
            )}

            {reviewing && <ApplicationReviewDialog clubId={clubId} application={reviewing} onClose={() => setReviewing(null)} onDecided={(result) => void handleDecided(result)} />}
        </div>
    );
}
