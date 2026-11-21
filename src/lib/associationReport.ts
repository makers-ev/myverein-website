import { ApiError } from './api-client';
import { memberErrorKey, todayIso } from './clubMembers';

/**
 * Association report ("Verbandsmeldung", Wave 15 W5, backend `GET /club-stats/association-report`): counts of members by
 * department, age group, gender and category on a reference day, as a CSV for the sports federation or similar. Counts only, no
 * names. Pure helpers (query, age-band parsing, error wording) live here so they are unit-tested; the dialog only renders.
 */

export const REPORT_COLUMNS = ['department', 'ageGroup', 'gender', 'category'] as const;
export type ReportColumn = (typeof REPORT_COLUMNS)[number];
export const DEFAULT_COLUMNS: readonly ReportColumn[] = ['department', 'ageGroup'];

/** Backend default of `ageBands`: upper bounds of the groups 0-6, 7-14, 15-18, 19-26, 27-40, 41-60, 61+. */
export const DEFAULT_AGE_BANDS = '6,14,18,26,40,60';
export const MAX_AGE_BANDS = 12;

export type AgeMode = 'jahrgang' | 'stichtag';
export type Delimiter = ';' | ',';

export interface ReportOptions {
    stichtag: string;
    columns: readonly ReportColumn[];
    ageBands: string;
    ageMode: AgeMode;
    genderField: string;
    delimiter: Delimiter;
}

export const defaultOptions = (): ReportOptions => ({ stichtag: todayIso(), columns: DEFAULT_COLUMNS, ageBands: DEFAULT_AGE_BANDS, ageMode: 'jahrgang', genderField: '', delimiter: ';' });

/** Toggles a column, keeping the canonical order. */
export function toggleColumn(selected: readonly ReportColumn[], column: ReportColumn): ReportColumn[] {
    return REPORT_COLUMNS.filter((c) => (c === column ? !selected.includes(c) : selected.includes(c)));
}

/** Parses `6,14,18` into ascending whole numbers; `null` when it is not a list of strictly ascending integers from 1 to 120. */
export function parseAgeBands(input: string): number[] | null {
    const parts = input.split(',').map((p) => p.trim());
    if (parts.length === 0 || parts.length > MAX_AGE_BANDS || parts.some((p) => !/^\d{1,3}$/.test(p))) return null;
    const nums = parts.map(Number);
    if (nums.some((n) => n < 1 || n > 120)) return null;
    return nums.every((n, i) => i === 0 || n > nums[i - 1]!) ? nums : null;
}

/** Labels of the age groups for the given bounds, like the backend writes them (`0-6`, `7-14`, ..., `61+`). */
export function ageGroupLabels(bands: readonly number[]): string[] {
    const labels: string[] = [];
    let from = 0;
    for (const upper of bands) {
        labels.push(`${from}-${upper}`);
        from = upper + 1;
    }
    labels.push(`${from}+`);
    return labels;
}

/** Translation key of the first problem of the options, or `null`. */
export function optionsProblem(o: ReportOptions): string | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.stichtag)) return 'assoc.err.stichtag';
    if (o.columns.length === 0) return 'assoc.err.columns';
    if (o.columns.includes('ageGroup') && parseAgeBands(o.ageBands) === null) return 'assoc.err.ageBands';
    if (o.columns.includes('gender') && o.genderField === '') return 'assoc.err.genderField';
    return null;
}

/** Query string of the report; parameters at their default (or not used by the chosen columns) are left out. */
export function reportQuery(clubId: string, o: ReportOptions, format: 'json' | 'csv'): string {
    const p = new URLSearchParams({ clubId, stichtag: o.stichtag, columns: o.columns.join(',') });
    if (o.columns.includes('ageGroup')) {
        if (o.ageBands.replace(/\s/g, '') !== DEFAULT_AGE_BANDS) p.set('ageBands', o.ageBands.replace(/\s/g, ''));
        if (o.ageMode !== 'jahrgang') p.set('ageMode', o.ageMode);
    }
    if (o.columns.includes('gender') && o.genderField) p.set('genderField', o.genderField);
    p.set('format', format);
    if (format === 'csv' && o.delimiter !== ';') p.set('delimiter', o.delimiter);
    return p.toString();
}

export interface ReportRow {
    department?: string;
    ageGroup?: string;
    gender?: string;
    category?: string;
    count: number;
}

export interface ReportPreview {
    stichtag: string;
    columns: ReportColumn[];
    ageGroups: string[];
    ageMode: AgeMode;
    rows: ReportRow[];
    total: number;
    note: string;
}

/** A field that can carry the gender: a live select or text field; protected ones only with `members:read_sensitive`. */
export function genderFieldCandidates<T extends { type: string; archived: boolean; sensitive: boolean }>(defs: readonly T[], canSensitive: boolean): T[] {
    return defs.filter((d) => !d.archived && (d.type === 'select' || d.type === 'text') && (canSensitive || !d.sensitive));
}

export function reportFilename(stichtag: string): string {
    return `verbandsmeldung-${stichtag}.csv`;
}

/** Plain-language key for a failed report request. */
export function reportErrorKey(err: unknown): string {
    if (err instanceof ApiError) {
        const code = (err.details as { code?: unknown } | undefined)?.code;
        if (code === 'gender_field_required') return 'assoc.err.genderField';
        if (code === 'unknown_gender_field') return 'assoc.err.genderUnknown';
        if (code === 'invalid_age_bands') return 'assoc.err.ageBands';
        // A protected gender field without the right to read protected data is a plain 403 (no details.code).
        if (err.status === 403) return 'assoc.err.sensitive';
    }
    return memberErrorKey(err);
}
