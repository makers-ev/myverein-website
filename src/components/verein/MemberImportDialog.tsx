'use client';

import { useId, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2 } from 'lucide-react';

import { Modal } from '@/components/Modal';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { inputClass, memberErrorKey, primaryButtonClass, secondaryButtonClass, type MemberCategory } from '@/lib/clubMembers';
import {
    fetchCsvBlob,
    IMPORT_FIELDS,
    IMPORT_MAX_BYTES,
    IMPORT_MAX_ROWS,
    issueCounts,
    mappingChanged,
    mappingConflicts,
    mappingPayload,
    problemRows,
    saveBlob,
    stripBom,
    utf8Size,
    effectiveField,
    type ImportCommit,
    type ImportDryRun,
    type ImportRow,
    type MappingOverrides,
} from '@/lib/memberCsv';

const ROW_LIMIT = 100;

type Phase = 'pick' | 'checking' | 'report' | 'committing' | 'done';

/**
 * CSV import of members (Wave 7 W6): file -> dry-run report -> confirm. Nothing is written before the explicit confirm;
 * the dry run's single-use `confirmToken` ties the commit to exactly this file, mapping and default category. The file
 * text lives only in this component's state (gone when the dialog closes) and is never logged; the report shows line
 * numbers, field names and translated problem texts, never cell values.
 */
