import { ApiError } from './api-client';
import { backendUrl } from './auth-client';
import { memberErrorKey } from './clubMembers';
import { apiErrorFromBody, progressPercent } from './formUpload';
import { fetchFileBlob, saveBlob } from './memberCsv';

/**
 * Documents (Wave 13): club documents (`club_info`), archive, personal storage, branding and storage quota. Types follow the
 * backend contract (Part A); the helpers are pure where possible so they are unit-tested.
 */

export type DocLevel = 'lesen' | 'schreiben' | 'verwalten';

export interface DocVersionSummary {
    versionNo: number;
    mimeType: string;
    sizeBytes: number;
    originalFilename: string | null;
    createdAt: string;
}

export interface ArchiveDocument {
    id: string;
    folderId: string | null;
    kind: 'hochgeladen' | 'erzeugt';
    docType: string;
    title: string;
    status: 'aktiv' | 'im_papierkorb';
    trashedAt: string | null;
    createdAt: string;
    updatedAt: string;
    level: DocLevel;
    currentVersion: DocVersionSummary | null;
    retentionUntil?: string | null;
    legalHold?: boolean;
}

export interface DocumentVersionRow extends DocVersionSummary {
    sha256: string;
    note: string | null;
    generated: boolean;
}

export interface Folder {
    id: string;
    parentId: string | null;
    name: string;
    systemKey: string | null;
    level: DocLevel;
}

export interface FolderPermissionEntry {
    subjectType: 'rolle' | 'abteilung' | 'mitglied';
    roleType?: string | null;
    departmentId?: string | null;
    clubMemberId?: string | null;
    name?: string | null;
    level: DocLevel;
}

export interface PersonalDocument {
    id: string;
    title: string;
    docType: string;
    kind: string;
    source: 'member' | 'vorstand' | 'erzeugt';
    hidden: boolean;
    createdAt: string;
    mimeType: string;
    sizeBytes: number;
    originalFilename: string | null;
    canDelete: boolean;
    canHide: boolean;
    retentionUntil?: string | null;
    legalHold?: boolean;
}

export interface PersonalDocuments {
    data: PersonalDocument[];
    relation: 'self' | 'guardian' | 'board';
    owner: { clubMemberId: string; displayName: string; hasAccount: boolean };
}

export interface StorageOverview {
    usedBytes: number;
    quotaBytes: number;
    percent: number;
    areas: { documents: number; personal: number; generated: number; branding: number; other: number };
    trashBytes: number;
}

export interface Branding {
    primaryColor: string | null;
    accentColor: string | null;
    effective: { primaryColor: string; accentColor: string };
    letterhead: { address: string | null; register: string | null; representatives: string | null; contact: string | null; footer: string | null };
    logo: { url: string } | null;
}

export interface ClubInfoSummary {
    id: string;
    slug: string;
    title: string;
    externalUrl: string | null;
    hasContent: boolean;
    hasAttachment: boolean;
    validFrom: string | null;
    currentVersion: number;
    updatedAt: string;
}

export interface ClubInfoDetail extends ClubInfoSummary {
    contentMarkdown: string | null;
    attachment: { documentId: string; title: string; mimeType: string; sizeBytes: number } | null;
}

export interface ClubInfoVersionRow {
    versionNo: number;
    title: string;
    validFrom: string | null;
    note: string | null;
    hasAttachment: boolean;
    createdAt: string;
    createdByName: string | null;
    current: boolean;
}

/** Same limits as the backend: PDF, JPEG, PNG, WebP up to 10 MB (logo: PNG/JPEG up to 2 MB). */
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const DOCUMENT_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';
const DOCUMENT_TYPES = DOCUMENT_ACCEPT.split(',');

/** Translation key of a client-side file problem, `null` if the file may be sent (the server checks the content again). */
export function fileProblem(file: { size: number; type: string }, kind: 'document' | 'logo' = 'document'): string | null {
    if (file.size === 0) return 'docs.err.empty';
    if (kind === 'logo') {
        if (file.type !== 'image/png' && file.type !== 'image/jpeg') return 'docs.err.logoType';
        return file.size > LOGO_MAX_BYTES ? 'docs.err.logoSize' : null;
    }
    if (!DOCUMENT_TYPES.includes(file.type)) return 'docs.err.type';
    return file.size > DOCUMENT_MAX_BYTES ? 'docs.err.size' : null;
}

