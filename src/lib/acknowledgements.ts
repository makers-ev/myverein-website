import { ApiError } from './api-client';
import { documentErrorKey } from './documents';

/**
 * Acknowledgements (Wave 13 W7, backend `/acknowledgements`): the board asks people to read one version of an archive document and
 * confirm it. Legally this is a simple electronic confirmation, not a qualified signature -- the UI always says so (`notice`).
 */

export type AckStatus = 'offen' | 'bestaetigt' | 'abgelehnt' | 'abgelaufen';
export type GivenBy = 'self' | 'guardian' | 'board_paper';

export interface MyAcknowledgement {
    id: string;
    documentTitle: string;
    versionNo: number;
    clubMemberId: string;
    personName: string;
    relation: 'self' | 'guardian';
    status: AckStatus;
    wording: string;
    requestedAt: string;
    dueAt: string | null;
    respondedAt: string | null;
    requiresReauth: boolean;
    canAnswer: boolean;
    isCurrentVersion: boolean;
}

export interface AcknowledgementDetail {
    id: string;
    documentId: string | null;
    documentTitle: string;
    versionNo: number;
    sha256: string;
    mimeType: string;
    clubMemberId: string;
    personName: string;
    status: AckStatus;
    wording: string;
    requestedAt: string;
    dueAt: string | null;
    respondedAt: string | null;
    givenBy: GivenBy | null;
    requiresReauth: boolean;
    canAnswer: boolean;
    relation: 'self' | 'guardian' | 'manager';
    isCurrentVersion: boolean;
    notice: string;
}

export interface ManagedAcknowledgement {
    id: string;
    documentId: string;
    documentTitle: string;
    versionNo: number;
    clubMemberId: string;
    personName: string;
    status: AckStatus;
    requestedAt: string;
    dueAt: string | null;
    respondedAt: string | null;
    givenBy: GivenBy | null;
    actedByName: string | null;
    proofDate: string | null;
    proofSource: string | null;
    requiresReauth: boolean;
}

export type AckSummary = Record<AckStatus, number>;

export interface Audience {
    all?: boolean;
    departmentIds?: string[];
    categoryKeys?: string[];
    clubMemberIds?: string[];
}

/** Open requests first (oldest due date first), then the rest newest first. */
export function sortInbox<T extends Pick<MyAcknowledgement, 'status' | 'dueAt' | 'requestedAt' | 'respondedAt'>>(rows: readonly T[]): T[] {
    const open = rows.filter((r) => r.status === 'offen').sort((a, b) => (a.dueAt ?? '9999-12-31').localeCompare(b.dueAt ?? '9999-12-31') || a.requestedAt.localeCompare(b.requestedAt));
    const rest = rows.filter((r) => r.status !== 'offen').sort((a, b) => (b.respondedAt ?? b.requestedAt).localeCompare(a.respondedAt ?? a.requestedAt));
    return [...open, ...rest];
}

/** Whether the request is due within `days` (inclusive) or already late, for the "bald fällig" hint. */
export function dueSoon(dueAt: string | null, today: string, days = 3): boolean {
    if (!dueAt) return false;
    const limit = new Date(`${today}T00:00:00Z`);
    limit.setUTCDate(limit.getUTCDate() + days);
    return dueAt <= limit.toISOString().slice(0, 10);
}

/** An audience needs at least one criterion; this mirrors the server's `audience_empty`. */
export function audienceEmpty(a: Audience): boolean {
    return !a.all && !(a.departmentIds?.length) && !(a.categoryKeys?.length) && !(a.clubMemberIds?.length);
}

/** Body audience without empty parts. */
export function cleanAudience(a: Audience): Audience {
    if (a.all) return { all: true };
    const out: Audience = {};
    if (a.departmentIds?.length) out.departmentIds = a.departmentIds;
    if (a.categoryKeys?.length) out.categoryKeys = a.categoryKeys;
    if (a.clubMemberIds?.length) out.clubMemberIds = a.clubMemberIds;
    return out;
}

/** Share of answered requests in percent (confirmed or declined), for the progress bar of the overview. */
export function answeredPercent(summary: AckSummary): number {
    const total = summary.offen + summary.bestaetigt + summary.abgelehnt + summary.abgelaufen;
    return total === 0 ? 0 : Math.round(((summary.bestaetigt + summary.abgelehnt) / total) * 100);
}

/** Translation key for a failed acknowledgement call (`details.code` first). */
export function ackErrorKey(err: unknown): string {
    if (err instanceof ApiError) {
        const code = (err.details as { code?: unknown } | undefined)?.code;
        switch (code) {
            case 'already_answered':
                return 'docs.ack.err.alreadyAnswered';
            case 'expired':
                return 'docs.ack.err.expired';
            case 'member_left':
                return 'docs.ack.err.memberLeft';
            case 'guardian_required':
                return 'docs.ack.err.guardianRequired';
            case 'reauth_required':
                return 'docs.ack.err.reauthRequired';
            case 'reauth_failed':
                return 'docs.ack.err.reauthFailed';
            case 'audience_empty':
                return 'docs.ack.err.audienceEmpty';
            case 'audience_too_large':
                return 'docs.ack.err.audienceTooLarge';
            case 'document_not_available':
                return 'docs.ack.err.documentNotAvailable';
        }
        if (err.status === 429) return 'docs.err.rate';
        if (err.status === 422) return 'docs.ack.err.invalid';
    }
    return documentErrorKey(err);
}
