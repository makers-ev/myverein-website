import { ApiError } from './api-client';
import { formErrorKey } from './formSchema';
import { formatDate, memberErrorKey } from './clubMembers';

/**
 * Types and pure helpers of the board's review of applications (Wave 8 W4): `GET /club-applications` (page of list rows
 * with a short answer summary) and `GET /club-applications/:id` (answers rendered against the version the person filled in).
 */

export const APPLICATIONS_PAGE_SIZE = 20;

export interface AnswerSummaryItem {
    key: string;
    label: string;
    display: string;
}

/** Row of `GET /club-applications`. `birthDate` is `null` without `members:read_sensitive`. */
export interface ClubApplication {
    id: string;
    userId: string;
    name: string | null;
    email: string | null;
    category: string | null;
    birthDate: string | null;
    status: string;
    onBehalfOf: 'self' | 'guardian';
    createdAt: string;
    formSubmissionId: string | null;
    /** Filed before the form builder (or by an old client): category and birth date only. */
    legacy: boolean;
    /** The person the application is for (the child for a child application). */
    subjectName: string | null;
    summary: AnswerSummaryItem[];
    fileCount: number;
    /** `null` = no consent record (legacy). */
    consentGiven: boolean | null;
}

export interface ApplicationPage {
    data: ClubApplication[];
    page: number;
    pageSize: number;
    total: number;
}

export interface RenderedAnswer {
    key: string;
    label: string;
    type: string;
    required: boolean;
    sensitive: boolean;
    /** Protected and the caller may not read it: no value. */
    redacted: boolean;
    answered: boolean;
    value: unknown;
    display: string | string[] | boolean | number | null;
}

export interface MappingEntry {
    fieldKey: string;
    fieldLabel: string;
    kind: 'master' | 'category' | 'photo' | 'custom' | 'none';
    target: string | null;
    customFieldKey: string | null;
    targetLabel: string | null;
    willApply: boolean;
    reason?: string;
}

export interface ReviewFile {
    id: string;
    fieldKey: string;
    fieldLabel: string | null;
    kind: string;
    sensitive: boolean;
    redacted: boolean;
    filename: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
    /** Authenticated retrieval path (fetch with the session cookie); `null` when protected. Never a public URL. */
    path: string | null;
}

export interface DuplicateHint {
    clubMemberId: string;
    displayName: string;
    matches: Array<'name_birth_date' | 'email'>;
}

export interface ApplicationReview {
    application: { id: string; status: string; onBehalfOf: 'self' | 'guardian'; legacy: boolean; createdAt: string; decidedAt: string | null; category: string; birthDate: string | null };
    applicant: { userId: string; name: string; email: string };
    subject: { displayName: string | null; birthDate: string | null; ageYears: number | null; ageBand: '<18' | '>=18' | null; isMinor: boolean | null };
    form: { version: number; name: string; privacyNotice: string | null } | null;
    answers: RenderedAnswer[];
    answersRetained: boolean;
    mapping: { preview: boolean; entries: MappingEntry[] };
    files: ReviewFile[];
    consent: {
        consentFieldKeys: string[];
        textSha256: string;
        consentedAt: string | null;
        role: 'self' | 'guardian';
        givenBy: { userId: string; name: string };
        fields: Array<{ key: string; label: string; given: boolean }>;
        privacyNoticeShown: boolean;
    } | null;
    duplicates: DuplicateHint[];
    warnings: string[];
    decision: { decidedAt: string | null; decisionNote: string | null; internalNote: string | null } | null;
}

export interface MappingReport {
    applied: string[];
    customFields: number;
    skipped: Array<{ fieldKey: string; reason: string }>;
}

/** Result of `POST /club-applications/:id/approve`. */
export interface ApproveResult {
    application: { id: string };
    mapping?: MappingReport;
    guardian?: { name?: string | null } | null;
}

export function listQuery(clubId: string, page: number, pageSize = APPLICATIONS_PAGE_SIZE): string {
    return `clubId=${encodeURIComponent(clubId)}&page=${Math.max(1, Math.trunc(page))}&pageSize=${pageSize}`;
}

/** Page to show after a reload: the requested one, or the last existing page when decisions emptied it. */
export function clampPage(page: number, total: number, pageSize = APPLICATIONS_PAGE_SIZE): number {
    const last = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
    return Math.min(Math.max(1, page), last);
}

/** Body of the approve call: only an explicit category choice is sent (`categoryId`), otherwise the applicant's wish stands. */
export function approveBody(categoryId: string): { categoryId: string } | undefined {
    return categoryId ? { categoryId } : undefined;
}

export const NOTE_MAX_LENGTH = 1000;

/** Body of the reject call: the internal note stays with the board, `applicantMessage` is shown to the applicant; empty texts are omitted. */
export function rejectBody(note: string, applicantMessage: string): { note?: string; applicantMessage?: string } {
    const n = note.trim();
    const m = applicantMessage.trim();
    return { ...(n ? { note: n } : {}), ...(m ? { applicantMessage: m } : {}) };
}

