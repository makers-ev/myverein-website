import { describe, expect, it } from 'vitest';

import { CHANGELOG_RELEASES } from './changelog/changelogData';
import { BUILT_FEATURE_AREAS } from './features/builtFeaturesData';
import { ROADMAP_ITEMS } from './roadmap/roadmapData';

const INTERNAL = /\b(wave|adr-?\d*|feature list)\b|[a-z_]+:(read|write|manage)\b/i;
const text = (v: { de: string; en: string }) => [v.de, v.en];

describe('changelog data', () => {
    it('has unique ids and ISO dates', () => {
        const ids = CHANGELOG_RELEASES.map((r) => r.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const r of CHANGELOG_RELEASES) expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('lists the 2026-10 deliveries with German and English text', () => {
        const dates = CHANGELOG_RELEASES.map((r) => r.date);
        for (const d of ['2026-10-25', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31']) expect(dates).toContain(d);
        for (const r of CHANGELOG_RELEASES) {
            expect(r.changes.length).toBeGreaterThan(0);
            for (const c of r.changes) {
                for (const s of [...text(r.title), ...text(c.title), ...text(c.description)]) expect(s.trim()).not.toBe('');
            }
        }
    });

    it('keeps internal names out of user-facing text', () => {
        const all = CHANGELOG_RELEASES.flatMap((r) => [...text(r.title), ...r.changes.flatMap((c) => [...text(c.title), ...text(c.description)])]);
        expect(all.filter((s) => INTERNAL.test(s))).toEqual([]);
    });
});

describe('built features data', () => {
    it('has unique area ids and German and English labels', () => {
        const ids = BUILT_FEATURE_AREAS.map((a) => a.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const a of BUILT_FEATURE_AREAS) {
            expect(a.capabilities.length).toBeGreaterThan(0);
            for (const s of [...text(a.title), ...a.capabilities.flatMap((c) => text(c.label))]) expect(s.trim()).not.toBe('');
        }
    });

    it('covers the delivered areas', () => {
        const ids = BUILT_FEATURE_AREAS.map((a) => a.id);
        for (const id of ['termine-anwesenheit', 'zeiterfassung', 'mitteilungen', 'abstimmungen-versammlung', 'dokumente-pdf', 'datenschutz', 'familie']) {
            expect(ids).toContain(id);
        }
    });

    it('keeps internal names out of user-facing text', () => {
        const all = BUILT_FEATURE_AREAS.flatMap((a) => [...text(a.title), ...a.capabilities.flatMap((c) => text(c.label))]);
        expect(all.filter((s) => INTERNAL.test(s))).toEqual([]);
    });
});

describe('roadmap data', () => {
    it('has unique ids, no dates and nothing already shipped', () => {
        const ids = ROADMAP_ITEMS.map((i) => i.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const i of ROADMAP_ITEMS) {
            expect(i.status).toBe('planned');
            expect(i.period).toBe('Später');
            for (const s of [...text(i.title), ...text(i.description)]) expect(s.trim()).not.toBe('');
        }
        for (const shipped of ['zeiterfassung-verguetung', 'mitgliedsausweis', 'dsgvo-einwilligungen', 'abstimmungen-umlaufbeschluesse', 'helferplanung']) {
            expect(ids).not.toContain(shipped);
        }
    });

    it('never promises billing', () => {
        const all = ROADMAP_ITEMS.flatMap((i) => text(i.title));
        expect(all.filter((s) => /sepa|mahn|kassenbuch|lastschrift/i.test(s))).toEqual([]);
    });
});
