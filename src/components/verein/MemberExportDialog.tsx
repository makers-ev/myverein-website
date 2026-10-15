'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Loader2, Lock } from 'lucide-react';

import { Modal } from '@/components/Modal';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import type { CustomFieldDefinition } from '@/lib/customFields';
import { inputClass, MEMBER_STATUSES, memberErrorKey, primaryButtonClass, secondaryButtonClass, todayIso, type MemberCategory } from '@/lib/clubMembers';
import { buildExportQuery, exportableCustomFields, defaultExportColumns, EXPORT_COLUMNS, fetchCsvBlob, isRateLimited, saveBlob, selectableColumns, toggleExportColumn } from '@/lib/memberCsv';

/**
 * CSV export of the member list (Wave 7 W6) for `members:write` or `members:read_sensitive`. Sensitive columns are shown
 * but disabled without `members:read_sensitive` (the backend would answer 403). The file arrives as a blob via fetch
 * with the session cookie, there is no public download URL.
 */
export default function MemberExportDialog({
    clubId,
    permissions,
    categories,
    departments,
    onClose,
}: {
    clubId: string;
    permissions: string[];
    categories: MemberCategory[];
    departments: { id: string; name: string }[];
    onClose: () => void;
}) {
    const { t } = useLanguage();
    const canSensitive = permissions.includes('members:read_sensitive');

    const [columns, setColumns] = useState<string[]>(() => defaultExportColumns(canSensitive));
    const [status, setStatus] = useState('');
    const [category, setCategory] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [includeFormer, setIncludeFormer] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    // Custom fields (opt-in `cf:<key>` columns); the list is a convenience, a failed load just leaves the standard columns.
    const [customDefs, setCustomDefs] = useState<CustomFieldDefinition[]>([]);
    const [customKeys, setCustomKeys] = useState<string[]>([]);
    const [rateLimited, setRateLimited] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    // Leaving the dialog (or the page) cancels a running download: no late file save, no state update after unmount.
    useEffect(() => () => abortRef.current?.abort(), []);

    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data: CustomFieldDefinition[] }>(`/member-fields?clubId=${clubId}`)
            .then((res) => {
                if (!cancelled) setCustomDefs(exportableCustomFields(res.data, canSensitive));
            })
            .catch(() => {
                if (!cancelled) setCustomDefs([]);
            });
        return () => {
            cancelled = true;
        };
    }, [clubId, canSensitive]);

    const allowed = selectableColumns(canSensitive);
    const allSelected = columns.length === allowed.length;

    async function download() {
        if (busy || columns.length === 0) return;
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setBusy(true);
        setError(null);
        setDone(false);
        setRateLimited(false);
        try {
            const query = buildExportQuery(clubId, columns, { status, category, departmentId, includeFormer }, canSensitive, customKeys);
            const { blob, filename } = await fetchCsvBlob(`/club-members/export?${query}`, `mitglieder-${todayIso()}.csv`, controller.signal);
            if (controller.signal.aborted) return;
            saveBlob(blob, filename);
            setDone(true);
        } catch (err) {
            if (controller.signal.aborted) return;
            setError(t(memberErrorKey(err)));
            setRateLimited(isRateLimited(err));
        } finally {
            if (!controller.signal.aborted) setBusy(false);
        }
    }

    return (
        <Modal
            open
            onClose={busy ? () => undefined : onClose}
            title={t('verein.export.title')}
            size="lg"
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={busy} className={secondaryButtonClass}>
                        {t('verein.export.close')}
                    </button>
                    <button type="button" onClick={() => void download()} disabled={busy || columns.length === 0} className={`${primaryButtonClass} inline-flex items-center gap-1.5`}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                        {t('verein.export.download')}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">{t('verein.export.intro')}</p>

                {error && (
                    <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>
                            {error}
                            {rateLimited && <span className="mt-1 block text-xs">{t('verein.import.rateLimit')}</span>}
                        </span>
                    </p>
                )}
                {done && (
                    <p role="status" className="flex items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
                        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {t('verein.export.done')}
                    </p>
                )}

                <fieldset>
                    <legend className="mb-1 flex w-full items-center justify-between text-sm font-bold text-foreground">
                        {t('verein.export.columns')}
                        <button type="button" onClick={() => setColumns(allSelected ? [] : defaultExportColumns(canSensitive))} className="text-xs font-medium text-primary hover:underline">
                            {allSelected ? t('verein.export.columns.none') : t('verein.export.columns.all')}
                        </button>
                    </legend>
                    <ul className="grid gap-1 sm:grid-cols-2">
                        {EXPORT_COLUMNS.map((col) => {
                            const disabled = col.sensitive && !canSensitive;
                            return (
                                <li key={col.key}>
                                    <label className={`flex items-center gap-2 rounded px-1 py-1 text-sm ${disabled ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer text-foreground hover:bg-muted'}`}>
                                        <input
                                            type="checkbox"
                                            checked={columns.includes(col.key)}
                                            disabled={disabled}
                                            onChange={() => setColumns((c) => toggleExportColumn(c, col.key, canSensitive))}
                                            className="h-4 w-4 accent-[var(--primary)]"
                                        />
                                        <span className="min-w-0 flex-1">{t(`verein.export.col.${col.key}`)}</span>
                                        {col.sensitive && (
                                            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground" title={t('verein.export.sensitive.hint')}>
                                                <Lock className="h-3 w-3" aria-hidden="true" />
                                                {disabled ? t('verein.export.sensitive.locked') : t('verein.export.sensitive')}
                                            </span>
                                        )}
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                    {!canSensitive && <p className="mt-2 text-xs text-muted-foreground">{t('verein.export.sensitive.hint')}</p>}
                    {columns.length === 0 && <p role="alert" className="mt-2 text-xs text-destructive">{t('verein.export.columns.required')}</p>}
                </fieldset>

                <fieldset>
                    <legend className="mb-1 text-sm font-bold text-foreground">{t('forms.cf.export.title')}</legend>
                    {customDefs.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t('forms.cf.export.none')}</p>
                    ) : (
                        <ul className="grid gap-1 sm:grid-cols-2">
                            {customDefs.map((d) => (
                                <li key={d.key}>
                                    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm text-foreground hover:bg-muted">
                                        <input
                                            type="checkbox"
                                            checked={customKeys.includes(d.key)}
                                            onChange={() => setCustomKeys((keys) => (keys.includes(d.key) ? keys.filter((k) => k !== d.key) : [...keys, d.key]))}
                                            className="h-4 w-4 accent-[var(--primary)]"
                                        />
                                        <span className="min-w-0 flex-1 break-words">{d.label}</span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">{t('forms.cf.export.hint')}</p>
                </fieldset>

                <fieldset className="grid gap-3 sm:grid-cols-3">
                    <legend className="mb-1 text-sm font-bold text-foreground">{t('verein.export.filters')}</legend>
                    <label className="block text-xs font-medium text-muted-foreground">
                        {t('verein.members.filter.status')}
                        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inputClass} mt-1 font-normal`}>
                            <option value="">{t('verein.members.filter.status.all')}</option>
                            {MEMBER_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {t(`verein.status.${s}`)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block text-xs font-medium text-muted-foreground">
                        {t('verein.members.filter.category')}
                        <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputClass} mt-1 font-normal`}>
                            <option value="">{t('verein.members.filter.category.all')}</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.key}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    {departments.length > 0 && (
                        <label className="block text-xs font-medium text-muted-foreground">
                            {t('verein.members.filter.department')}
                            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={`${inputClass} mt-1 font-normal`}>
                                <option value="">{t('verein.members.filter.department.all')}</option>
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                    <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-3">
                        <input type="checkbox" checked={includeFormer} onChange={(e) => setIncludeFormer(e.target.checked)} disabled={status !== ''} className="h-4 w-4 accent-[var(--primary)]" />
                        {t('verein.export.includeFormer')}
                    </label>
                </fieldset>
            </div>
        </Modal>
    );
}
