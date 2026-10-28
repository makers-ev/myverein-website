import { ApiError, apiFetch } from './api-client';
import { documentErrorKey } from './documents';

/**
 * Generating PDFs (Wave 13 W6, backend `/document-generation`). Types follow the Part A/B contract; everything that needs no
 * browser is pure so it is unit-tested.
 */

export const JOB_STATUSES = ['wartet', 'rendert', 'fertig', 'fehlgeschlagen'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_ERROR_CODES = ['render_timeout', 'render_limit', 'render_failed', 'quota_exceeded', 'source_unavailable', 'internal_error'] as const;
export type JobErrorCode = (typeof JOB_ERROR_CODES)[number];

export interface RenderJob {
    id: string;
    templateId: string;
    templateVersion: number;
    status: JobStatus;
    errorCode: JobErrorCode | null;
    documentId: string | null;
    attempts: number;
    createdAt: string;
    finishedAt: string | null;
}

export interface GenerationTemplate {
    id: string;
    version: number;
    label: string;
    description: string;
    destination: 'archive' | 'person' | 'ephemeral';
    sync: boolean;
    docType: string;
}

/** Where the finished document of a job lands: the archive or the personal storage of one person. */
export type ResultTarget = { kind: 'archive' } | { kind: 'person'; memberId: string };

export const isActiveJob = (job: Pick<RenderJob, 'status'>): boolean => job.status === 'wartet' || job.status === 'rendert';

/** Seconds to wait before the next status request: quick at first, slower for long jobs. */
export function pollDelayMs(attempt: number): number {
    if (attempt < 5) return 1500;
    if (attempt < 15) return 3000;
    return 6000;
}

/** After this many polls the dialog says that it takes longer than usual (the job keeps running, nothing is lost). */
export const POLL_SLOW_AFTER = 20;

/** Translation key for the `errorCode` of a failed job. Never shows server text. */
export function jobErrorKey(code: string | null | undefined): string {
    switch (code) {
        case 'render_timeout':
            return 'docs.gen.job.err.render_timeout';
        case 'render_limit':
            return 'docs.gen.job.err.render_limit';
        case 'quota_exceeded':
            return 'docs.gen.job.err.quota_exceeded';
        case 'source_unavailable':
            return 'docs.gen.job.err.source_unavailable';
        default:
            return 'docs.gen.job.err.render_failed';
    }
}

/** Translation key for a refused generation request (`details.code` first, then status), falls back to the documents mapping. */
export function generationErrorKey(err: unknown): string {
    if (err instanceof ApiError) {
        const code = (err.details as { code?: unknown } | undefined)?.code;
        switch (code) {
            case 'as_of_in_future':
                return 'docs.gen.err.asOfFuture';
            case 'not_a_member_on_date':
                return 'docs.gen.err.notMember';
            case 'year_in_future':
                return 'docs.gen.err.yearFuture';
            case 'minutes_not_approved':
                return 'docs.gen.err.minutesNotApproved';
            case 'ephemeral_template':
                return 'docs.gen.err.invalid';
        }
        if (err.code === 'QUOTA_EXCEEDED') return documentErrorKey(err);
        if (err.status === 403) return 'docs.gen.err.forbidden';
        if (err.status === 429) return 'docs.gen.err.rate';
        if (err.status === 422 || err.status === 400) return 'docs.gen.err.invalid';
    }
    return documentErrorKey(err);
}

/** Authenticated download path of a finished result. */
export function resultDownloadPath(target: ResultTarget, documentId: string, clubQ: string): string {
    return target.kind === 'person'
        ? `/member-documents/${encodeURIComponent(target.memberId)}/${encodeURIComponent(documentId)}/download?${clubQ}`
        : `/documents/${encodeURIComponent(documentId)}/download?${clubQ}`;
}

export const MEMBER_LIST_COLUMNS = ['memberNumber', 'name', 'category', 'status', 'joinedAt', 'birthDate', 'address', 'phone', 'email', 'departments'] as const;
export type MemberListColumn = (typeof MEMBER_LIST_COLUMNS)[number];
export const MEMBER_LIST_DEFAULT_COLUMNS: readonly MemberListColumn[] = ['memberNumber', 'name', 'category', 'status', 'joinedAt'];

/** Chosen columns in the fixed order of the report (the checkboxes carry no order); empty means "nothing chosen". */
export function orderedColumns(chosen: ReadonlySet<string> | readonly string[]): MemberListColumn[] {
    const set = new Set(chosen);
    return MEMBER_LIST_COLUMNS.filter((c) => set.has(c));
}

/** Body `params` of the member list; empty/default values are left out so the server defaults apply. */
export function memberListParams(input: { columns: readonly string[]; asOf: string; includeLeft: boolean; departmentId: string }): Record<string, unknown> {
    const params: Record<string, unknown> = { columns: orderedColumns(input.columns) };
    if (input.asOf) params.asOf = input.asOf;
    if (input.includeLeft) params.includeLeft = true;
    if (input.departmentId) params.departmentId = input.departmentId;
    return params;
}

/** Years offered for the annual report: the current year and the five before, newest first. */
export function reportYears(currentYear: number, count = 6): number[] {
    return Array.from({ length: count }, (_, i) => currentYear - i);
}

/** Cached template lists per club (templates change only with a deploy), so many buttons on a page cost one request. */
const templateCache = new Map<string, { at: number; promise: Promise<GenerationTemplate[] | null> }>();
const TEMPLATE_TTL_MS = 60_000;

export function loadTemplates(clubId: string, now = Date.now()): Promise<GenerationTemplate[] | null> {
    const hit = templateCache.get(clubId);
    if (hit && now - hit.at < TEMPLATE_TTL_MS) return hit.promise;
    const promise = apiFetch<{ data: GenerationTemplate[] }>(`/document-generation/templates?clubId=${encodeURIComponent(clubId)}`)
        .then((res) => res.data)
        // No access (external guest, no club) or a network problem: offer nothing, the action simply does not appear.
        .catch(() => null)
        .then((list) => {
            // A failure is not remembered, the next page view asks again.
            if (list === null) templateCache.delete(clubId);
            return list;
        });
    templateCache.set(clubId, { at: now, promise });
    return promise;
}

export function clearTemplateCache(): void {
    templateCache.clear();
}

/** Whether the template list offers `id` (only job-backed templates; ephemeral ones have their own routes). */
export function offers(templates: readonly GenerationTemplate[] | null | undefined, id: string): boolean {
    return !!templates?.some((t) => t.id === id && t.destination !== 'ephemeral');
}
