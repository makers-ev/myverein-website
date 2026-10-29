import { describe, expect, it } from 'vitest';

import { ApiError } from './api-client';
import { atLeast, buildFolderTree, documentErrorKey, fileProblem, folderPath, formatBytes, isHttpUrl, quotaPercent, quotaTone, retentionState, slugify, SLUG_PATTERN } from './documents';

const f = (id: string, parentId: string | null, name: string) => ({ id, parentId, name, systemKey: null, level: 'lesen' as const });

describe('fileProblem', () => {
    it('accepts the allowlist and refuses the rest', () => {
        expect(fileProblem({ size: 10, type: 'application/pdf' })).toBeNull();
        expect(fileProblem({ size: 0, type: 'application/pdf' })).toBe('docs.err.empty');
        expect(fileProblem({ size: 10, type: 'image/svg+xml' })).toBe('docs.err.type');
        expect(fileProblem({ size: 11 * 1024 * 1024, type: 'application/pdf' })).toBe('docs.err.size');
    });
    it('limits the logo to PNG/JPEG up to 2 MB', () => {
        expect(fileProblem({ size: 10, type: 'image/webp' }, 'logo')).toBe('docs.err.logoType');
        expect(fileProblem({ size: 3 * 1024 * 1024, type: 'image/png' }, 'logo')).toBe('docs.err.logoSize');
        expect(fileProblem({ size: 100, type: 'image/png' }, 'logo')).toBeNull();
    });
});

describe('formatBytes', () => {
    it('scales units', () => {
        expect(formatBytes(512, 'en')).toBe('512 B');
        expect(formatBytes(1536, 'en')).toBe('1.5 KB');
        expect(formatBytes(5 * 1024 * 1024, 'en')).toBe('5.0 MB');
        expect(formatBytes(-1)).toBe('—');
    });
});

describe('documentErrorKey', () => {
    it('maps details.code before the status', () => {
        expect(documentErrorKey(new ApiError(422, 'QUOTA_EXCEEDED', 'x', { code: 'club_quota' }))).toBe('docs.err.quota');
        expect(documentErrorKey(new ApiError(409, 'CONFLICT', 'x', { code: 'folder_not_empty' }))).toBe('docs.err.folderNotEmpty');
        expect(documentErrorKey(new ApiError(409, 'CONFLICT', 'x', { code: 'retention' }))).toBe('docs.err.retention');
        expect(documentErrorKey(new ApiError(404, 'NOT_FOUND', 'x'))).toBe('docs.err.notFound');
        expect(documentErrorKey(new ApiError(429, 'TOO_MANY_REQUESTS', 'x'))).toBe('docs.err.rate');
    });
    it('treats a network failure as such', () => expect(documentErrorKey(new TypeError('network'))).toBe('verein.err.network'));
});

describe('folder tree', () => {
    const list = [f('b', 'a', 'Zwei'), f('a', null, 'Wurzel'), f('c', 'a', 'Eins'), f('d', 'missing', 'Waise')];
    it('sorts children and turns an unreadable parent into a root', () => {
        const tree = buildFolderTree(list);
        expect(tree.map((n) => n.id)).toEqual(['d', 'a']);
        expect(tree[1]!.children.map((n) => n.id)).toEqual(['c', 'b']);
    });
    it('builds the path from the root', () => expect(folderPath(list, 'b').map((n) => n.id)).toEqual(['a', 'b']));
    it('has an empty path without a folder', () => expect(folderPath(list, null)).toEqual([]));
});

describe('levels', () => {
    it('orders lesen < schreiben < verwalten', () => {
        expect(atLeast('verwalten', 'schreiben')).toBe(true);
        expect(atLeast('lesen', 'schreiben')).toBe(false);
        expect(atLeast(null, 'lesen')).toBe(false);
    });
});

describe('retentionState', () => {
    it('prefers the legal hold, then a future date', () => {
        expect(retentionState({ legalHold: true, retentionUntil: '2020-01-01' }, '2026-10-28')).toEqual({ kind: 'hold' });
        expect(retentionState({ retentionUntil: '2027-01-01' }, '2026-10-28')).toEqual({ kind: 'until', date: '2027-01-01' });
        expect(retentionState({ retentionUntil: '2026-01-01' }, '2026-10-28')).toEqual({ kind: 'none' });
        expect(retentionState({}, '2026-10-28')).toEqual({ kind: 'none' });
    });
});

describe('slug and urls', () => {
    it('suggests a valid slug', () => {
        expect(slugify('Beitragsordnung 2026')).toBe('beitragsordnung-2026');
        expect(slugify('Größe & Ärger!')).toBe('groesse-aerger');
        expect(SLUG_PATTERN.test(slugify('Satzung'))).toBe(true);
        expect(SLUG_PATTERN.test('-x')).toBe(false);
    });
    it('accepts only http(s) links', () => {
        expect(isHttpUrl('https://x.de')).toBe(true);
        expect(isHttpUrl('javascript:alert(1)')).toBe(false);
        expect(isHttpUrl('x.de')).toBe(false);
    });
});

describe('quota', () => {
    it('clamps the percentage and picks the tone', () => {
        expect(quotaPercent(50, 200)).toBe(25);
        expect(quotaPercent(500, 200)).toBe(100);
        expect(quotaPercent(1, 0)).toBe(0);
        expect([quotaTone(10), quotaTone(80), quotaTone(100)]).toEqual(['ok', 'warn', 'full']);
    });
});

import { brandingPatch, brandingProblem, brandingToForm } from './documents';

describe('branding form', () => {
    const base = brandingToForm({ primaryColor: '#112233', accentColor: null, effective: { primaryColor: '#112233', accentColor: '#000000' }, letterhead: { address: 'Weg 1', register: null, representatives: null, contact: null, footer: null }, logo: null });
    it('sends only changed fields and clears emptied ones', () => {
        expect(brandingPatch(base, base)).toEqual({});
        expect(brandingPatch(base, { ...base, address: '', footer: 'Danke' })).toEqual({ address: null, footer: 'Danke' });
    });
    it('rejects bad colours and too long texts', () => {
        expect(brandingProblem({ ...base, primaryColor: 'red' })).toBe('docs.branding.err.color');
        expect(brandingProblem({ ...base, footer: 'x'.repeat(161) })).toBe('docs.branding.err.tooLong');
        expect(brandingProblem({ ...base, accentColor: '' })).toBeNull();
    });
});
