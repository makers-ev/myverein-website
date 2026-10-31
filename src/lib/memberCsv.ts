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

/**
 * Column-mapping overrides, one entry per file column (by position, so columns with the same heading stay separate):
 * a field key, `'ignore'`, or `''`/missing (= keep the automatic detection).
 */
export type MappingOverrides = readonly string[];

/** The backend limits a mapping key (the heading) to 200 characters; longer headings cannot be mapped explicitly. */
export const MAX_MAPPING_HEADER = 200;

export function canMapHeader(header: string): boolean {
    return header.length <= MAX_MAPPING_HEADER;
}

function validOverride(value: string | undefined): value is string {
    return value === 'ignore' || isImportField(value);
}

/**
 * Body value for `mapping`: heading -> field for the columns the user actually changed (the backend keys by heading
 * text, the first override of a heading wins). `undefined` when nothing was changed, so the backend keeps detecting.
 * Built with `Object.fromEntries` (own keys only, a heading like `__proto__` stays harmless).
 */
export function mappingPayload(columns: readonly ImportColumn[], overrides: MappingOverrides): Record<string, string> | undefined {
    const entries = new Map<string, string>();
    columns.forEach((column, i) => {
        const value = overrides[i];
        if (validOverride(value) && canMapHeader(column.header) && !entries.has(column.header)) entries.set(column.header, value);
    });
    return entries.size === 0 ? undefined : Object.fromEntries(entries);
}

/** Field a column ends up as after its override: `null` = ignored. `column` must be the automatic baseline. */
export function effectiveField(column: ImportColumn, override: string | undefined): string | null {
    if (override === 'ignore') return null;
    if (override && isImportField(override)) return override;
    return column.field;
}

/** Fields that more than one column would fill (the backend would not know which one wins): shown as a warning. */
export function mappingConflicts(columns: readonly ImportColumn[], overrides: MappingOverrides): string[] {
    const seen = new Map<string, number>();
    columns.forEach((column, i) => {
        const field = effectiveField(column, overrides[i]);
        if (field) seen.set(field, (seen.get(field) ?? 0) + 1);
    });
    return [...seen.entries()].filter(([, n]) => n > 1).map(([field]) => field);
}

/** Headings that occur several times with different overrides (the backend maps by heading text, so this cannot be expressed). */
export function headerConflicts(columns: readonly ImportColumn[], overrides: MappingOverrides): string[] {
    const first = new Map<string, string>();
    const bad = new Set<string>();
    columns.forEach((column, i) => {
        const value = validOverride(overrides[i]) ? overrides[i]! : '';
        if (!first.has(column.header)) first.set(column.header, value);
        else if (first.get(column.header) !== value) bad.add(column.header);
    });
    return [...bad];
}

/** True when the overrides differ from what the last dry run used (so the report is outdated and must be re-run). */
export function mappingChanged(columns: readonly ImportColumn[], applied: MappingOverrides, current: MappingOverrides): boolean {
    return JSON.stringify(mappingPayload(columns, applied) ?? null) !== JSON.stringify(mappingPayload(columns, current) ?? null);
}

/** Commit failures after which the dry-run report and its token are void and the file has to be checked again. */
const VOID_REPORT_CODES = ['import_has_errors', 'import_nothing_to_do', 'import_not_confirmed', 'import_already_applied'] as const;

export function importVoidCode(err: unknown): (typeof VOID_REPORT_CODES)[number] | null {
    if (!(err instanceof ApiError)) return null;
    const code = (err.details as { code?: unknown } | undefined)?.code;
    return (VOID_REPORT_CODES as readonly unknown[]).includes(code) ? (code as (typeof VOID_REPORT_CODES)[number]) : null;
}

/** True for the shared per-user rate limit of template/import/export (429). */
export function isRateLimited(err: unknown): boolean {
    return err instanceof ApiError && err.status === 429;
}

/**
 * Decodes the raw bytes of a picked file. Only UTF-8 is accepted (with or without BOM): an Excel "CSV (Trennzeichen-
 * getrennt)" file is Windows-1252 and would silently turn umlauts into garbage, so it is refused with a hint to save as
 * "CSV UTF-8". UTF-16 and binary files are refused too.
 */
export function decodeCsvBytes(buffer: ArrayBuffer): { text: string } | { error: 'encoding' | 'too_large' } {
    if (buffer.byteLength > IMPORT_MAX_BYTES) return { error: 'too_large' };
    const bytes = new Uint8Array(buffer);
    if (bytes.length >= 2 && ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff))) return { error: 'encoding' };
    try {
        const text = stripBom(new TextDecoder('utf-8', { fatal: true }).decode(buffer));
        return text.includes('\u0000') ? { error: 'encoding' } : { text };
    } catch {
        return { error: 'encoding' };
    }
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

/** Export column of a custom field (`cf:<key>`, opt-in, header = the field's label); `null` for a key that cannot be a field key. */
export function customExportColumn(key: string): string | null {
    return /^[a-z][a-z0-9_]{1,40}$/.test(key) ? `cf:${key}` : null;
}

/**
 * Custom fields an exporter may pick: live ones, protected (`sensitive`) ones only with `members:read_sensitive` (the server
 * answers every other key with `422 unknown_column`).
 */
export function exportableCustomFields<T extends { key: string; archived: boolean; sensitive: boolean }>(defs: readonly T[], canSensitive: boolean): T[] {
    return defs.filter((d) => !d.archived && (canSensitive || !d.sensitive) && customExportColumn(d.key) !== null);
}

/**
 * Query string of `GET /club-members/export`; no `columns` param when the selection equals the default. `customKeys` are the
 * keys of custom fields to add as `cf:<key>` columns after the standard ones (never part of the default selection).
 */
export function buildExportQuery(clubId: string, columns: readonly string[], filters: ExportFilters, canSensitive: boolean, customKeys: readonly string[] = []): string {
    const p = new URLSearchParams({ clubId });
    const allowed = new Set(selectableColumns(canSensitive));
    const picked: string[] = EXPORT_COLUMNS.map((c) => c.key).filter((k) => columns.includes(k) && allowed.has(k));
    for (const key of customKeys) {
        const column = customExportColumn(key);
        if (column && !picked.includes(column)) picked.push(column);
    }
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
export async function fetchCsvBlob(path: string, fallbackName: string, signal?: AbortSignal): Promise<{ blob: Blob; filename: string }> {
    return fetchFileBlob(path, fallbackName, { accept: 'text/csv', signal });
}

/** Same for any file download (CSV, the personal data export as JSON/HTML); `body` makes it a JSON `POST`. */
export async function fetchFileBlob(
    path: string,
    fallbackName: string,
    options: { accept: string; method?: 'GET' | 'POST'; body?: unknown; signal?: AbortSignal },
): Promise<{ blob: Blob; filename: string }> {
    let res: Response;
    try {
        res = await fetch(`${backendUrl}${path}`, {
            method: options.method ?? 'GET',
            credentials: 'include',
            // Personal data and exports must never come out of the HTTP cache.
            cache: 'no-store',
            headers: { Accept: options.accept, ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
            ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
            signal: options.signal,
        });
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
