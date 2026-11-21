import { describe, expect, it, vi } from 'vitest';

vi.mock('./auth-client', () => ({ backendUrl: 'https://api.example' }));

import {
    changedDraft,
    fetchPublicClub,
    isLive,
    isSearchable,
    metaDescription,
    normalizeClubHits,
    normalizeEditorData,
    normalizePublicClub,
    previewClub,
    publicClubJsonLd,
    safeHttpUrl,
    imageProblem,
    searchClubs,
    submitLead,
    trustedClientIp,
} from './publicClub';

const raw = {
    slug: 'tsv-beispiel',
    name: 'TSV Beispiel',
    tagline: 'Sport für alle',
    description: 'Wir sind ein Verein.',
    city: 'Musterstadt',
    address: null,
    contact: { email: 'info@tsv.example', phone: null, website: 'javascript:alert(1)' },
    logoUrl: 'https://api.example/media/abc',
    coverUrl: null,
    galleryUrls: ['https://api.example/media/g1', 'data:text/html,x'],
    departments: [{ id: 'd1', name: 'Fußball' }, { id: '', name: 'kaputt' }],
    events: [
        { title: 'Training', startsAt: '2026-12-01T17:00:00.000Z', endsAt: null, allDay: false, cancelled: true, locationName: 'Halle' },
        { title: 'Kaputt', startsAt: 'nope' },
    ],
    sponsors: [{ name: 'Bäckerei', website: 'https://baeckerei.example', logoUrl: null }],
    leadForm: { enabled: true, trialTraining: true, departments: [{ id: 'd1', name: 'Fußball' }] },
    secretField: 'must not survive',
};

describe('normalizePublicClub', () => {
    it('keeps released fields and drops everything else', () => {
        const club = normalizePublicClub(raw)!;
        expect(club.name).toBe('TSV Beispiel');
        expect(club).not.toHaveProperty('secretField');
        expect(club.departments).toEqual([{ id: 'd1', name: 'Fußball' }]);
        expect(club.events).toHaveLength(1);
        expect(club.events[0].cancelled).toBe(true);
        expect(club.galleryUrls).toEqual(['https://api.example/media/g1']);
        expect(club.leadForm.trialTraining).toBe(true);
        expect(club.indexable).toBe(false);
    });
    it('never keeps a non-http website', () => {
        expect(normalizePublicClub(raw)!.contact).toEqual({ email: 'info@tsv.example', phone: null, website: null });
    });
    it('rejects an unusable answer', () => {
        expect(normalizePublicClub(null)).toBeNull();
        expect(normalizePublicClub({ slug: 'x' })).toBeNull();
    });
});

describe('privacy notice of the club', () => {
    it('is kept only with text and only inside the lead form', () => {
        const withNotice = normalizePublicClub({ ...raw, leadForm: { ...raw.leadForm, privacyNotice: { version: 3, body: 'Wir speichern ...', publishedAt: '2026-11-01T00:00:00.000Z' } } })!;
        expect(withNotice.leadForm.privacyNotice).toEqual({ version: 3, body: 'Wir speichern ...', publishedAt: '2026-11-01T00:00:00.000Z' });
        expect(normalizePublicClub(raw)!.leadForm.privacyNotice).toBeNull();
        expect(normalizePublicClub({ ...raw, leadForm: { enabled: true, privacyNotice: { version: 1, body: '  ' } } })!.leadForm.privacyNotice).toBeNull();
    });
});

describe('safeHttpUrl', () => {
    it('accepts http(s) only', () => {
        expect(safeHttpUrl('https://a.example/x')).toBe('https://a.example/x');
        expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
        expect(safeHttpUrl('  ')).toBeNull();
        expect(safeHttpUrl(5)).toBeNull();
    });
});

describe('fetchPublicClub', () => {
    const ok = (status: number, body: unknown) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
    it('maps 404 to notFound and does not call for malformed slugs', async () => {
        const f = ok(404, {});
        expect(await fetchPublicClub('tsv', null, f)).toEqual({ kind: 'notFound' });
        const g = vi.fn() as unknown as typeof fetch;
        expect(await fetchPublicClub('../etc', null, g)).toEqual({ kind: 'notFound' });
        expect(g).not.toHaveBeenCalled();
    });
    it('maps errors to unavailable (never to notFound)', async () => {
        expect(await fetchPublicClub('tsv', null, ok(500, {}))).toEqual({ kind: 'unavailable' });
        expect(await fetchPublicClub('tsv', null, ok(429, {}))).toEqual({ kind: 'unavailable' });
        expect(await fetchPublicClub('tsv', null, vi.fn().mockRejectedValue(new Error('down')) as unknown as typeof fetch)).toEqual({ kind: 'unavailable' });
    });
    it('returns the normalized club', async () => {
        const r = await fetchPublicClub('tsv-beispiel', null, ok(200, { data: raw }));
        expect(r.kind).toBe('ok');
    });
    it('sends no cookies', async () => {
        const f = ok(200, { data: raw });
        await fetchPublicClub('tsv-beispiel', null, f);
        expect((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1]).toMatchObject({ credentials: 'omit', cache: 'no-store' });
    });
});