export function formatBytes(bytes: number, language = 'de'): string {
    if (!Number.isFinite(bytes) || bytes < 0) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }
    const digits = unit === 0 ? 0 : value < 10 ? 1 : 0;
    return `${new Intl.NumberFormat(language, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value)} ${units[unit]}`;
}

/** Translation key for a failed documents call; `details.code` of the backend wins over the status. */
export function documentErrorKey(err: unknown): string {
    if (err instanceof ApiError) {
        const code = (err.details as { code?: unknown } | undefined)?.code;
        switch (code) {
            case 'club_quota':
                return 'docs.err.quota';
            case 'folder_depth':
                return 'docs.err.folderDepth';
            case 'folder_not_empty':
                return 'docs.err.folderNotEmpty';
            case 'retention':
                return 'docs.err.retention';
            case 'member_document_limit':
                return 'docs.err.memberLimit';
            case 'not_deletable':
                return 'docs.err.notDeletable';
            case 'low_contrast':
                return 'docs.err.lowContrast';
            case 'logo_type':
                return 'docs.err.logoType';
            case 'logo_dimensions':
                return 'docs.err.logoDimensions';
        }
        if (err.code === 'QUOTA_EXCEEDED') return 'docs.err.quota';
        if (err.status === 404) return 'docs.err.notFound';
        if (err.status === 429) return 'docs.err.rate';
        if (err.status === 413) return 'docs.err.size';
        if (err.status === 409) return 'docs.err.conflict';
        if (err.status === 422 || err.status === 400) return 'docs.err.invalid';
    }
    return memberErrorKey(err);
}

/**
 * Multipart upload with progress (XHR, `fetch` cannot report upload progress). Rejects with an `ApiError`, `TypeError('network')`
 * on a network failure or `Error('aborted')` when `signal` fires.
 */
export function uploadWithProgress<T>(
    method: 'POST' | 'PUT',
    path: string,
    fields: Record<string, string | undefined>,
    file: Blob,
    filename: string,
    onProgress: (percent: number | null) => void,
    signal?: AbortSignal,
): Promise<T> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(new Error('aborted'));
        const xhr = new XMLHttpRequest();
        const body = new FormData();
        for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== '') body.append(k, v);
        body.append('file', file, filename);
        xhr.open(method, `${backendUrl}${path}`);
        xhr.withCredentials = true;
        xhr.responseType = 'text';
        xhr.upload.onprogress = (e) => onProgress(e.lengthComputable ? progressPercent(e.loaded, e.total) : null);
        xhr.onerror = () => reject(new TypeError('network'));
        xhr.onabort = () => reject(new Error('aborted'));
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    resolve(JSON.parse(xhr.responseText) as T);
                } catch {
                    reject(new ApiError(xhr.status, 'UNKNOWN', 'Invalid response'));
                }
            } else reject(apiErrorFromBody(xhr.status, xhr.responseText));
        };
        signal?.addEventListener('abort', () => xhr.abort(), { once: true });
        xhr.send(body);
    });
}

/** Authenticated download (session cookie, never a link): fetches the bytes and hands them to the browser as a file. */
export async function downloadDocument(path: string, fallbackName: string): Promise<void> {
    const { blob, filename } = await fetchFileBlob(path, fallbackName, { accept: '*/*' });
    saveBlob(blob, filename);
}