/** Text of an answer for the review list: option labels already resolved by the server; booleans as yes/no. */
export function answerText(answer: Pick<RenderedAnswer, 'answered' | 'display'> & { type?: string }, t: (key: string) => string, language?: string): string {
    if (!answer.answered || answer.display === null || answer.display === undefined) return '—';
    if (typeof answer.display === 'boolean') return t(answer.display ? 'forms.review.yes' : 'forms.review.no');
    if (Array.isArray(answer.display)) return answer.display.join(', ');
    // Date fields arrive as `YYYY-MM-DD`: shown like every other date of the app (calendar day, no time-zone shift).
    if (language && answer.type === 'date') return displayDate(String(answer.display), language);
    return String(answer.display);
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A `YYYY-MM-DD` value in the language's date format via the central helper; anything else stays as it is. */
export function displayDate(value: string, language: string): string {
    return ISO_DAY.test(value) ? formatDate(value, language) : value;
}

const MAPPING_REASONS = new Set([
    'not_answered',
    'no_file',
    'unknown_target',
    'type_mismatch',
    'not_a_text',
    'invalid_value',
    'custom_field_unknown',
    'custom_field_archived',
    'custom_field_type_mismatch',
    'custom_field_not_sensitive',
]);

/** Translation key for why a mapping entry will not be applied; unknown reasons get the generic text. */
export function mappingReasonKey(reason: string | undefined): string {
    return reason && MAPPING_REASONS.has(reason) ? `forms.review.mapping.reason.${reason}` : 'forms.review.mapping.reason.other';
}

const MAPPING_TARGETS = new Set([
    'firstName',
    'lastName',
    'birthDate',
    'street',
    'postalCode',
    'city',
    'phone',
    'contactEmail',
    'emergencyContactName',
    'emergencyContactPhone',
    'category',
    'photo',
]);

/** Name of the target of a mapping entry: the translated allowlist target, or the custom field's label/key. `null` = not mapped. */
export function mappingTargetText(entry: MappingEntry, t: (key: string, params?: Record<string, string | number>) => string): string | null {
    if (entry.target && MAPPING_TARGETS.has(entry.target)) return t(`forms.review.target.${entry.target}`);
    if (entry.kind === 'custom') {
        // The server label reads `Zusatzfeld „Label“`; the label is data, the frame is translated.
        const match = /„(.+)“/.exec(entry.targetLabel ?? '');
        return t('forms.review.target.custom', { name: match?.[1] ?? entry.customFieldKey ?? '' });
    }
    return null;
}

export function duplicateKindKey(matches: DuplicateHint['matches']): string {
    const name = matches.includes('name_birth_date');
    const mail = matches.includes('email');
    if (name && mail) return 'forms.review.duplicate.both';
    return mail ? 'forms.review.duplicate.email' : 'forms.review.duplicate.name';
}

const REVIEW_WARNINGS = new Set(['child_is_adult', 'birth_date_missing', 'child_name_matches_guardian']);

export function reviewWarningKey(warning: unknown): string | null {
    return typeof warning === 'string' && REVIEW_WARNINGS.has(warning) ? `forms.review.warn.${warning}` : null;
}

/** Short hash for the consent evidence (the full SHA-256 is long; 12 characters identify the text state). */
export function shortHash(hash: string): string {
    return hash.slice(0, 12);
}

/**
 * The list is stale only if the application is gone (404), was withdrawn (`application_withdrawn`) or already decided.
 * A busy decision (`decision_busy`) or "already a member" is a hint, not staleness: the buttons stay (retry / reject still possible).
 */
export function isStaleDecision(err: unknown): boolean {
    if (!(err instanceof ApiError)) return false;
    if (err.status === 404) return true;
    if (err.status !== 409) return false;
    const code = (err.details as { code?: unknown } | undefined)?.code;
    if (code === 'application_withdrawn') return true;
    if (code === 'decision_busy') return false;
    return /already been decided/i.test(err.message);
}

/** Translation key for a failed review request (load or decision). */
export function reviewErrorKey(err: unknown): string {
    if (err instanceof ApiError && err.status === 409) {
        const code = (err.details as { code?: unknown } | undefined)?.code;
        if (code === 'application_withdrawn' || code === 'decision_busy') return formErrorKey(err);
        if (/already been decided/i.test(err.message)) return 'forms.review.err.decided';
        if (/already a member/i.test(err.message)) return 'forms.review.err.alreadyMember';
    }
    if (err instanceof ApiError && err.status === 404) return 'forms.review.err.gone';
    if (err instanceof ApiError && err.status === 422 && /unknown or archived category/i.test(err.message)) return 'forms.review.err.category';
    return err instanceof ApiError ? formErrorKey(err) : memberErrorKey(err);
}

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const EXTENSIONS: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/**
 * File name for a download: path separators, control characters, bidi overrides/isolates and zero-width characters are removed,
 * trailing dots/spaces and Windows-reserved device names are neutralised, the length is capped and the extension follows the
 * MIME type the server stored (a name cannot claim another type).
 */
export function safeDownloadName(name: string | null | undefined, mimeType?: string | null, fallback = 'datei'): string {
    let cleaned = (name ?? '')
        .replace(/[\\/:*?"<>|\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\u2028\u2029\ufeff]/g, '_')
        .replace(/^\.+/, '')
        .replace(/[. ]+$/, '')
        .trim();
    const ext = mimeType ? EXTENSIONS[mimeType.toLowerCase()] : undefined;
    let base = cleaned;
    let dot = cleaned.lastIndexOf('.');
    // Only a short alphanumeric tail counts as an extension.
    if (dot > 0 && !/^[a-z0-9]{1,8}$/i.test(cleaned.slice(dot + 1))) dot = -1;
    if (dot > 0) base = cleaned.slice(0, dot);
    base = base.replace(/[. ]+$/, '');
    if (!base || WINDOWS_RESERVED.test(base)) base = base ? `_${base}` : fallback;
    base = Array.from(base).slice(0, 80).join('');
    cleaned = ext ? `${base}.${ext}` : dot > 0 ? `${base}${cleaned.slice(dot)}` : base;
    return cleaned;
}