describe('meta and JSON-LD', () => {
    it('shortens the description to 160 characters on one line', () => {
        const d = metaDescription({ name: 'A', tagline: null, description: `x\n${'y'.repeat(300)}`, city: null });
        expect(d.length).toBeLessThanOrEqual(160);
        expect(d).not.toContain('\n');
    });
    it('falls back to name and city', () => {
        expect(metaDescription({ name: 'TSV', tagline: null, description: null, city: 'Ulm' })).toBe('TSV in Ulm');
    });
    it('contains released fields only', () => {
        const json = publicClubJsonLd(normalizePublicClub(raw)!, 'https://x.example/v/tsv-beispiel');
        expect(json).toMatchObject({ '@type': 'SportsOrganization', name: 'TSV Beispiel', email: 'info@tsv.example' });
        expect(json).not.toHaveProperty('telephone');
        expect(json).not.toHaveProperty('sameAs');
        expect(JSON.stringify(json)).not.toContain('Bäckerei');
    });
});

describe('club search', () => {
    it('needs 3 characters of name or 2 of place', () => {
        expect(isSearchable('ab', '')).toBe(false);
        expect(isSearchable('  ab ', '')).toBe(false);
        expect(isSearchable('abc', '')).toBe(true);
        expect(isSearchable('', 'Ul')).toBe(true);
        expect(isSearchable('', 'U')).toBe(false);
    });
    it('keeps slug, name, city and logo only', () => {
        const hits = normalizeClubHits([{ slug: 'a-b', name: 'A', city: 'X', logoUrl: null, members: 400 }, { slug: 'Bad Slug', name: 'B' }, { name: 'C' }]);
        expect(hits).toEqual([{ slug: 'a-b', name: 'A', city: 'X', logoUrl: null }]);
    });
    it('does not call below the thresholds and maps status codes', async () => {
        const never = vi.fn() as unknown as typeof fetch;
        expect(await searchClubs('ab', '', undefined, never)).toEqual({ kind: 'tooShort' });
        expect(never).not.toHaveBeenCalled();
        const res = (status: number, body: unknown = {}) => vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
        expect(await searchClubs('abc', '', undefined, res(429))).toEqual({ kind: 'rateLimited' });
        expect(await searchClubs('abc', '', undefined, res(400))).toEqual({ kind: 'tooShort' });
        expect(await searchClubs('abc', '', undefined, res(500))).toEqual({ kind: 'error' });
        expect(await searchClubs('abc', '', undefined, res(200, { data: [] }))).toEqual({ kind: 'ok', hits: [] });
    });
    it('sends only the filled and long enough parameters', async () => {
        const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 })) as unknown as typeof fetch;
        await searchClubs(' tsv ', 'U', undefined, f);
        expect(String((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0])).toMatch(/\/public\/clubs\?q=tsv$/);
    });
});

describe('submitLead', () => {
    it('posts to the lead route of the slug', async () => {
        const f = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { status: 'received' } }), { status: 202 })) as unknown as typeof fetch;
        const r = await submitLead('tsv', { name: 'Anna', email: 'a@b.de', privacyAccepted: true, website: '' }, f);
        expect(r.kind).toBe('ok');
        expect(String((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0])).toMatch(/\/public\/clubs\/tsv\/leads$/);
    });
    it('maps rate limit and validation', async () => {
        const res = (status: number) => vi.fn().mockResolvedValue(new Response('{}', { status })) as unknown as typeof fetch;
        const body = { name: 'Anna', email: 'a@b.de', privacyAccepted: true as const, website: '' };
        expect((await submitLead('tsv', body, res(429))).kind).toBe('rateLimited');
        expect((await submitLead('tsv', body, res(422))).kind).toBe('invalid');
        expect((await submitLead('tsv', body, res(404))).kind).toBe('notFound');
    });
});

