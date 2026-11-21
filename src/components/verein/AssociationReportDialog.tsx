'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Eye, Loader2, ShieldAlert } from 'lucide-react';

import { Modal } from '@/components/Modal';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { formatDate, inputClass, primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import { fetchCsvBlob, isRateLimited, saveBlob } from '@/lib/memberCsv';
import { UI_LABEL } from '@/lib/uiClasses';
import type { CustomFieldDefinition } from '@/lib/customFields';
import { localizedTexts, textLang, withLang } from '@/lib/profileTexts';
import { DEFAULT_AGE_BANDS, REPORT_COLUMNS, defaultOptions, genderFieldCandidates, optionsProblem, reportErrorKey, reportFilename, reportQuery, toggleColumn, type AgeMode, type ReportColumn, type ReportOptions, type ReportPreview } from '@/lib/associationReport';

/**
 * "Verbandsmeldung" (Wave 15 W5): member counts for a federation as a CSV. The dialog says up front that the file leaves the club
 * (recipient, data minimisation), lets the board pick the reference day and columns, previews the table and downloads the CSV
 * as a blob (session cookie, no public URL). Each CSV export is written to the audit log by the backend.
 */
export default function AssociationReportDialog({ clubId, canSensitive, onClose }: { clubId: string; canSensitive: boolean; onClose: () => void }) {
    const { t, language } = useLanguage();
    const uid = useId();
    const id = (n: string) => `${uid}-${n}`;
    const [opts, setOpts] = useState<ReportOptions>(defaultOptions);
    const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
    const [preview, setPreview] = useState<ReportPreview | null>(null);
    const [busy, setBusy] = useState<'preview' | 'download' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [rateLimited, setRateLimited] = useState(false);
    const [done, setDone] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const problem = optionsProblem(opts);

    // Leaving the dialog cancels a running request: no late file save, no state update after unmount.
    useEffect(() => () => abortRef.current?.abort(), []);

    // Candidates for the gender column: the list is a convenience, a failed load just leaves the column unavailable.
    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data: CustomFieldDefinition[] }>(withLang(`/member-fields?clubId=${encodeURIComponent(clubId)}`, textLang(language)))
            .then((res) => {
                if (!cancelled) setFields(genderFieldCandidates(res.data, canSensitive).map((d) => ({ ...d, label: localizedTexts(d, textLang(language)).label })));
            })
            .catch(() => {
                if (!cancelled) setFields([]);
            });
        return () => {
            cancelled = true;
        };
    }, [clubId, canSensitive, language]);

    const change = (patch: Partial<ReportOptions>) => {
        setOpts((o) => ({ ...o, ...patch }));
        setPreview(null);
        setError(null);
        setDone(false);
    };

    async function run(kind: 'preview' | 'download') {
        if (busy || problem) return;
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setBusy(kind);
        setError(null);
        setRateLimited(false);
        setDone(false);
        try {
            if (kind === 'preview') {
                const res = await apiFetch<{ data: ReportPreview }>(`/club-stats/association-report?${reportQuery(clubId, opts, 'json')}`, { signal: controller.signal });
                if (!controller.signal.aborted) setPreview(res.data);
            } else {
                const { blob, filename } = await fetchCsvBlob(`/club-stats/association-report?${reportQuery(clubId, opts, 'csv')}`, reportFilename(opts.stichtag), controller.signal);
                if (controller.signal.aborted) return;
                saveBlob(blob, filename);
                setDone(true);
            }
        } catch (err) {
            if (controller.signal.aborted) return;
            setError(t(reportErrorKey(err)));
            setRateLimited(isRateLimited(err));
        } finally {
            if (!controller.signal.aborted) setBusy(null);
        }
    }

    const wantsAge = opts.columns.includes('ageGroup');
    const wantsGender = opts.columns.includes('gender');
    const shownColumns: ReportColumn[] = preview ? REPORT_COLUMNS.filter((c) => preview.columns.includes(c)) : [];

    return (
        <Modal
            open
            size="lg"
            onClose={busy ? () => undefined : onClose}
            title={t('assoc.title')}
            footer={
                <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={busy !== null} className={secondaryButtonClass}>
                        {t('assoc.close')}
                    </button>
                    <button type="button" onClick={() => void run('download')} disabled={busy !== null || !!problem} className={`${primaryButtonClass} gap-1.5`}>
                        {busy === 'download' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                        {t('assoc.download')}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{t('assoc.intro')}</p>
                <aside className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-soft p-3 text-sm text-foreground">
                    <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" strokeWidth={1.5} />
                    <div>
                        <p className="font-bold">{t('assoc.privacy.title')}</p>
                        <p className="mt-1">{t('assoc.privacy.body')}</p>
                    </div>
                </aside>

                {error && (
                    <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive-soft p-3 text-sm text-destructive">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>
                            {error}
                            {rateLimited && <span className="mt-1 block text-xs">{t('verein.import.rateLimit')}</span>}
                        </span>
                    </p>
                )}
                {done && (
                    <p role="status" className="flex items-center gap-2 rounded-lg bg-success-soft p-3 text-sm text-success">
                        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {t('assoc.done')}
                    </p>
                )}

                <div className="max-w-xs">
                    <label htmlFor={id('stichtag')} className={UI_LABEL}>
                        {t('assoc.stichtag')}
                    </label>
                    <input id={id('stichtag')} type="date" value={opts.stichtag} required aria-describedby={id('stichtag-hint')} onChange={(e) => change({ stichtag: e.target.value })} className={inputClass} />
                    <p id={id('stichtag-hint')} className="mt-1 text-xs text-muted-foreground">
                        {t('assoc.stichtag.hint')}
                    </p>
                </div>

                <fieldset>
                    <legend className="mb-1 text-sm font-bold text-foreground">{t('assoc.columns')}</legend>
                    <ul className="grid gap-1 sm:grid-cols-2">
                        {REPORT_COLUMNS.map((c) => {
                            const unavailable = c === 'gender' && fields.length === 0;
                            return (
                                <li key={c}>
                                    <label className={`flex min-h-11 items-start gap-2 rounded-lg px-1 py-1.5 text-sm ${unavailable ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer text-foreground hover:bg-muted'}`}>
                                        <input type="checkbox" checked={opts.columns.includes(c)} disabled={unavailable} onChange={() => change({ columns: toggleColumn(opts.columns, c) })} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
                                        <span>
                                            {t(`assoc.col.${c}`)}
                                            {unavailable && <span className="block text-xs">{t('assoc.col.gender.unavailable')}</span>}
                                        </span>
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                    {opts.columns.length === 0 && (
                        <p role="alert" className="mt-1 text-xs text-destructive">
                            {t('assoc.err.columns')}
                        </p>
                    )}
                </fieldset>

                {wantsGender && (
                    <div className="max-w-sm">
                        <label htmlFor={id('gender')} className={UI_LABEL}>
                            {t('assoc.genderField')}
                        </label>
                        <select id={id('gender')} value={opts.genderField} onChange={(e) => change({ genderField: e.target.value })} className={inputClass}>
                            <option value="">{t('assoc.genderField.choose')}</option>
                            {fields.map((f) => (
                                <option key={f.key} value={f.key}>
                                    {f.label}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-muted-foreground">{t('assoc.genderField.hint')}</p>
                    </div>
                )}

                {wantsAge && (
                    <fieldset className="space-y-3 rounded-xl bg-muted/40 p-4">
                        <legend className="px-1 text-sm font-bold text-foreground">{t('assoc.age')}</legend>
                        <div className="max-w-sm">
                            <label htmlFor={id('bands')} className={UI_LABEL}>
                                {t('assoc.ageBands')}
                            </label>
                            <input id={id('bands')} value={opts.ageBands} inputMode="numeric" placeholder={DEFAULT_AGE_BANDS} aria-describedby={id('bands-hint')} aria-invalid={problem === 'assoc.err.ageBands'} onChange={(e) => change({ ageBands: e.target.value })} className={inputClass} />
                            <p id={id('bands-hint')} className={`mt-1 text-xs ${problem === 'assoc.err.ageBands' ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {t(problem === 'assoc.err.ageBands' ? 'assoc.err.ageBands' : 'assoc.ageBands.hint')}
                            </p>
                        </div>
                        <div role="radiogroup" aria-label={t('assoc.ageMode')} className="space-y-1">
                            {(['jahrgang', 'stichtag'] as AgeMode[]).map((m) => (
                                <label key={m} className="flex min-h-11 cursor-pointer items-start gap-2 rounded-lg px-1 py-1.5 text-sm text-foreground hover:bg-muted">
                                    <input type="radio" name={id('ageMode')} checked={opts.ageMode === m} onChange={() => change({ ageMode: m })} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
                                    <span>
                                        <span className="font-medium">{t(`assoc.ageMode.${m}`)}</span>
                                        <span className="block text-xs text-muted-foreground">{t(`assoc.ageMode.${m}.hint`)}</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                )}

                <div className="max-w-xs">
                    <label htmlFor={id('delimiter')} className={UI_LABEL}>
                        {t('assoc.delimiter')}
                    </label>
                    <select id={id('delimiter')} value={opts.delimiter} onChange={(e) => change({ delimiter: e.target.value as ReportOptions['delimiter'] })} className={inputClass}>
                        <option value=";">{t('assoc.delimiter.semicolon')}</option>
                        <option value=",">{t('assoc.delimiter.comma')}</option>
                    </select>
                </div>

                {problem && problem !== 'assoc.err.columns' && problem !== 'assoc.err.ageBands' && (
                    <p role="alert" className="text-sm text-destructive">
                        {t(problem)}
                    </p>
                )}

                <section aria-labelledby={id('preview')} className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 id={id('preview')} className="text-sm font-bold text-foreground">
                            {t('assoc.preview')}
                        </h3>
                        <button type="button" onClick={() => void run('preview')} disabled={busy !== null || !!problem} className={`${secondaryButtonClass} gap-1.5`}>
                            {busy === 'preview' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                            {t('assoc.preview.show')}
                        </button>
                    </div>
                    {busy === 'preview' && (
                        <p role="status" className="text-sm text-muted-foreground">
                            {t('assoc.preview.loading')}
                        </p>
                    )}
                    {!preview && busy !== 'preview' && <p className="text-sm text-muted-foreground">{t('assoc.preview.hint')}</p>}
                    {preview &&
                        (preview.rows.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{t('assoc.preview.empty', { date: formatDate(preview.stichtag, language) })}</p>
                        ) : (
                            <div className="relative overflow-x-auto rounded-xl border border-border">
                                <table className="w-full min-w-[20rem] text-left text-sm">
                                    <caption className="sr-only">{t('assoc.preview.caption', { date: formatDate(preview.stichtag, language) })}</caption>
                                    <thead className="bg-muted text-xs text-muted-foreground">
                                        <tr>
                                            {shownColumns.map((c) => (
                                                <th key={c} scope="col" className="px-3 py-2 font-medium">
                                                    {t(`assoc.col.${c}`)}
                                                </th>
                                            ))}
                                            <th scope="col" className="px-3 py-2 text-right font-medium">
                                                {t('assoc.count')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.rows.map((r, i) => (
                                            <tr key={i} className="border-t border-border">
                                                {shownColumns.map((c) => (
                                                    <td key={c} className="px-3 py-2 text-foreground">
                                                        {r[c] ?? ''}
                                                    </td>
                                                ))}
                                                <td className="px-3 py-2 text-right font-medium text-foreground">{r.count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-border bg-muted/50 font-bold">
                                            <th scope="row" colSpan={Math.max(1, shownColumns.length)} className="px-3 py-2 text-left">
                                                {t('assoc.total')}
                                            </th>
                                            <td className="px-3 py-2 text-right">{preview.total}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ))}
                    {preview && preview.rows.length > 0 && <p className="text-xs text-muted-foreground">{t('assoc.preview.note')}</p>}
                </section>
            </div>
        </Modal>
    );
}
