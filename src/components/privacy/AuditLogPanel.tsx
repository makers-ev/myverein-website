'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, ScrollText, X } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { AUDIT_GROUPS, AUDIT_PAGE_SIZE, type AuditFilter, type AuditKind, type AuditPage, auditPath, auditQuery, describeAuditEvent } from '@/lib/auditLog';
import { fetchCsvBlob, saveBlob } from '@/lib/memberCsv';
import { formatDate, inputClass, secondaryButtonClass } from '@/lib/clubMembers';
import { Chip, EmptyState, SectionCard, errorMessage } from '@/components/standorte/ui';
import LoadingText from '@/components/LoadingText';

const EMPTY: AuditFilter = { kind: '', type: '', actorId: '', from: '', to: '', page: 1 };

export interface AuditMemberFocus {
    id: string;
    name: string;
}

/**
 * "Zugriffs- und Änderungsprotokoll" (Wave 10 W8, `privacy:read`): filterable, paged table of who saw or changed data, with
 * German sentences for known events (raw event type otherwise), a per-person view and a CSV export of the current selection.
 * Entries never carry content, only event, person and time. `focus` jumps straight to the log of one member.
 */
export default function AuditLogPanel({ clubId, focus, onFocusChange }: { clubId: string; focus: AuditMemberFocus | null; onFocusChange: (next: AuditMemberFocus | null) => void }) {
    const { t, language } = useLanguage();
    const [filter, setFilter] = useState<AuditFilter>(EMPTY);
    const [draft, setDraft] = useState<AuditFilter>(EMPTY);
    // Name of the actor filter, shown on the chip (the API filters by account id).
    const [actorName, setActorName] = useState('');
    const [result, setResult] = useState<AuditPage | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const memberId = focus?.id ?? null;

    const load = useCallback(async () => {
        setError(null);
        try {
            setResult(await apiFetch<AuditPage>(`${auditPath(memberId)}?${auditQuery(clubId, filter)}`));
        } catch (err) {
            setResult(null);
            setError(errorMessage(err, t));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId, filter, memberId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    function apply(next: AuditFilter) {
        setFilter(next);
        setDraft(next);
    }

    async function exportCsv() {
        setExporting(true);
        setError(null);
        try {
            // The export covers the club-wide selection (the API has no member variant); the button is disabled in the person view.
            const { blob, filename } = await fetchCsvBlob(`/audit-log/export?${auditQuery(clubId, filter, false)}`, 'protokoll.csv');
            saveBlob(blob, filename);
        } catch (err) {
            setError(errorMessage(err, t));
        } finally {
            setExporting(false);
        }
    }

    const total = result?.total ?? 0;
    const pages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));

    return (
        <SectionCard
            title={focus ? t('audit.memberView', { name: focus.name }) : t('audit.title')}
            action={
                <button type="button" disabled={exporting || focus !== null} title={focus ? t('audit.exportNeedsClub') : undefined} onClick={() => void exportCsv()} className={secondaryButtonClass}>
                    <Download className="h-4 w-4" aria-hidden />
                    {t(exporting ? 'audit.exporting' : 'audit.export')}
                </button>
            }
        >
            <p className="mb-3 text-sm text-muted-foreground">{t('audit.intro')}</p>

            {(focus || filter.actorId) && (
                <div className="mb-3 flex flex-wrap gap-2">
                    {focus && (
                        <button type="button" onClick={() => { onFocusChange(null); apply({ ...filter, page: 1 }); }} aria-label={t('audit.filter.remove')} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            {t('audit.filter.member', { name: focus.name })}
                            <X className="h-3 w-3" aria-hidden />
                        </button>
                    )}
                    {filter.actorId && (
                        <button type="button" onClick={() => apply({ ...filter, actorId: '', page: 1 })} aria-label={t('audit.filter.remove')} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            {t('audit.filter.actor', { name: actorName })}
                            <X className="h-3 w-3" aria-hidden />
                        </button>
                    )}
                </div>
            )}

            <form
                className="mb-4 flex flex-wrap items-end gap-3"
                onSubmit={(e) => {
                    e.preventDefault();
                    apply({ ...draft, actorId: filter.actorId, page: 1 });
                }}
            >
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('audit.filter.kind')}</span>
                    <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as AuditKind | '' })} className={inputClass}>
                        <option value="">{t('audit.filter.kind.all')}</option>
                        <option value="read">{t('audit.filter.kind.read')}</option>
                        <option value="change">{t('audit.filter.kind.change')}</option>
                    </select>
                </label>
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('audit.filter.type')}</span>
                    <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className={inputClass}>
                        <option value="">{t('audit.filter.type.all')}</option>
                        {AUDIT_GROUPS.map((g) => (
                            <option key={g} value={g}>
                                {t(`audit.group.${g}`)}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('audit.filter.from')}</span>
                    <input type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} className={inputClass} />
                </label>
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('audit.filter.to')}</span>
                    <input type="date" value={draft.to} min={draft.from || undefined} onChange={(e) => setDraft({ ...draft, to: e.target.value })} className={inputClass} />
                </label>
                <button type="submit" className={secondaryButtonClass}>
                    {t('audit.filter.apply')}
                </button>
                <button type="button" onClick={() => { onFocusChange(null); apply(EMPTY); }} className="px-2 py-2 text-sm text-muted-foreground underline">
                    {t('audit.filter.reset')}
                </button>
            </form>

            {error ? (
                <p role="alert" className="text-sm text-destructive">
                    {error}{' '}
                    <button type="button" onClick={() => void load()} className="font-semibold underline">
                        {t('common.retry')}
                    </button>
                </p>
            ) : !result ? (
                <LoadingText />
            ) : result.data.length === 0 ? (
                <EmptyState icon={<ScrollText className="h-6 w-6" aria-hidden />} text={t('audit.empty')} />
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs uppercase text-muted-foreground">
                                <tr>
                                    <th className="px-3 py-2">{t('audit.col.time')}</th>
                                    <th className="px-3 py-2">{t('audit.col.kind')}</th>
                                    <th className="px-3 py-2">{t('audit.col.event')}</th>
                                    <th className="px-3 py-2">{t('audit.col.person')}</th>
                                    <th className="px-3 py-2">{t('audit.col.actor')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.data.map((e) => (
                                    <tr key={e.id} className="border-t border-border align-top text-foreground">
                                        <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                                            {formatDate(e.createdAt, language)}{' '}
                                            {new Date(e.createdAt).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })}
                                        </td>
                                        <td className="px-3 py-2">
                                            <Chip tone={e.kind === 'read' ? 'primary' : 'muted'}>{t(`audit.kind.${e.kind}`)}</Chip>
                                        </td>
                                        <td className="px-3 py-2">{describeAuditEvent(e, t)}</td>
                                        <td className="px-3 py-2">
                                            {e.subjectMember ? (
                                                <button
                                                    type="button"
                                                    title={t('audit.person.filter')}
                                                    onClick={() => {
                                                        onFocusChange({ id: e.subjectMember!.id, name: e.subjectMember!.name ?? t('audit.member.unknown') });
                                                        apply({ ...filter, page: 1 });
                                                    }}
                                                    className="text-left text-primary underline"
                                                >
                                                    {e.subjectMember.name ?? '—'}
                                                </button>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            {e.actor ? (
                                                <button
                                                    type="button"
                                                    title={t('audit.actor.filter')}
                                                    onClick={() => {
                                                        setActorName(e.actor!.name ?? '—');
                                                        apply({ ...filter, actorId: e.actor!.userId, page: 1 });
                                                    }}
                                                    className="text-left text-primary underline"
                                                >
                                                    {e.actor.name ?? '—'}
                                                </button>
                                            ) : (
                                                t('audit.actor.system')
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm">
                        <button type="button" disabled={filter.page <= 1} onClick={() => apply({ ...filter, page: filter.page - 1 })} className={secondaryButtonClass}>
                            {t('privacy.paging.prev')}
                        </button>
                        <span className="text-muted-foreground">{t('privacy.paging.of', { page: filter.page, pages, total })}</span>
                        <button type="button" disabled={filter.page >= pages} onClick={() => apply({ ...filter, page: filter.page + 1 })} className={secondaryButtonClass}>
                            {t('privacy.paging.next')}
                        </button>
                    </div>
                </>
            )}
            <p className="mt-3 text-xs text-muted-foreground">{t('audit.exportHint')}</p>
        </SectionCard>
    );
}
