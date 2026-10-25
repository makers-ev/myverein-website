'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';

import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type AttendanceReport as Report, type ReportFilter, percent, reportQuery, reportRangeProblem } from '@/lib/attendance';
import { eventErrorKey } from '@/lib/eventErrors';
import { fetchFileBlob, saveBlob } from '@/lib/memberCsv';

import { type Department, inputClass, labelClass, secondaryBtn } from './calendarTypes';

function RateBar({ rate }: { rate: number | null }) {
    const { t } = useLanguage();
    if (rate === null) return <span className="text-xs text-muted-foreground">{t('attReport.noData')}</span>;
    return (
        <span className="flex items-center gap-2">
            <span className="h-2 w-20 overflow-hidden rounded-full bg-muted" aria-hidden>
                <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round(rate * 100)}%` }} />
            </span>
            <span className="tabular-nums">{percent(rate)}</span>
        </span>
    );
}

function Counts({ c }: { c: { present: number; excused: number; unexcused: number } }) {
    return (
        <>
            <td className="px-3 py-2 tabular-nums">{c.present}</td>
            <td className="px-3 py-2 tabular-nums">{c.excused}</td>
            <td className="px-3 py-2 tabular-nums">{c.unexcused}</td>
        </>
    );
}

function useReport(clubId: string, filter: ReportFilter) {
    const [report, setReport] = useState<Report | null>(null);
    const [failed, setFailed] = useState(false);
    const key = reportQuery(clubId, filter);
    const load = useCallback(() => {
        setFailed(false);
        setReport(null);
        apiFetch<{ data: Report }>(`/attendance/report?${key}`)
            .then((res) => setReport(res.data))
            .catch(() => setFailed(true));
    }, [key]);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);
    return { report, failed, load };
}

/** Quota of one person with the list of events (own view and the parents' view of a ward). */
export function MemberAttendance({ clubId, memberId }: { clubId: string; memberId: string }) {
    const { t, language } = useLanguage();
    const { report, failed, load } = useReport(clubId, { memberId });
    if (failed) return <LoadError onRetry={load} />;
    if (!report) return <LoadingText />;
    const m = report.member;
    return (
        <div className="space-y-3 text-sm">
            <p className="text-xs text-muted-foreground">{t('attReport.range', { from: report.range.from, to: report.range.to })}</p>
            {!m || m.rate === null ? (
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-muted-foreground">{t('attReport.own.empty')}</p>
            ) : (
                <>
                    <p className="text-foreground">
                        <span className="text-2xl font-bold">{percent(m.rate)}</span> {t('attReport.own.rate', { present: m.present, recorded: m.recorded })}
                    </p>
                    <p className="text-muted-foreground">{t('attReport.own.counts', { present: m.present, excused: m.excused, unexcused: m.unexcused })}</p>
                    <ul className="divide-y divide-border rounded-lg border border-border">
                        {report.entries.map((e) => (
                            <li key={`${e.eventId}-${e.startsAt}`} className="flex items-center justify-between gap-2 px-3 py-2">
                                <span className="min-w-0 truncate text-foreground">
                                    {new Date(e.startsAt).toLocaleDateString(language, { day: '2-digit', month: '2-digit' })} · {e.title}
                                </span>
                                <span className="shrink-0 text-xs text-muted-foreground">{t(`attendance.status.${e.status}`)}</span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}

/** Group view for `attendance:read` (trainers and department leads see only their departments, the server restricts it). */
export function GroupAttendance({ clubId, departments }: { clubId: string; departments: Department[] }) {
    const { t, language } = useLanguage();
    const [departmentId, setDepartmentId] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [mode, setMode] = useState<'members' | 'events'>('members');
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);
    const problem = reportRangeProblem(from, to);
    const filter: ReportFilter = { departmentId: departmentId || undefined, from: problem ? undefined : from || undefined, to: problem ? undefined : to || undefined };
    const { report, failed, load } = useReport(clubId, filter);
    const [openMember, setOpenMember] = useState<string | null>(null);

    async function exportCsv() {
        setExporting(true);
        setExportError(null);
        try {
            const { blob, filename } = await fetchFileBlob(`/attendance/report.csv?${reportQuery(clubId, filter)}`, 'anwesenheit.csv', { accept: 'text/csv' });
            saveBlob(blob, filename);
        } catch (err) {
            setExportError(t(eventErrorKey(err)));
        } finally {
            setExporting(false);
        }
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
                <div>
                    <label htmlFor="attr-dept" className={labelClass}>
                        {t('attReport.filter.department')}
                    </label>
                    <select id="attr-dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputClass}>
                        <option value="">{t('attReport.filter.all')}</option>
                        {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="attr-from" className={labelClass}>
                        {t('attReport.filter.from')}
                    </label>
                    <input id="attr-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
                </div>
                <div>
                    <label htmlFor="attr-to" className={labelClass}>
                        {t('attReport.filter.to')}
                    </label>
                    <input id="attr-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
                </div>
                <button type="button" onClick={() => void exportCsv()} disabled={exporting} className={`${secondaryBtn} inline-flex items-center gap-1.5`}>
                    <Download className="h-4 w-4" aria-hidden />
                    {t(exporting ? 'attReport.export.busy' : 'attReport.export')}
                </button>
            </div>
            {problem && (
                <p role="alert" className="text-xs text-destructive">
                    {t(`attReport.range.${problem}`)}
                </p>
            )}
            {exportError && (
                <p role="alert" className="text-xs text-destructive">
                    {exportError}
                </p>
            )}
            <div role="group" aria-label={t('attReport.mode.label')} className="inline-flex rounded-lg border border-border bg-background p-0.5">
                {(['members', 'events'] as const).map((value) => (
                    <button
                        key={value}
                        type="button"
                        aria-pressed={mode === value}
                        onClick={() => setMode(value)}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        {t(`attReport.mode.${value}`)}
                    </button>
                ))}
            </div>

            {failed ? (
                <LoadError onRetry={load} />
            ) : !report ? (
                <LoadingText />
            ) : mode === 'members' ? (
                report.members.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{t('attReport.empty')}</p>
                ) : (
                    <div className="relative overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-left text-sm">
                            <caption className="sr-only">{t('attReport.mode.members')}</caption>
                            <thead className="bg-muted/50 text-xs text-muted-foreground">
                                <tr>
                                    <th scope="col" className="px-3 py-2">{t('attReport.col.name')}</th>
                                    <th scope="col" className="px-3 py-2">{t('attendance.status.anwesend')}</th>
                                    <th scope="col" className="px-3 py-2">{t('attendance.status.entschuldigt')}</th>
                                    <th scope="col" className="px-3 py-2">{t('attendance.status.unentschuldigt')}</th>
                                    <th scope="col" className="px-3 py-2">{t('attReport.col.rate')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {report.members.map((m) => (
                                    <tr key={m.clubMemberId} className="text-foreground">
                                        <th scope="row" className="px-3 py-2 font-medium">
                                            <button type="button" aria-expanded={openMember === m.clubMemberId} onClick={() => setOpenMember(openMember === m.clubMemberId ? null : m.clubMemberId)} className="text-left text-primary hover:underline">
                                                {m.displayName}
                                            </button>
                                        </th>
                                        <Counts c={m} />
                                        <td className="px-3 py-2">
                                            <RateBar rate={m.rate} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            ) : report.events.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{t('attReport.empty')}</p>
            ) : (
                <div className="relative overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-sm">
                        <caption className="sr-only">{t('attReport.mode.events')}</caption>
                        <thead className="bg-muted/50 text-xs text-muted-foreground">
                            <tr>
                                <th scope="col" className="px-3 py-2">{t('attReport.col.event')}</th>
                                <th scope="col" className="px-3 py-2">{t('attendance.status.anwesend')}</th>
                                <th scope="col" className="px-3 py-2">{t('attendance.status.entschuldigt')}</th>
                                <th scope="col" className="px-3 py-2">{t('attendance.status.unentschuldigt')}</th>
                                <th scope="col" className="px-3 py-2">{t('attReport.col.rate')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {report.events.map((e) => (
                                <tr key={e.eventId} className="text-foreground">
                                    <th scope="row" className="px-3 py-2 font-medium">
                                        {new Date(e.startsAt).toLocaleDateString(language, { day: '2-digit', month: '2-digit' })} · {e.title}
                                        {!e.closed && <span className="ml-2 text-xs font-normal text-muted-foreground">{t('attReport.notClosed')}</span>}
                                        {e.guests > 0 && <span className="ml-2 text-xs font-normal text-muted-foreground">{t('attReport.guests', { count: e.guests })}</span>}
                                    </th>
                                    <Counts c={e} />
                                    <td className="px-3 py-2">
                                        <RateBar rate={e.rate} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {openMember && (
                <section className="rounded-lg border border-border p-3">
                    <h3 className="mb-2 text-sm font-semibold text-foreground">{report?.members.find((m) => m.clubMemberId === openMember)?.displayName}</h3>
                    <MemberAttendance clubId={clubId} memberId={openMember} />
                </section>
            )}
        </div>
    );
}
