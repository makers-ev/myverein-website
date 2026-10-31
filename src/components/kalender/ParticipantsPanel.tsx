'use client';

import { GenerateAction } from '@/components/documents/GenerateDialog';
import { useCallback, useEffect, useState } from 'react';
import { Download, Users } from 'lucide-react';

import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { useConfirm } from '@/components/useConfirm';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError, apiFetch } from '@/lib/api-client';
import { BASE_CSV_COLUMNS, type ParticipantList, type Participant, answerText, csvColumnsQuery, statusChoices } from '@/lib/eventRegistration';
import { eventErrorCode, eventErrorKey } from '@/lib/eventErrors';
import { fetchFileBlob, saveBlob } from '@/lib/memberCsv';

import { type CalendarEvent, labelClass, secondaryBtn } from './calendarTypes';

interface Props {
    clubId: string;
    event: CalendarEvent;
    /** `calendars:write`: change a person's status (the list itself needs `registrations:read`). */
    canManage: boolean;
}

const STATUS_TONE: Record<Participant['status'], string> = {
    angemeldet: 'bg-success/15 text-success',
    warteliste: 'bg-warning/15 text-warning',
    unbestaetigt: 'bg-muted text-muted-foreground',
};

/** Participant list of an event with form answers, status changes and CSV export (W6, `registrations:read`). */
export default function ParticipantsPanel({ clubId, event, canManage }: Props) {
    const { t } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const [data, setData] = useState<ParticipantList | null>(null);
    const [failed, setFailed] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [baseCols, setBaseCols] = useState<string[]>([...BASE_CSV_COLUMNS]);
    const [fieldCols, setFieldCols] = useState<string[] | null>(null);
    const base = `/events/${event.id}/registrations`;

    const load = useCallback(() => {
        setFailed(false);
        apiFetch<{ data: ParticipantList }>(`${base}?clubId=${clubId}`)
            .then((res) => setData(res.data))
            .catch(() => setFailed(true));
    }, [base, clubId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);

    async function changeStatus(p: Participant, status: 'angemeldet' | 'warteliste' | 'abgesagt', force = false): Promise<void> {
        setBusyId(p.id);
        setError(null);
        try {
            await apiFetch(`${base}/${p.id}?clubId=${clubId}`, { method: 'PATCH', body: { status, ...(force ? { force: true } : {}) } });
            load();
        } catch (err) {
            if (!force && err instanceof ApiError && eventErrorCode(err) === 'capacity_exceeded') {
                if (await confirm({ title: t('participants.force.title'), body: t('participants.force.body', { name: p.displayName }), confirmLabel: t('participants.force.confirm') })) {
                    await changeStatus(p, status, true);
                    return;
                }
            } else {
                setError(t(eventErrorKey(err)));
            }
        } finally {
            setBusyId(null);
        }
    }

    async function exportCsv() {
        if (!data) return;
        setExporting(true);
        setError(null);
        try {
            const fields = fieldCols ?? data.fields.map((f) => f.key);
            const columns = csvColumnsQuery(baseCols, fields);
            const { blob, filename } = await fetchFileBlob(`${base}.csv?clubId=${clubId}&columns=${encodeURIComponent(columns)}`, 'teilnehmer.csv', { accept: 'text/csv' });
            saveBlob(blob, filename);
        } catch (err) {
            setError(t(eventErrorKey(err)));
        } finally {
            setExporting(false);
        }
    }

    if (failed) return <LoadError onRetry={load} />;
    if (!data) return <LoadingText />;

    const hiddenSensitive = !data.sensitiveVisible && data.fields.some((f) => f.sensitive);
    const shownFields = data.fields;
    const selectedFields = fieldCols ?? data.fields.map((f) => f.key);

    return (
        <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
            <p aria-live="polite" className="text-foreground">
                {t('participants.summary', { taken: data.seatsTaken, capacity: data.capacity ?? '∞', waiting: data.seatsWaiting, pending: data.pendingConfirmation })}
            </p>
            <GenerateAction clubId={clubId} templateId="teilnehmerliste" label={t('docs.gen.participants.action')} title={t('docs.gen.participants.title')} intro={t('docs.gen.participants.intro')} params={{ eventId: event.id }} target={{ kind: 'archive' }} />
            </div>
            {hiddenSensitive && <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{t('participants.sensitive.hidden')}</p>}
            {error && (
                <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-destructive">
                    {error}
                </p>
            )}

            {data.registrations.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center text-muted-foreground">
                    <Users className="h-6 w-6" aria-hidden />
                    <p>{t('participants.empty')}</p>
                </div>
            ) : (
                <div className="relative overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left">
                        <caption className="sr-only">{t('events.tab.participants')}</caption>
                        <thead className="bg-muted/50 text-xs text-muted-foreground">
                            <tr>
                                <th scope="col" className="px-3 py-2">{t('attReport.col.name')}</th>
                                <th scope="col" className="px-3 py-2">{t('participants.col.status')}</th>
                                <th scope="col" className="px-3 py-2">{t('participants.col.persons')}</th>
                                {shownFields.map((f) => (
                                    <th key={f.key} scope="col" className="px-3 py-2">
                                        {f.label}
                                    </th>
                                ))}
                                {canManage && (
                                    <th scope="col" className="px-3 py-2">
                                        <span className="sr-only">{t('participants.col.actions')}</span>
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {data.registrations.map((p) => (
                                <tr key={p.id} className="align-top text-foreground">
                                    <th scope="row" className="px-3 py-2 font-medium">
                                        {p.displayName}
                                        <span className="block text-xs font-normal text-muted-foreground">
                                            {t(`participants.kind.${p.kind}`)}
                                            {p.email ? ` · ${p.email}` : ''}
                                            {p.registeredBy ? ` · ${t('participants.registeredBy', { name: p.registeredBy })}` : ''}
                                        </span>
                                    </th>
                                    <td className="px-3 py-2">
                                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[p.status]}`}>{t(`participants.status.${p.status}`)}</span>
                                    </td>
                                    <td className="px-3 py-2 tabular-nums">{p.partySize}</td>
                                    {shownFields.map((f) => (
                                        <td key={f.key} className="px-3 py-2">
                                            {answerText(p.answers[f.key], t('participants.yes'), t('participants.no'))}
                                        </td>
                                    ))}
                                    {canManage && (
                                        <td className="px-3 py-2">
                                            <label className="sr-only" htmlFor={`pstatus-${p.id}`}>
                                                {t('participants.change', { name: p.displayName })}
                                            </label>
                                            <select
                                                id={`pstatus-${p.id}`}
                                                value=""
                                                disabled={busyId === p.id}
                                                onChange={(e) => {
                                                    const v = e.target.value as 'angemeldet' | 'warteliste' | 'abgesagt';
                                                    if (v) void changeStatus(p, v);
                                                }}
                                                className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground"
                                            >
                                                <option value="">{t('participants.change.placeholder')}</option>
                                                {statusChoices(p.status).map((s) => (
                                                    <option key={s} value={s}>
                                                        {t(`participants.action.${s}`)}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {data.registrations.length > 0 && (
                <details className="rounded-lg border border-border p-3">
                    <summary className="cursor-pointer font-medium text-foreground">{t('participants.export.title')}</summary>
                    <fieldset className="mt-2">
                        <legend className={labelClass}>{t('participants.export.columns')}</legend>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {BASE_CSV_COLUMNS.map((c) => (
                                <label key={c} className="flex items-center gap-1.5 text-xs text-foreground">
                                    <input type="checkbox" checked={baseCols.includes(c)} onChange={(e) => setBaseCols((cur) => (e.target.checked ? [...cur, c] : cur.filter((x) => x !== c)))} />
                                    {t(`participants.csv.${c}`)}
                                </label>
                            ))}
                            {data.fields.map((f) => (
                                <label key={f.key} className="flex items-center gap-1.5 text-xs text-foreground">
                                    <input type="checkbox" checked={selectedFields.includes(f.key)} onChange={(e) => setFieldCols(e.target.checked ? [...selectedFields, f.key] : selectedFields.filter((x) => x !== f.key))} />
                                    {f.label}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <button type="button" onClick={() => void exportCsv()} disabled={exporting || baseCols.length + selectedFields.length === 0} className={`${secondaryBtn} mt-3 inline-flex items-center gap-1.5`}>
                        <Download className="h-4 w-4" aria-hidden />
                        {t(exporting ? 'attReport.export.busy' : 'attReport.export')}
                    </button>
                    <p className="mt-2 text-xs text-muted-foreground">{t('participants.export.hint')}</p>
                </details>
            )}
            {dialog}
        </div>
    );
}
