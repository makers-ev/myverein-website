'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, Lock, ShieldCheck } from 'lucide-react';

import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { EmptyState } from '@/components/standorte/ui';
import ExpiryBadge, { EnteredByNote } from '@/components/verein/ExpiryBadge';
import MemberDetailDialog from '@/components/verein/MemberDetailDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError, apiFetch } from '@/lib/api-client';
import { formatDate, inputClass, secondaryButtonClass } from '@/lib/clubMembers';
import {
    asOverview,
    buildOverviewQuery,
    canFilterMissing,
    emptyOverviewFilters,
    isOverviewFiltered,
    normalizeFilters,
    type Overview,
    type OverviewField,
    type OverviewRow,
    type OverviewFilters,
    overviewErrorKey,
    pageCount,
    rowName,
} from '@/lib/credentialOverview';
import { localizedTexts, textLang, withLang, type TextTranslations } from '@/lib/profileTexts';
import { CREDENTIAL_STATUSES, type CredentialStatus, EXPIRING_WINDOWS } from '@/lib/credentials';

type Outcome = { key: string; overview: Overview; error?: undefined } | { key: string; error: unknown; overview?: undefined };

/**
 * "Qualifikationen" for the board, trainers and department heads (Mitglieder area): who holds which qualification and until
 * when, replacing the Excel list. Filters (qualification, status, window of "läuft bald ab"), the server's order (expired
 * first), paging, expiry badges in words, a link to the member's details. The server decides who may see what (403/404 are
 * handled by the caller / here); sensitive qualifications (Kinderschutz) are marked and their reads are audited by the server.
 * Nothing about it is stored in the browser and values are never logged. No reminders: the status is only shown.
 */