/** Opens a PDF in a new tab from an authenticated request (blob URL, not a public link). */
export async function openPdf(path: string, method: 'GET' | 'POST' = 'GET'): Promise<void> {
    const { blob } = await fetchFileBlob(path, 'document.pdf', { accept: 'application/pdf', method, body: method === 'POST' ? {} : undefined });
    const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const clubQuery = (clubId: string) => `clubId=${encodeURIComponent(clubId)}`;

export interface FolderNode extends Folder {
    children: FolderNode[];
}

/** Folder tree sorted by name; a folder whose parent is not readable (not in the list) becomes a root. */
export function buildFolderTree(folders: readonly Folder[]): FolderNode[] {
    const nodes = new Map<string, FolderNode>(folders.map((f) => [f.id, { ...f, children: [] }]));
    const roots: FolderNode[] = [];
    for (const node of nodes.values()) {
        const parent = node.parentId ? nodes.get(node.parentId) : undefined;
        (parent ? parent.children : roots).push(node);
    }
    const sort = (list: FolderNode[]) => {
        list.sort((a, b) => a.name.localeCompare(b.name, 'de'));
        for (const n of list) sort(n.children);
    };
    sort(roots);
    return roots;
}

/** Path of a folder from the root, for breadcrumbs and "move to" labels. */
export function folderPath(folders: readonly Folder[], id: string | null): Folder[] {
    const byId = new Map(folders.map((f) => [f.id, f]));
    const path: Folder[] = [];
    for (let cur = id ? byId.get(id) : undefined; cur && path.length < 10; cur = cur.parentId ? byId.get(cur.parentId) : undefined) path.unshift(cur);
    return path;
}

export const levelRank: Record<DocLevel, number> = { lesen: 1, schreiben: 2, verwalten: 3 };
export const atLeast = (level: DocLevel | null | undefined, needed: DocLevel): boolean => !!level && levelRank[level] >= levelRank[needed];

export type RetentionState = { kind: 'hold' } | { kind: 'until'; date: string } | { kind: 'none' };

/** Retention status of a document: legal hold wins, then a retention date still in the future (Europe/Berlin `today`). */
export function retentionState(doc: { retentionUntil?: string | null; legalHold?: boolean }, today: string): RetentionState {
    if (doc.legalHold) return { kind: 'hold' };
    if (doc.retentionUntil && doc.retentionUntil >= today) return { kind: 'until', date: doc.retentionUntil };
    return { kind: 'none' };
}

export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,59}$/;

/** Suggests a slug from a title ("Beitragsordnung 2026" -> "beitragsordnung-2026"). */
export function slugify(title: string): string {
    return title
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)
        .replace(/-+$/g, '');
}

/** Only http/https for the external link of a club document (the server refuses everything else with 422). */
export function isHttpUrl(value: string): boolean {
    try {
        const u = new URL(value);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}

/** Fraction of the quota used as 0..100 (clamped), for the progress bar. */
export function quotaPercent(used: number, quota: number): number {
    if (!(quota > 0)) return 0;
    return Math.max(0, Math.min(100, Math.round((used / quota) * 100)));
}

export type QuotaTone = 'ok' | 'warn' | 'full';
export const quotaTone = (percent: number): QuotaTone => (percent >= 100 ? 'full' : percent >= 80 ? 'warn' : 'ok');

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export interface BrandingForm {
    primaryColor: string;
    accentColor: string;
    address: string;
    register: string;
    representatives: string;
    contact: string;
    footer: string;
}

export const BRANDING_LIMITS = { address: 300, register: 200, representatives: 300, contact: 300, footer: 160 } as const;

export function brandingToForm(b: Branding): BrandingForm {
    return {
        primaryColor: b.primaryColor ?? '',
        accentColor: b.accentColor ?? '',
        address: b.letterhead.address ?? '',
        register: b.letterhead.register ?? '',
        representatives: b.letterhead.representatives ?? '',
        contact: b.letterhead.contact ?? '',
        footer: b.letterhead.footer ?? '',
    };
}

/** Partial PATCH body: only changed fields, an emptied field becomes `null` (clears it). */
export function brandingPatch(original: BrandingForm, next: BrandingForm): Record<string, string | null> {
    const patch: Record<string, string | null> = {};
    for (const key of Object.keys(original) as (keyof BrandingForm)[]) {
        if (original[key] !== next[key]) patch[key] = next[key].trim() === '' ? null : next[key];
    }
    return patch;
}

/** Translation key of the first problem of the branding form, `null` if it can be sent. */
export function brandingProblem(form: BrandingForm): string | null {
    for (const key of ['primaryColor', 'accentColor'] as const) if (form[key] !== '' && !HEX_COLOR.test(form[key])) return 'docs.branding.err.color';
    for (const key of Object.keys(BRANDING_LIMITS) as (keyof typeof BRANDING_LIMITS)[]) if (form[key].length > BRANDING_LIMITS[key]) return 'docs.branding.err.tooLong';
    return null;
}
