import { ApiError } from './api-client';
import { backendUrl } from './auth-client';

/**
 * Member CSV import/export (Wave 7 W6, backend README "Member CSV import/export"). Pure helpers live here so the
 * report summarising and the column logic are unit-tested; the dialogs only render.
 */

/** Same limit as the backend default (`MEMBER_IMPORT_MAX_BYTES`, 1 MiB): checked client-side to spare a pointless upload. */
export const IMPORT_MAX_BYTES = 1_048_576;
export const IMPORT_MAX_ROWS = 2000;

/** Importable fields (backend `ImportField`) in display order. */
export const IMPORT_FIELDS = [
    'memberNumber',
    'displayName',
    'firstName',
    'lastName',
    'birthDate',
    'category',
    'status',
    'joinedAt',
    'street',
    'postalCode',
    'city',
    'phone',
    'contactEmail',
    'emergencyContactName',
    'emergencyContactPhone',
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

export function isImportField(value: unknown): value is ImportField {
    return typeof value === 'string' && (IMPORT_FIELDS as readonly string[]).includes(value);
}

export interface ImportColumn {
    header: string;
    /** `null` = column not recognised, ignored by the importer. */
    field: string | null;
}

export interface ImportIssue {
    field: string | null;
    code: string;
    /** Developer English from the API: never shown, the UI uses the translated text for `code`. */
    message?: string;
}

export interface ImportDuplicate {
    reason: string;
    clubMemberId: string | null;
    line: number | null;
}

export type ImportRowStatus = 'ok' | 'duplicate' | 'error';

export interface ImportRow {
    line: number;
    status: ImportRowStatus;
    issues: ImportIssue[];
    duplicates?: ImportDuplicate[];
}

export interface ImportSummary {
    rows: number;
    ok: number;
    duplicates: number;
    errors: number;
}

export interface ImportDryRun {
    dryRun: true;
    committable: boolean;
    delimiter: string;
    columns: ImportColumn[];
    summary: ImportSummary;
    rows: ImportRow[];
    confirmToken: string;
    confirmTokenExpiresAt: string;
}

export interface ImportCommit {
    dryRun: false;
    created: number;
    skippedDuplicates: number;
    skippedSinceDryRun: number;
    summary: ImportSummary;
    rows: ImportRow[];
}

/** Removes a leading UTF-8 byte order mark (Excel writes one; `File.text()` usually already drops it). */
export function stripBom(text: string): string {
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** UTF-8 size of the text in bytes, the unit the backend limit is measured in. */
export function utf8Size(text: string): number {
    return new TextEncoder().encode(text).length;
}

/** Counts the report rows by status; the authoritative numbers come from the API, this is the cross-check/fallback. */
export function summarizeRows(rows: readonly Pick<ImportRow, 'status'>[]): ImportSummary {
    const summary: ImportSummary = { rows: rows.length, ok: 0, duplicates: 0, errors: 0 };
    for (const row of rows) {
        if (row.status === 'ok') summary.ok++;
        else if (row.status === 'duplicate') summary.duplicates++;
        else summary.errors++;
    }
    return summary;
}

/** Rows that need attention (duplicate or error), in file order. */
export function problemRows<T extends Pick<ImportRow, 'status'>>(rows: readonly T[]): T[] {
    return rows.filter((r) => r.status !== 'ok');
}

/** How often each issue code occurs over all rows, most frequent first (ties by code), for the "what went wrong" overview. */
export function issueCounts(rows: readonly Pick<ImportRow, 'issues'>[]): { code: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const row of rows) for (const issue of row.issues) counts.set(issue.code, (counts.get(issue.code) ?? 0) + 1);
    return [...counts.entries()].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

/** Column-mapping overrides: header -> field key, `'ignore'`, or `''` (= keep the automatic detection). */
export type MappingOverrides = Record<string, string>;

/**
 * Body value for `mapping`: only the headers the user actually changed. `undefined` when nothing was changed, so the
 * backend keeps detecting. Built with `Object.fromEntries` (own keys only, a header like `__proto__` stays harmless).
 */
export function mappingPayload(overrides: MappingOverrides): Record<string, string> | undefined {
    const entries = Object.entries(overrides).filter(([, value]) => value === 'ignore' || isImportField(value));
    return entries.length === 0 ? undefined : Object.fromEntries(entries);
}

/** Field a column ends up as after the overrides: `null` = ignored. */
export function effectiveField(column: ImportColumn, overrides: MappingOverrides): string | null {
    const override = Object.prototype.hasOwnProperty.call(overrides, column.header) ? overrides[column.header] : '';
    if (override === 'ignore') return null;
    if (override && isImportField(override)) return override;
    return column.field;
}

/** Fields that more than one column would fill (the backend would not know which one wins): shown as a warning. */
export function mappingConflicts(columns: readonly ImportColumn[], overrides: MappingOverrides): string[] {
    const seen = new Map<string, number>();
    for (const column of columns) {
        const field = effectiveField(column, overrides);
        if (field) seen.set(field, (seen.get(field) ?? 0) + 1);
    }
    return [...seen.entries()].filter(([, n]) => n > 1).map(([field]) => field);
}

/** True when the overrides differ from what the last dry run used (so the report is outdated and must be re-run). */
export function mappingChanged(applied: MappingOverrides, current: MappingOverrides): boolean {
    return JSON.stringify(mappingPayload(applied) ?? null) !== JSON.stringify(mappingPayload(current) ?? null);
}

// --- Export ---------------------------------------------------------------------------------

/** Export columns (backend `EXPORT_COLUMNS`) in the backend's order; `sensitive` needs `members:read_sensitive`. */
export const EXPORT_COLUMNS: readonly { key: string; sensitive: boolean }[] = [
    { key: 'memberNumber', sensitive: true },
    { key: 'displayName', sensitive: false },
    { key: 'firstName', sensitive: false },
    { key: 'lastName', sensitive: false },
    { key: 'birthDate', sensitive: true },
    { key: 'category', sensitive: false },
    { key: 'status', sensitive: false },
    { key: 'joinedAt', sensitive: false },
    { key: 'leftAt', sensitive: false },
    { key: 'street', sensitive: true },
    { key: 'postalCode', sensitive: true },
    { key: 'city', sensitive: true },
    { key: 'phone', sensitive: true },
    { key: 'contactEmail', sensitive: true },
    { key: 'emergencyContactName', sensitive: true },
    { key: 'emergencyContactPhone', sensitive: true },
    { key: 'departments', sensitive: false },
    { key: 'accountEmail', sensitive: true },
];

/** Columns the caller may pick: all with `members:read_sensitive`, otherwise the non-sensitive ones only. */
export function selectableColumns(canSensitive: boolean): string[] {
    return EXPORT_COLUMNS.filter((c) => canSensitive || !c.sensitive).map((c) => c.key);
}

/** Default selection = everything the caller may export (the backend default is the same). */
export function defaultExportColumns(canSensitive: boolean): string[] {
    return selectableColumns(canSensitive);
}

/** Toggles a column; the result keeps the canonical order and never contains a column the caller may not export. */
export function toggleExportColumn(selected: readonly string[], key: string, canSensitive: boolean): string[] {
    const allowed = new Set(selectableColumns(canSensitive));
    if (!allowed.has(key)) return EXPORT_COLUMNS.map((c) => c.key).filter((k) => selected.includes(k) && allowed.has(k));
    const next = new Set(selected.filter((k) => allowed.has(k)));
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return EXPORT_COLUMNS.map((c) => c.key).filter((k) => next.has(k));
}

export interface ExportFilters {
    status: string;
    category: string;
    departmentId: string;
    includeFormer: boolean;
}

/** Query string of `GET /club-members/export`; no `columns` param when the selection equals the default. */
export function buildExportQuery(clubId: string, columns: readonly string[], filters: ExportFilters, canSensitive: boolean): string {
    const p = new URLSearchParams({ clubId });
    const allowed = new Set(selectableColumns(canSensitive));
    const picked = EXPORT_COLUMNS.map((c) => c.key).filter((k) => columns.includes(k) && allowed.has(k));
    p.set('columns', picked.join(','));
    if (filters.status) p.set('status', filters.status);
    if (filters.category) p.set('category', filters.category);
    if (filters.departmentId) p.set('departmentId', filters.departmentId);
    if (filters.includeFormer) p.set('includeFormer', 'true');
    return p.toString();
}

// --- Download -------------------------------------------------------------------------------

/** File name from a `Content-Disposition` header, sanitised for use as a download name; `fallback` when absent/odd. */
export function filenameFromDisposition(header: string | null, fallback: string): string {
    if (!header) return fallback;
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
    if (!match?.[1]) return fallback;
    let name = match[1].trim();
    try {
        name = decodeURIComponent(name);
    } catch {
        // keep the raw value
    }
    name = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/^\.+/, '');
    return name || fallback;
}

/**
 * Downloads a CSV from the backend as a blob (`fetch` with the session cookie; `authClient.$fetch` would parse the body
 * as JSON). A failed request is turned into the same `ApiError` as `apiFetch` so `errorMessage` works unchanged.
 */
export async function fetchCsvBlob(path: string, fallbackName: string): Promise<{ blob: Blob; filename: string }> {
    let res: Response;
    try {
        res = await fetch(`${backendUrl}${path}`, { credentials: 'include', headers: { Accept: 'text/csv' } });
    } catch {
        // Network failure: not an ApiError, memberErrorKey maps it to the "no connection" text.
        throw new TypeError('network');
    }
    if (!res.ok) {
        let code = 'UNKNOWN';
        let message = 'Request failed';
        let details: unknown;
        try {
            const body = (await res.json()) as { error?: { code?: string; message?: string; details?: unknown } };
            code = body.error?.code ?? code;
            message = body.error?.message ?? message;
            details = body.error?.details;
        } catch {
            // non-JSON error body
        }
        throw new ApiError(res.status, code, message, details);
    }
    return { blob: await res.blob(), filename: filenameFromDisposition(res.headers.get('Content-Disposition'), fallbackName) };
}

/** Hands a blob to the browser as a file download. */
export function saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
