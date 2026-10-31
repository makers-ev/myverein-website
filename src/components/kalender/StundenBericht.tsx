'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';

import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { eventErrorKey } from '@/lib/eventErrors';
import { formatCost } from '@/lib/eventRegistration';
import { fetchFileBlob, saveBlob } from '@/lib/memberCsv';
import { MAX_REPORT_PEOPLE, REPORT_FILENAME, REPORT_MIME, type ReportGroupBy, type ReportPeopleOptions, type TimeReport, reportQuery, reportRows, toggleId, totalHours } from '@/lib/timeTracking';

import { type Department, inputClass, labelClass, secondaryBtn } from './calendarTypes';

interface Props {
    clubId: string;
    range: { from: string; to: string };
    departments: Department[];
}

const GROUPS: readonly ReportGroupBy[] = ['person', 'event', 'person_event'];

/** Stundenbericht: hours (and, with `time:read_rates`, amounts) as a calculation basis. No payout, no booking, no payment status. */
export default function StundenBericht({ clubId, range: initialRange, departments }: Props) {
    const { t, language } = useLanguage();
    const [range, setRange] = useState(initialRange);
    const [groupBy, setGroupBy] = useState<ReportGroupBy>('person');
    const [departmentId, setDepartmentId] = useState('');
    const [eventId, setEventId] = useState('');
    const [roleTypes, setRoleTypes] = useState<string[]>([]);
    const [memberIds, setMemberIds] = useState<string[]>([]);
    const [search, setSearch] = useState('');
    const [options, setOptions] = useState<ReportPeopleOptions | null>(null);
    const [report, setReport] = useState<TimeReport | null>(null);
    const [failed, setFailed] = useState(false);
    const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null);
    const [error, setError] = useState<string | null>(null);

    const filters = useMemo(
        () => ({ clubId, from: range.from, to: range.to, departmentId, eventId, roleTypes, clubMemberIds: memberIds, groupBy }),
        [clubId, range.from, range.to, departmentId, eventId, roleTypes, memberIds, groupBy],
    );
    const qs = reportQuery(filters);

    const loadOptions = useCallback(() => {
        apiFetch<{ data: ReportPeopleOptions }>(`/time-report/people?clubId=${clubId}&from=${range.from}&to=${range.to}`)
            .then((res) => setOptions({ people: res.data.people ?? [], roleTypes: res.data.roleTypes ?? [], events: res.data.events ?? [] }))
            .catch(() => setOptions({ people: [], roleTypes: [], events: [] }));
    }, [clubId, range.from, range.to]);
    useEffect(() => {
        loadOptions();
    }, [loadOptions]);

    const load = useCallback(() => {
        setFailed(false);
        setReport(null);
        apiFetch<{ data: TimeReport }>(`/time-report?${qs}`)
            .then((res) => setReport(res.data))
            .catch(() => setFailed(true));
    }, [qs]);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);

    async function download(format: 'csv' | 'xlsx') {
        setExporting(format);
        setError(null);
        try {
            const { blob, filename } = await fetchFileBlob(`/time-report?${reportQuery({ ...filters, format })}`, REPORT_FILENAME[format], { accept: REPORT_MIME[format] });
            saveBlob(blob, filename);
        } catch (err) {
            setError(t(eventErrorKey(err)));
        } finally {
            setExporting(null);
        }
    }

    const roleLabel = (r: string) => {
        const key = `verein.role.${r}`;
        const label = t(key);
        return label === key ? r : label;
    };
    const people = useMemo(() => options?.people ?? [], [options]);
    const names = useMemo(() => new Map(people.map((p) => [p.clubMemberId, p.displayName])), [people]);
    const hits = people.filter((p) => !search.trim() || p.displayName.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 50);
    const rangeEvents = options?.events ?? [];
    const rows = report ? reportRows(report) : [];
    const showPerson = groupBy !== 'event';
    const showEvent = groupBy !== 'person';
    const fmtHours = (h: number | undefined) => (h ?? 0).toLocaleString(language, { maximumFractionDigits: 2 });
    const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString(language, { dateStyle: 'short' }) : '');

    return (
        <section className="space-y-3" aria-labelledby="stundenbericht-title">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="stundenbericht-title" className="font-semibold text-foreground">
                    {t('time.report.title')}
                </h3>
                <div className="flex flex-wrap gap-2">
                    {(['csv', 'xlsx'] as const).map((f) => (
                        <button key={f} type="button" onClick={() => void download(f)} disabled={exporting !== null || !report || failed} className={`${secondaryBtn} inline-flex items-center gap-1.5`}>
                            <Download className="h-4 w-4" aria-hidden />
                            {exporting === f ? t('time.report.exporting') : t(`time.report.export.${f}`)}
                        </button>
                    ))}
                </div>
            </div>
            <p className="text-xs text-muted-foreground">{t('time.report.hint')}</p>
            {error && (
                <p role="alert" className="text-xs text-destructive">
                    {error}
                </p>
            )}

            <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                    <label htmlFor="sb-from" className={labelClass}>{t('time.filter.from')}</label>
                    <input id="sb-from" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className={inputClass} />
                </div>
                <div>
                    <label htmlFor="sb-to" className={labelClass}>{t('time.filter.to')}</label>
                    <input id="sb-to" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className={inputClass} />
                </div>
                <div>
                    <label htmlFor="sb-dept" className={labelClass}>{t('time.report.department')}</label>
                    <select id="sb-dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputClass}>
                        <option value="">{t('time.report.all')}</option>
                        {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="sb-event" className={labelClass}>{t('time.report.event')}</label>
                    <select id="sb-event" value={eventId} onChange={(e) => setEventId(e.target.value)} className={inputClass}>
                        <option value="">{t('time.report.all')}</option>
                        {rangeEvents.map((e) => (
                            <option key={e.eventId} value={e.eventId}>
                                {fmtDate(e.startsAt)} · {e.title}
                            </option>
                        ))}
                    </select>
                </div>

                {options && options.roleTypes.length > 0 && (
                    <fieldset className="sm:col-span-2 lg:col-span-2">
                        <legend className={labelClass}>{t('time.report.roles')}</legend>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {options.roleTypes.map((r) => (
                                <label key={r} className="inline-flex items-center gap-1.5 text-sm text-foreground">
                                    <input type="checkbox" checked={roleTypes.includes(r)} onChange={() => setRoleTypes(roleTypes.includes(r) ? roleTypes.filter((x) => x !== r) : [...roleTypes, r])} />
                                    {roleLabel(r)}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                )}

                <div className="sm:col-span-2 lg:col-span-2">
                    <label htmlFor="sb-people-search" className={labelClass}>{t('time.report.people')}</label>
                    <input id="sb-people-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('time.report.people.search')} className={inputClass} disabled={!options} />
                    {memberIds.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={t('time.report.people.selected')}>
                            {memberIds.map((id) => (
                                <li key={id}>
                                    <button type="button" onClick={() => setMemberIds(toggleId(memberIds, id))} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary" aria-label={t('time.report.people.remove', { name: names.get(id) ?? id })}>
                                        {names.get(id) ?? id} ×
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {memberIds.length >= MAX_REPORT_PEOPLE && <p className="mt-1 text-xs text-warning">{t('time.report.people.max', { max: MAX_REPORT_PEOPLE })}</p>}
                    {options && (
                        <ul className="mt-2 max-h-40 divide-y divide-border overflow-y-auto rounded-lg border border-border" aria-label={t('time.report.people')}>
                            {hits.length === 0 ? (
                                <li className="px-3 py-2 text-xs text-muted-foreground">{t('time.report.people.empty')}</li>
                            ) : (
                                hits.map((p) => (
                                    <li key={p.clubMemberId}>
                                        <label className="flex items-center gap-2 px-3 py-1.5 text-sm text-foreground">
                                            <input type="checkbox" checked={memberIds.includes(p.clubMemberId)} onChange={() => setMemberIds(toggleId(memberIds, p.clubMemberId))} />
                                            {p.displayName}
                                        </label>
                                    </li>
                                ))
                            )}
                        </ul>
                    )}
                </div>

                <div className="sm:col-span-2 lg:col-span-4">
                    <div role="group" aria-label={t('time.report.groupBy')} className="inline-flex flex-wrap rounded-lg border border-border bg-background p-0.5">
                        {GROUPS.map((g) => (
                            <button key={g} type="button" aria-pressed={groupBy === g} onClick={() => setGroupBy(g)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${groupBy === g ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                                {t(`time.report.groupBy.${g}`)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {failed ? (
                <LoadError onRetry={load} />
            ) : !report ? (
                <LoadingText />
            ) : rows.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-muted-foreground">{t('time.report.empty')}</p>
            ) : (
                <div className="relative overflow-x-auto max-h-[28rem] overflow-y-auto rounded-lg border border-border">
                    <table className="w-full text-left">
                        <caption className="sr-only">{t('time.report.title')}</caption>
                        <thead className="sticky top-0 z-10 bg-muted text-xs text-muted-foreground">
                            <tr>
                                {showPerson && <th scope="col" className="px-3 py-2">{t('time.col.person')}</th>}
                                {showPerson && <th scope="col" className="px-3 py-2">{t('time.report.roles')}</th>}
                                {showEvent && <th scope="col" className="px-3 py-2">{t('time.col.event')}</th>}
                                {showEvent && <th scope="col" className="px-3 py-2">{t('time.report.date')}</th>}
                                <th scope="col" className="px-3 py-2">{t('time.report.entries')}</th>
                                <th scope="col" className="px-3 py-2">{t('time.report.hours')}</th>
                                {report.includesRates && <th scope="col" className="px-3 py-2">{t('time.report.rate')}</th>}
                                {report.includesRates && <th scope="col" className="px-3 py-2">{t('time.report.amount')}</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {rows.map((p, i) => (
                                <tr key={`${p.clubMemberId ?? ''}|${p.eventId ?? ''}|${i}`} className="text-foreground">
                                    {showPerson && <th scope="row" className="px-3 py-2 font-medium">{p.displayName}</th>}
                                    {showPerson && <td className="px-3 py-2">{(p.roleTypes ?? []).map(roleLabel).join(', ')}</td>}
                                    {showEvent && (
                                        <th scope={showPerson ? undefined : 'row'} className="px-3 py-2 font-medium">
                                            {p.eventTitle ?? t('time.report.noEvent')}
                                        </th>
                                    )}
                                    {showEvent && <td className="px-3 py-2 tabular-nums">{fmtDate(p.eventDate)}</td>}
                                    <td className="px-3 py-2 tabular-nums">{p.entries ?? ''}</td>
                                    <td className="px-3 py-2 tabular-nums">{fmtHours(p.hours ?? (p.minutes ?? 0) / 60)}</td>
                                    {report.includesRates && <td className="px-3 py-2 tabular-nums">{p.rateMissing && p.rateCents == null ? <span className="text-warning">{t('time.report.rateMissing')}</span> : (formatCost(p.rateCents, language) ?? '–')}</td>}
                                    {report.includesRates && <td className="px-3 py-2 tabular-nums">{formatCost(p.amountCents, language) ?? '–'}</td>}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="sticky bottom-0 bg-muted">
                            <tr className="border-t border-border font-semibold text-foreground">
                                <th scope="row" colSpan={(showPerson ? 2 : 0) + (showEvent ? 2 : 0) + 1} className="px-3 py-2">
                                    {t('time.report.total')}
                                </th>
                                <td className="px-3 py-2 tabular-nums">{fmtHours(totalHours(report))}</td>
                                {report.includesRates && <td />}
                                {report.includesRates && <td className="px-3 py-2 tabular-nums">{formatCost(report.totals.amountCents, language) ?? '–'}</td>}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </section>
    );
}