describe('editor helpers', () => {
    const editor = normalizeEditorData({
        settings: { publicProfileEnabled: true, discoverable: false },
        draft: { tagline: 'Hi', departmentIds: ['d1'], showSponsors: true, logoKey: 'k1', logoUrl: 'https://api.example/media/k1?sig=1' },
        published: { publishedAt: '2026-11-01T10:00:00.000Z', publishedBy: null },
        hasUnpublishedChanges: true,
        slug: 'tsv',
        publicPath: '/v/tsv',
    })!;
    it('parses the editor state', () => {
        expect(editor.draft.departmentIds).toEqual(['d1']);
        expect(editor.hasUnpublishedChanges).toBe(true);
        expect(isLive(editor)).toBe(true);
        expect(isLive({ publicProfileEnabled: true, publishedAt: null })).toBe(false);
        expect(isLive({ publicProfileEnabled: false, publishedAt: 'x' })).toBe(false);
        expect(normalizeEditorData({})).toBeNull();
    });
    it('is off by default', () => {
        const e = normalizeEditorData({ slug: 'x', settings: {}, draft: {}, published: null })!;
        expect(e.publicProfileEnabled).toBe(false);
        expect(e.discoverable).toBe(false);
        expect(isLive(e)).toBe(false);
        expect(e.draft.showSponsors).toBe(false);
        expect(e.draft.leadFormEnabled).toBe(false);
    });
    it('sends changed editable fields only', () => {
        expect(changedDraft(editor.draft, editor.draft)).toEqual({});
        expect(changedDraft(editor.draft, { ...editor.draft, city: 'Ulm', departmentIds: [], logoUrl: null })).toEqual({ city: 'Ulm', departmentIds: [] });
    });
    it('previews released parts only', () => {
        const p = previewClub({ ...editor.draft, departmentIds: ['d2'], contactEmail: ' ', website: 'ftp://x' }, { slug: 'tsv', name: 'TSV', departments: [{ id: 'd1', name: 'A' }, { id: 'd2', name: 'B' }] });
        expect(p.departments).toEqual([{ id: 'd2', name: 'B' }]);
        expect(p.contact).toBeNull();
        expect(p.events).toEqual([]);
        expect(p.indexable).toBe(false);
    });
});

describe('trustedClientIp', () => {
    const read = (h: Record<string, string>) => (n: string) => h[n] ?? null;
    it('forwards nothing without a configured trusted header (safe default)', () => {
        expect(trustedClientIp(read({ 'x-forwarded-for': '1.2.3.4' }), {})).toBeNull();
    });
    it('takes the entry the nearest trusted proxy added, not the forgeable left side', () => {
        const env = { PUBLIC_CLIENT_IP_HEADER: 'X-Forwarded-For' };
        expect(trustedClientIp(read({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' }), env)).toBe('203.0.113.9');
        expect(trustedClientIp(read({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9, 10.0.0.1' }), { ...env, PUBLIC_CLIENT_IP_HOPS: '2' })).toBe('203.0.113.9');
    });
    it('rejects garbage', () => {
        expect(trustedClientIp(read({ 'x-real-ip': '<script>' }), { PUBLIC_CLIENT_IP_HEADER: 'x-real-ip' })).toBeNull();
        expect(trustedClientIp(read({}), { PUBLIC_CLIENT_IP_HEADER: 'x-real-ip' })).toBeNull();
    });
});

describe('imageProblem', () => {
    it('checks type and size before the upload', () => {
        expect(imageProblem({ type: 'image/gif', size: 10 })).toBe('media.err.type');
        expect(imageProblem({ type: 'image/png', size: 6 * 1024 * 1024 })).toBe('pcEditor.image.tooLarge');
        expect(imageProblem({ type: 'image/webp', size: 1024 })).toBeNull();
    });
});

describe('fetch with token', () => {
    it('sends the client address only together with the token', async () => {
        const f = vi.fn().mockResolvedValue(new Response('{}', { status: 404 })) as unknown as typeof fetch;
        vi.stubEnv('PUBLIC_API_TRUSTED_TOKEN', 'tok');
        await fetchPublicClub('tsv', '203.0.113.9', f);
        expect((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].headers).toMatchObject({ 'X-Public-Api-Token': 'tok', 'X-Public-Client-Ip': '203.0.113.9' });
        vi.stubEnv('PUBLIC_API_TRUSTED_TOKEN', '');
        await fetchPublicClub('tsv', '203.0.113.9', f);
        const headers = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[1][1].headers;
        expect(headers).not.toHaveProperty('X-Public-Client-Ip');
        vi.unstubAllEnvs();
    });
});