export default function CredentialsPanel({ clubId, canIncludeFormer, onUnavailable }: { clubId: string; canIncludeFormer: boolean; onUnavailable?: () => void }) {
    const { t, language } = useLanguage();
    const [filters, setFilters] = useState<OverviewFilters>(emptyOverviewFilters());
    const [page, setPage] = useState(1);
    const [fields, setFields] = useState<OverviewField[]>([]);
    // The overview delivers German labels only; the definitions (same rights: only fields the caller may read) carry the English ones.
    const lang = textLang(language);
    const [labels, setLabels] = useState<Record<string, string>>({});
    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data: Array<{ key: string; label: string; helpText?: string | null; translations?: TextTranslations | null }> }>(withLang(`/member-fields?clubId=${clubId}`, lang))
            .then((res) => {
                if (!cancelled) setLabels(Object.fromEntries(res.data.map((d) => [d.key, localizedTexts(d, lang).label])));
            })
            .catch(() => {
                if (!cancelled) setLabels({});
            });
        return () => {
            cancelled = true;
        };
    }, [clubId, lang]);
    const labelOfKey = (key: string, fallback: string) => labels[key] ?? fallback;
    const [outcome, setOutcome] = useState<Outcome | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [detail, setDetail] = useState<{ id: string; name: string | null } | null>(null);

    const query = buildOverviewQuery(clubId, filters, page);
    const key = `${query}#${attempt}`;

    useEffect(() => {
        let cancelled = false;
        apiFetch<unknown>(`/club-members/credentials?${query}`)
            .then((res) => {
                if (cancelled) return;
                const overview = asOverview(res);
                if (!overview) {
                    setOutcome({ key, error: new Error('unexpected answer') });
                    return;
                }
                setFields(overview.fields);
                setOutcome({ key, overview });
            })
            .catch((error: unknown) => {
                if (!cancelled) setOutcome({ key, error });
            });
        return () => {
            cancelled = true;
        };
        // `key` is derived from `query` and `attempt`.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, attempt]);

    const current = outcome && outcome.key === key ? outcome : null;
    // 403 (not for this person) or 404 without a field filter (nothing to show at all) = the view is not for the caller: report it so the
    // switch disappears and the list comes back. Other failures (429, 5xx, offline) stay visible here with a retry.
    const unavailable = current?.error instanceof ApiError && (current.error.status === 403 || (current.error.status === 404 && filters.fieldKey === ''));
    useEffect(() => {
        if (unavailable) onUnavailable?.();
    }, [unavailable, onUnavailable]);
    const loading = current === null;
    const overview = current?.overview ?? null;
    // While a new query is on its way the previous rows stay visible (dimmed) instead of flashing.
    const shown = overview ?? (outcome?.overview ?? null);
    const pages = shown ? pageCount(shown.total, shown.pageSize) : 1;
    const filtered = isOverviewFiltered(filters);

    const update = useCallback(
        (patch: Partial<OverviewFilters>) => {
            setFilters((f) => normalizeFilters({ ...f, ...patch }, fields));
            setPage(1);
        },
        [fields],
    );

    const statusLabel = (s: CredentialStatus) => t(`forms.cred.overview.status.${s}`);

    return (
        <section aria-label={t('forms.cred.overview.title')} className="space-y-4">
            <div>
                <h2 className="text-sm font-bold text-foreground">{t('forms.cred.overview.title')}</h2>
                <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t('forms.cred.overview.hint')}</p>
                <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t('forms.cred.overview.noReminders')}</p>
            </div>

            <div className="grid gap-3 rounded-xl border border-border bg-card p-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                    <label htmlFor="cred-field" className="block text-xs font-semibold text-muted-foreground">
                        {t('forms.cred.overview.field')}
                    </label>
                    <select id="cred-field" value={filters.fieldKey} onChange={(e) => update({ fieldKey: e.target.value })} className={`mt-1 ${inputClass}`}>
                        <option value="">{t('forms.cred.overview.field.all')}</option>
                        {fields.map((f) => (
                            <option key={f.id} value={f.key}>
                                {labelOfKey(f.key, f.label)}
                                {f.sensitive ? ` (${t('forms.cred.overview.confidential')})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="cred-status" className="block text-xs font-semibold text-muted-foreground">
                        {t('forms.cred.overview.status')}
                    </label>
                    <select id="cred-status" value={filters.status} onChange={(e) => update({ status: e.target.value as OverviewFilters['status'] })} aria-describedby="cred-status-hint" className={`mt-1 ${inputClass}`}>
                        <option value="">{t('forms.cred.overview.status.all')}</option>
                        {CREDENTIAL_STATUSES.map((s) => (
                            <option key={s} value={s} disabled={s === 'missing' && !canFilterMissing(filters)}>
                                {statusLabel(s)}
                            </option>
                        ))}
                    </select>
                    <p id="cred-status-hint" className="mt-1 text-xs text-muted-foreground">
                        {canFilterMissing(filters) ? t('forms.cred.overview.status.missingHint') : t('forms.cred.overview.status.missingNeedsField')}
                    </p>
                </div>
                <div>
                    <label htmlFor="cred-within" className="block text-xs font-semibold text-muted-foreground">
                        {t('forms.cred.overview.within')}
                    </label>
                    <select id="cred-within" value={filters.withinDays} onChange={(e) => update({ withinDays: Number(e.target.value) })} className={`mt-1 ${inputClass}`}>
                        {EXPIRING_WINDOWS.map((d) => (
                            <option key={d} value={d}>
                                {t('forms.cred.overview.within.days', { days: d })}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col justify-end gap-2">
                    {canIncludeFormer && (
                        <label className="flex items-center gap-2 text-sm text-foreground">
                            <input type="checkbox" checked={filters.includeFormer} onChange={(e) => update({ includeFormer: e.target.checked })} className="h-4 w-4 accent-primary" />
                            {t('forms.cred.overview.former')}
                        </label>
                    )}
                    {filtered && (
                        <button
                            type="button"
                            onClick={() => {
                                setFilters(emptyOverviewFilters());
                                setPage(1);
                            }}
                            className={`${secondaryButtonClass} self-start`}
                        >
                            {t('forms.cred.overview.reset')}
                        </button>
                    )}
                </div>
            </div>

            {current?.error !== undefined ? (
                <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                    <p>{t(overviewErrorKey(current.error))}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {current.error instanceof ApiError && current.error.status === 404 ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setFilters(emptyOverviewFilters());
                                    setPage(1);
                                }}
                                className={secondaryButtonClass}
                            >
                                {t('forms.cred.overview.reset')}
                            </button>
                        ) : (
                            <button type="button" onClick={() => setAttempt((n) => n + 1)} className={secondaryButtonClass}>
                                {t('common.retry')}
                            </button>
                        )}
                    </div>
                </div>
            ) : !shown ? (
                loading ? <LoadingText /> : <LoadError onRetry={() => setAttempt((n) => n + 1)} />
            ) : shown.fields.length === 0 ? (
                <EmptyState icon={<ShieldCheck className="h-6 w-6" aria-hidden="true" />} text={t('forms.cred.overview.noFields')} />
            ) : shown.data.length === 0 ? (
                <EmptyState icon={<ShieldCheck className="h-6 w-6" aria-hidden="true" />} text={filtered ? t('forms.cred.overview.empty.filtered') : t('forms.cred.overview.empty')} />
            ) : (
                <>
                    <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
                        {t('forms.cred.overview.count', { count: shown.total })}
                        {shown.today ? ` · ${t('forms.cred.overview.asOf', { date: formatDate(shown.today, language) })}` : ''}
                        {loading ? ` · ${t('common.loading')}` : ''}
                    </p>
                    <CredentialsTable rows={shown.data} fields={fields} labels={labels} loading={loading} onOpen={(id, name) => setDetail({ id, name })} />
                    {pages > 1 && (
                        <nav aria-label={t('forms.cred.overview.pages')} className="flex flex-wrap items-center justify-between gap-2">
                            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))} className={secondaryButtonClass}>
                                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                {t('forms.cred.overview.prev')}
                            </button>
                            <span className="text-xs text-muted-foreground">{t('forms.cred.overview.page', { page: shown.page, pages })}</span>
                            <button type="button" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)} className={secondaryButtonClass}>
                                {t('forms.cred.overview.next')}
                                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </nav>
                    )}
                </>
            )}
            {detail && <MemberDetailDialog clubId={clubId} memberId={detail.id} name={detail.name} onClose={() => setDetail(null)} />}
        </section>
    );
}

/** The result table: horizontally scrollable on a phone, row headers, expiry in words, details button per row. */
export function CredentialsTable({ rows, fields, labels = {}, loading, onOpen }: { rows: OverviewRow[]; fields: readonly OverviewField[]; labels?: Record<string, string>; loading: boolean; onOpen: (clubMemberId: string, name: string | null) => void }) {
    const { t, language } = useLanguage();
    const levelLabel = (fieldKey: string, level: string | undefined) => (level ? (fields.find((f) => f.key === fieldKey)?.options?.find((o) => o.value === level)?.label ?? level) : '—');
    return (
            <div className={`relative overflow-x-auto rounded-xl border border-border transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
                <table className="w-full min-w-[40rem] text-sm">
                    <caption className="sr-only">{t('forms.cred.overview.title')}</caption>
                    <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                        <tr>
                            <th scope="col" className="px-3 py-2 font-semibold">{t('forms.cred.overview.col.person')}</th>
                            <th scope="col" className="px-3 py-2 font-semibold">{t('forms.cred.overview.col.field')}</th>
                            <th scope="col" className="px-3 py-2 font-semibold">{t('forms.cred.overview.col.level')}</th>
                            <th scope="col" className="px-3 py-2 font-semibold">{t('forms.cred.overview.col.until')}</th>
                            <th scope="col" className="px-3 py-2 font-semibold">{t('forms.cred.overview.col.status')}</th>
                            <th scope="col" className="px-3 py-2 font-semibold">
                                <span className="sr-only">{t('forms.cf.detail.column')}</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {rows.map((row) => {
                            const name = rowName(row);
                            return (
                                <tr key={`${row.clubMemberId}:${row.fieldKey}`} className="align-top">
                                    <th scope="row" className="px-3 py-2 text-left font-medium text-foreground">
                                        <span className="break-words">{name ?? '—'}</span>
                                    </th>
                                    <td className="px-3 py-2 text-foreground">
                                        <span className="break-words">{labels[row.fieldKey] ?? row.fieldLabel}</span>
                                        {row.sensitive && (
                                            <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-[11px] font-medium text-warning">
                                                <Lock className="h-3 w-3" aria-hidden="true" />
                                                {t('forms.cred.overview.confidential')}
                                            </span>
                                        )}
                                        <div className="mt-0.5">
                                            <EnteredByNote enteredBy={row.enteredBy} hasValue={row.value !== null} />
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-foreground">{levelLabel(row.fieldKey, row.value?.level)}</td>
                                    <td className="whitespace-nowrap px-3 py-2 text-foreground">{row.expiry.validUntil ? formatDate(row.expiry.validUntil, language) : '—'}</td>
                                    <td className="px-3 py-2">
                                        <ExpiryBadge expiry={row.expiry} />
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <button
                                            type="button"
                                            onClick={() => onOpen(row.clubMemberId, name)}
                                            aria-label={t('forms.cf.detail.open', { name: name ?? '—' })}
                                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                        >
                                            <Eye className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
    );
}