export default function MemberImportDialog({
    clubId,
    categories,
    onClose,
    onImported,
}: {
    clubId: string;
    categories: MemberCategory[];
    onClose: () => void;
    /** Called once after a successful commit so the list can reload. */
    onImported: () => void;
}) {
    const { t } = useLanguage();
    const fileId = useId();
    const fileRef = useRef<HTMLInputElement>(null);

    const [phase, setPhase] = useState<Phase>('pick');
    const [csv, setCsv] = useState<string | null>(null);
    const [fileName, setFileName] = useState('');
    const [overrides, setOverrides] = useState<MappingOverrides>({});
    const [appliedOverrides, setAppliedOverrides] = useState<MappingOverrides>({});
    const [defaultCategoryKey, setDefaultCategoryKey] = useState('');
    const [appliedCategory, setAppliedCategory] = useState('');
    const [report, setReport] = useState<ImportDryRun | null>(null);
    const [result, setResult] = useState<ImportCommit | null>(null);
    const [onlyProblems, setOnlyProblems] = useState(true);
    const [showAll, setShowAll] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);

    const busy = phase === 'checking' || phase === 'committing';
    const showPicker = !report && (phase === 'pick' || phase === 'checking');
    const showReport = !!report && (phase === 'report' || phase === 'committing' || phase === 'checking');
    const activeCategories = categories.filter((c) => !c.archived);

    function fail(err: unknown) {
        setError(t(memberErrorKey(err)));
    }

    async function dryRun(text: string, mapping: MappingOverrides, category: string, keepReport: boolean) {
        setPhase('checking');
        setError(null);
        try {
            const res = await apiFetch<{ data: ImportDryRun }>(`/club-members/import?clubId=${clubId}`, {
                method: 'POST',
                body: { csv: text, dryRun: true, mapping: mappingPayload(mapping), defaultCategoryKey: category || undefined },
            });
            setReport(res.data);
            setAppliedOverrides(mapping);
            setAppliedCategory(category);
            setOnlyProblems(res.data.summary.errors + res.data.summary.duplicates > 0);
            setShowAll(false);
            setPhase('report');
        } catch (err) {
            fail(err);
            // A file-level problem leaves no usable report: back to the picker (a re-check keeps the old report visible).
            setPhase(keepReport ? 'report' : 'pick');
        }
    }

    async function onFile(file: File | undefined) {
        if (!file) return;
        setError(null);
        if (file.size > IMPORT_MAX_BYTES) {
            setError(t('verein.err.csvTooLarge'));
            return;
        }
        let text: string;
        try {
            text = stripBom(await file.text());
        } catch {
            setError(t('verein.import.err.read'));
            return;
        }
        if (utf8Size(text) > IMPORT_MAX_BYTES) {
            setError(t('verein.err.csvTooLarge'));
            return;
        }
        // Allow picking the same file again after fixing it.
        if (fileRef.current) fileRef.current.value = '';
        setCsv(text);
        setFileName(file.name);
        setOverrides({});
        setReport(null);
        await dryRun(text, {}, defaultCategoryKey, false);
    }

    async function commit() {
        if (!csv || !report?.committable || stale) return;
        setPhase('committing');
        setError(null);
        try {
            const res = await apiFetch<{ data: ImportCommit }>(`/club-members/import?clubId=${clubId}`, {
                method: 'POST',
                body: { csv, dryRun: false, confirmToken: report.confirmToken, mapping: mappingPayload(appliedOverrides), defaultCategoryKey: appliedCategory || undefined },
            });
            setResult(res.data);
            setCsv(null);
            setReport(null);
            setPhase('done');
            onImported();
        } catch (err) {
            fail(err);
            setPhase('report');
        }
    }

    async function downloadTemplate() {
        setDownloading(true);
        setError(null);
        try {
            const { blob, filename } = await fetchCsvBlob(`/club-members/import-template?clubId=${clubId}`, 'mitglieder-vorlage.csv');
            saveBlob(blob, filename);
        } catch (err) {
            fail(err);
        } finally {
            setDownloading(false);
        }
    }

    function reset() {
        setPhase('pick');
        setCsv(null);
        setReport(null);
        setResult(null);
        setOverrides({});
        setAppliedOverrides({});
        setError(null);
        if (fileRef.current) fileRef.current.value = '';
    }

    const conflicts = report ? mappingConflicts(report.columns, overrides) : [];
    const stale = !!report && (mappingChanged(appliedOverrides, overrides) || appliedCategory !== defaultCategoryKey);
    const fieldLabel = (field: string | null) => (field ? t(`verein.import.field.${field}`) : t('verein.import.field.none'));

    const rows = report ? (onlyProblems ? problemRows(report.rows) : report.rows) : [];
    const visibleRows = showAll ? rows : rows.slice(0, ROW_LIMIT);

    const categoryField = (
        <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t('verein.import.defaultCategory')}
                <select value={defaultCategoryKey} onChange={(e) => setDefaultCategoryKey(e.target.value)} disabled={busy} className={`${inputClass} mt-1 font-normal`}>
                    <option value="">{t('verein.import.defaultCategory.auto')}</option>
                    {activeCategories.map((c) => (
                        <option key={c.id} value={c.key}>
                            {c.name}
                        </option>
                    ))}
                </select>
            </label>
        </div>
    );

    let footer: React.ReactNode;
    if (phase === 'done') {
        footer = (
            <div className="flex justify-end gap-2">
                <button type="button" onClick={reset} className={secondaryButtonClass}>
                    {t('verein.import.another')}
                </button>
                <button type="button" onClick={onClose} className={primaryButtonClass}>
                    {t('verein.import.close')}
                </button>
            </div>
        );
    } else if (showReport) {
        footer = (
            <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={onClose} disabled={busy} className={secondaryButtonClass}>
                    {t('verein.import.cancel')}
                </button>
                {stale ? (
                    <button
                        type="button"
                        onClick={() => csv && void dryRun(csv, overrides, defaultCategoryKey, true)}
                        disabled={busy || conflicts.length > 0}
                        className={primaryButtonClass}
                    >
                        {t('verein.import.recheck')}
                    </button>
                ) : (
                    <button type="button" onClick={() => void commit()} disabled={busy || !report?.committable} className={`${primaryButtonClass} inline-flex items-center gap-1.5`}>
                        {phase === 'committing' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        {t('verein.import.confirm', { count: report?.summary.ok ?? 0 })}
                    </button>
                )}
            </div>
        );
    } else {
        footer = (
            <div className="flex justify-end">
                <button type="button" onClick={onClose} disabled={busy} className={secondaryButtonClass}>
                    {t('verein.import.cancel')}
                </button>
            </div>
        );
    }

    return (
        <Modal open onClose={busy ? () => undefined : onClose} title={t('verein.import.title')} size="lg" footer={footer}>
            <div className="space-y-4">
                {phase !== 'done' && (
                    <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                        <p>{t('verein.import.intro')}</p>
                        <ul className="list-disc space-y-1 pl-5 text-xs">
                            <li>{t('verein.import.note.duplicates')}</li>
                            <li>{t('verein.import.note.noAccount')}</li>
                            <li>{t('verein.import.note.limits', { rows: IMPORT_MAX_ROWS })}</li>
                        </ul>
                        <button type="button" onClick={() => void downloadTemplate()} disabled={downloading} className={`${secondaryButtonClass} inline-flex items-center gap-1.5 !px-3 !py-1.5`}>
                            <Download className="h-4 w-4" aria-hidden="true" />
                            {t('verein.import.template')}
                        </button>
                    </div>
                )}

                {error && (
                    <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        {error}
                    </p>
                )}

                {showPicker && (
                    <div className="space-y-3">
                        <div>
                            <label htmlFor={fileId} className="mb-1 block text-xs font-medium text-muted-foreground">
                                {t('verein.import.file')}
                            </label>
                            <input
                                ref={fileRef}
                                id={fileId}
                                type="file"
                                accept=".csv,.txt,text/csv,text/plain"
                                disabled={busy}
                                onChange={(e) => void onFile(e.target.files?.[0])}
                                className="block w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted"
                            />
                        </div>
                        {categoryField}
                        {phase === 'checking' && (
                            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                {t('verein.import.checking')}
                            </p>
                        )}
                    </div>
                )}

                {showReport && report && (
                    <>
                        <p className="flex items-center gap-2 text-sm text-foreground">
                            <FileUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <span className="truncate font-medium">{fileName}</span>
                            <button type="button" onClick={reset} disabled={busy} className="ml-auto shrink-0 text-xs font-medium text-primary hover:underline">
                                {t('verein.import.otherFile')}
                            </button>
                        </p>

                        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={t('verein.import.summary')}>
                            <SummaryTile label={t('verein.import.summary.rows')} value={report.summary.rows} tone="muted" />
                            <SummaryTile label={t('verein.import.summary.ok')} value={report.summary.ok} tone="success" />
                            <SummaryTile label={t('verein.import.summary.duplicates')} value={report.summary.duplicates} tone="warning" />
                            <SummaryTile label={t('verein.import.summary.errors')} value={report.summary.errors} tone="destructive" />
                        </dl>

                        {report.summary.errors > 0 ? (
                            <p role="status" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                                {t('verein.import.blocked')}
                            </p>
                        ) : report.summary.ok === 0 ? (
                            <p role="status" className="rounded-lg bg-warning/10 p-3 text-sm text-warning">
                                {t('verein.import.nothingNew')}
                            </p>
                        ) : (
                            <p role="status" className="rounded-lg bg-success/10 p-3 text-sm text-success">
                                {report.summary.duplicates > 0
                                    ? t('verein.import.ready.withDuplicates', { count: report.summary.ok, duplicates: report.summary.duplicates })
                                    : t('verein.import.ready', { count: report.summary.ok })}
                            </p>
                        )}

                        <details className="rounded-lg border border-border p-3">
                            <summary className="cursor-pointer text-sm font-medium text-foreground">{t('verein.import.mapping.title')}</summary>
                            <p className="mt-2 text-xs text-muted-foreground">{t('verein.import.mapping.hint')}</p>
                            <div className="mt-2">{categoryField}</div>
                            <ul className="mt-2 space-y-2">
                                {report.columns.map((col, i) => {
                                    const selectId = `${fileId}-map-${i}`;
                                    const value = Object.prototype.hasOwnProperty.call(overrides, col.header) ? overrides[col.header]! : '';
                                    return (
                                        <li key={`${i}-${col.header}`} className="grid items-center gap-2 sm:grid-cols-2">
                                            <label htmlFor={selectId} className="min-w-0 break-words text-sm text-foreground">
                                                {col.header || t('verein.import.mapping.unnamed')}
                                            </label>
                                            <select
                                                id={selectId}
                                                value={value}
                                                disabled={busy}
                                                onChange={(e) => setOverrides((o) => ({ ...o, [col.header]: e.target.value }))}
                                                className={inputClass}
                                            >
                                                <option value="">
                                                    {t('verein.import.mapping.auto', { field: fieldLabel(col.field) })}
                                                </option>
                                                <option value="ignore">{t('verein.import.mapping.ignore')}</option>
                                                {IMPORT_FIELDS.map((f) => (
                                                    <option key={f} value={f}>
                                                        {t(`verein.import.field.${f}`)}
                                                    </option>
                                                ))}
                                            </select>
                                        </li>
                                    );
                                })}
                            </ul>
                            {conflicts.length > 0 && (
                                <p role="alert" className="mt-2 text-xs text-destructive">
                                    {t('verein.import.mapping.conflict', { fields: conflicts.map((f) => fieldLabel(f)).join(', ') })}
                                </p>
                            )}
                            <p className="mt-2 text-xs text-muted-foreground">
                                {t('verein.import.mapping.effective', {
                                    list: report.columns
                                        .map((c) => effectiveField(c, appliedOverrides))
                                        .filter((f): f is string => !!f)
                                        .map((f) => fieldLabel(f))
                                        .join(', ') || '—',
                                })}
                            </p>
                        </details>
                        {stale && <p role="status" className="text-xs text-warning">{t('verein.import.stale')}</p>}
                        {phase === 'checking' && (
                            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                {t('verein.import.checking')}
                            </p>
                        )}

                        <div>
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-sm font-bold text-foreground">{t('verein.import.rows.title')}</h3>
                                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <input type="checkbox" checked={onlyProblems} onChange={(e) => { setOnlyProblems(e.target.checked); setShowAll(false); }} className="h-4 w-4 accent-[var(--primary)]" />
                                    {t('verein.import.rows.onlyProblems')}
                                </label>
                            </div>
                            <IssueOverview rows={report.rows} t={t} />
                            {rows.length === 0 ? (
                                <p className="flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                                    <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                                    {t('verein.import.rows.empty')}
                                </p>
                            ) : (
                                <div className={`overflow-x-auto rounded-lg border border-border ${stale ? 'opacity-60' : ''}`}>
                                    <table className="w-full text-left text-sm">
                                        <caption className="sr-only">{t('verein.import.rows.title')}</caption>
                                        <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                                            <tr>
                                                <th scope="col" className="px-3 py-2">{t('verein.import.rows.line')}</th>
                                                <th scope="col" className="px-3 py-2">{t('verein.import.rows.status')}</th>
                                                <th scope="col" className="px-3 py-2">{t('verein.import.rows.details')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {visibleRows.map((row) => (
                                                <tr key={row.line} className="align-top">
                                                    <th scope="row" className="px-3 py-2 font-medium text-foreground">{row.line}</th>
                                                    <td className="px-3 py-2"><StatusChip row={row} t={t} /></td>
                                                    <td className="px-3 py-2 text-xs text-foreground">
                                                        <RowDetails row={row} t={t} fieldLabel={fieldLabel} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {rows.length > visibleRows.length && (
                                <button type="button" onClick={() => setShowAll(true)} className={`${secondaryButtonClass} mt-2`}>
                                    {t('verein.import.rows.more', { count: rows.length - visibleRows.length })}
                                </button>
                            )}
                        </div>
                    </>
                )}

                {phase === 'done' && result && (
                    <div className="space-y-3" role="status">
                        <p className="flex items-center gap-2 text-base font-semibold text-success">
                            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                            {t('verein.import.done.title', { count: result.created })}
                        </p>
                        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            <SummaryTile label={t('verein.import.done.created')} value={result.created} tone="success" />
                            <SummaryTile label={t('verein.import.done.skipped')} value={result.skippedDuplicates} tone="warning" />
                            <SummaryTile label={t('verein.import.done.skippedSince')} value={result.skippedSinceDryRun} tone="muted" />
                        </dl>
                        <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">{t('verein.import.done.next')}</p>
                    </div>
                )}
            </div>
        </Modal>
    );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: 'muted' | 'success' | 'warning' | 'destructive' }) {
    const toneClass = { muted: 'text-foreground', success: 'text-success', warning: 'text-warning', destructive: 'text-destructive' }[tone];
    return (
        <div className="rounded-lg border border-border bg-background p-3 text-center">
            <dd className={`text-xl font-bold ${toneClass}`}>{value}</dd>
            <dt className="text-xs text-muted-foreground">{label}</dt>
        </div>
    );
}

function StatusChip({ row, t }: { row: ImportRow; t: (key: string) => string }) {
    const cls = row.status === 'ok' ? 'bg-success/15 text-success' : row.status === 'duplicate' ? 'bg-warning/15 text-warning' : 'bg-destructive/10 text-destructive';
    return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{t(`verein.import.status.${row.status}`)}</span>;
}

function RowDetails({ row, t, fieldLabel }: { row: ImportRow; t: (key: string, params?: Record<string, string | number>) => string; fieldLabel: (field: string | null) => string }) {
    if (row.status === 'ok') return <span className="text-muted-foreground">{t('verein.import.rows.willBeCreated')}</span>;
    if (row.status === 'duplicate') {
        return (
            <ul className="space-y-0.5">
                {(row.duplicates ?? []).map((d, i) => (
                    <li key={i}>
                        {t(`verein.import.dup.${d.reason}`)}{' '}
                        {d.clubMemberId === null && d.line !== null ? t('verein.import.dup.inFile', { line: d.line }) : t('verein.import.dup.existing')}
                    </li>
                ))}
                <li className="text-muted-foreground">{t('verein.import.dup.skipped')}</li>
            </ul>
        );
    }
    return (
        <ul className="space-y-0.5">
            {row.issues.map((issue, i) => (
                <li key={i}>
                    {issue.field ? <span className="font-medium">{fieldLabel(issue.field)}: </span> : null}
                    {issueText(issue.code, t)}
                </li>
            ))}
        </ul>
    );
}

const KNOWN_ISSUES = ['required', 'invalid_date', 'invalid_category', 'invalid_status', 'invalid_email', 'too_long', 'invalid_value', 'member_number_taken', 'member_number_duplicate_in_file'];

/** Translated problem text for an issue code; an unknown code (newer backend) gets the generic text, never the raw message. */
function issueText(code: string, t: (key: string) => string): string {
    return KNOWN_ISSUES.includes(code) ? t(`verein.import.issue.${code}`) : t('verein.import.issue.invalid_value');
}

function IssueOverview({ rows, t }: { rows: ImportRow[]; t: (key: string) => string }) {
    const counts = issueCounts(rows);
    if (counts.length === 0) return null;
    return (
        <ul className="mb-2 flex flex-wrap gap-1.5" aria-label={t('verein.import.issues.title')}>
            {counts.map((c) => (
                <li key={c.code} className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs text-destructive">
                    {c.count} × {issueText(c.code, t)}
                </li>
            ))}
        </ul>
    );
}
