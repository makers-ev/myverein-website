import { ApiError } from './api-client';
import { memberErrorKey } from './clubMembers';
import { type CredentialExpiry, type CredentialStatus, DEFAULT_EXPIRING_DAYS, EXPIRING_WINDOWS, isCredentialStatus } from './credentials';
import type { EnteredBy } from './customFields';
import type { FieldOption } from './formEditor';

/**
 * Pure helpers of the credential overview "Qualifikationen" (`GET /club-members/credentials`): who holds which qualification and
 * until when, for the board, trainers and department heads. The server decides who may call it (403 for everybody else, 404
 * for an unknown/invisible field) and sorts the rows (by `validUntil`, expired first); the client keeps that order.
 */

export const OVERVIEW_PAGE_SIZE = 25;

export interface OverviewField {
    id: string;
    key: string;
    label: string;
    sensitive: boolean;
    options: FieldOption[] | null;
}

export interface OverviewRow {
    clubMemberId: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
    fieldKey: string;
    fieldLabel: string;
    sensitive: boolean;
    value: { valid?: boolean; level?: string; obtainedOn?: string; validUntil?: string } | null;
    updatedAt: string | null;
    expiry: CredentialExpiry;
    enteredBy?: EnteredBy | null;
}

export interface Overview {
    data: OverviewRow[];
    page: number;
    pageSize: number;
    total: number;
    /** Today in Europe/Berlin as the server counted it. */
    today: string;
    withinDays: number;
    fields: OverviewField[];
}

export interface OverviewFilters {
    fieldKey: string;
    status: '' | CredentialStatus;
    withinDays: number;
    includeFormer: boolean;
}

export const emptyOverviewFilters = (): OverviewFilters => ({ fieldKey: '', status: '', withinDays: DEFAULT_EXPIRING_DAYS, includeFormer: false });

export const isOverviewFiltered = (f: OverviewFilters): boolean => f.fieldKey !== '' || f.status !== '' || f.withinDays !== DEFAULT_EXPIRING_DAYS || f.includeFormer;

/** `status=missing` lists people who do NOT hold a given credential, so it only makes sense with a field. */
export const canFilterMissing = (f: Pick<OverviewFilters, 'fieldKey'>): boolean => f.fieldKey !== '';

/** Filters made consistent with what the server accepts: an unknown field is dropped, `missing` needs a field, the window is a known one. */
export function normalizeFilters(f: OverviewFilters, fields: readonly Pick<OverviewField, 'key'>[]): OverviewFilters {
    const fieldKey = fields.some((x) => x.key === f.fieldKey) ? f.fieldKey : '';
    const status = f.status === 'missing' && fieldKey === '' ? '' : isCredentialStatus(f.status) ? f.status : '';
    const withinDays = (EXPIRING_WINDOWS as readonly number[]).includes(f.withinDays) ? f.withinDays : DEFAULT_EXPIRING_DAYS;
    return { fieldKey, status, withinDays, includeFormer: f.includeFormer };
}

/**
 * Query string of the overview. Only what differs from the server defaults is sent; `missing` without a field is never sent
 * (the server would answer 422 `field_key_required`).
 */
export function buildOverviewQuery(clubId: string, f: OverviewFilters, page: number, pageSize = OVERVIEW_PAGE_SIZE): string {
    const q = new URLSearchParams({ clubId });
    if (f.fieldKey !== '') q.set('fieldKey', f.fieldKey);
    if (f.status !== '' && !(f.status === 'missing' && f.fieldKey === '')) q.set('status', f.status);
    if (f.withinDays !== DEFAULT_EXPIRING_DAYS) q.set('withinDays', String(f.withinDays));
    if (f.includeFormer) q.set('includeFormer', 'true');
    if (page > 1) q.set('page', String(page));
    q.set('pageSize', String(pageSize));
    return q.toString();
}

export const pageCount = (total: number, pageSize: number): number => Math.max(1, Math.ceil(total / Math.max(1, pageSize)));

/** Name to show: the display name, else first + last name, else `null`. */
export function rowName(row: Pick<OverviewRow, 'displayName' | 'firstName' | 'lastName'>): string | null {
    const display = row.displayName?.trim();
    if (display) return display;
    const full = [row.firstName, row.lastName].map((x) => x?.trim() ?? '').filter(Boolean).join(' ');
    return full || null;
}

/** Well-formed overview or `null`. */
export function asOverview(value: unknown): Overview | null {
    const v = value as Partial<Overview> | null;
    if (!v || !Array.isArray(v.data) || !Array.isArray(v.fields) || typeof v.total !== 'number' || typeof v.page !== 'number' || typeof v.pageSize !== 'number') return null;
    return { today: '', withinDays: DEFAULT_EXPIRING_DAYS, ...v } as Overview;
}

/** The overview is for the board and Funktionsträger: 403 (everybody else, guests) means "not for you", not an error. */
export const isOverviewForbidden = (err: unknown): boolean => err instanceof ApiError && err.status === 403;

/** Translation key for a failed overview request. 404 = the chosen field is gone (archived/invisible meanwhile). */
export function overviewErrorKey(err: unknown): string {
    if (err instanceof ApiError) {
        if (err.status === 404) return 'forms.cred.overview.err.fieldGone';
        if (err.status === 422) return 'forms.cred.overview.err.invalid';
        if (err.status === 429) return 'forms.cred.overview.err.rate';
    }
    return memberErrorKey(err);
}

/** Entry shown to the board only if the endpoint answers with at least one credential field. */
export const hasCredentialFields = (overview: Pick<Overview, 'fields'> | null): boolean => !!overview && overview.fields.length > 0;
