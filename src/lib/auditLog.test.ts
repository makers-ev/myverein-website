import { describe, expect, it } from 'vitest';

import { type AuditEntry, auditParams, auditPath, auditQuery, describeAuditEvent } from './auditLog';
import { translations } from '@/contexts/LanguageContext';

const entry = (over: Partial<AuditEntry> = {}): AuditEntry => ({
    id: '1',
    eventType: 'consent.grant',
    kind: 'change',
    subjectId: null,
    subjectMember: { id: 'm1', name: 'Anna Beispiel' },
    actor: { userId: 'u1', name: 'Max Vorstand' },
    payload: {},
    createdAt: '2026-10-21T10:00:00Z',
    ...over,
});

const t = (key: string, params?: Record<string, string | number>) => {
    let out = translations.de[key] ?? key;
    for (const [k, v] of Object.entries(params ?? {})) out = out.replaceAll(`{{${k}}}`, String(v));
    return out;
};

describe('describeAuditEvent', () => {
    it('writes a German sentence with actor and person', () => {
        const text = describeAuditEvent(entry(), t);
        expect(text).toContain('Max Vorstand');
        expect(text).toContain('Anna Beispiel');
        expect(text).not.toContain('{{');
    });

    it('falls back to the raw event type for unknown events', () => {
        expect(describeAuditEvent(entry({ eventType: 'brand_new.thing' }), t)).toBe('brand_new.thing');
    });

    it('names the system when there is no actor and never leaves a placeholder', () => {
        const text = describeAuditEvent(entry({ eventType: 'club_member.age_transition', actor: null, subjectMember: null }), t);
        expect(text).toContain('System');
        expect(text).not.toContain('{{');
    });

    it('has a sentence without leftover placeholders for every mapped event', () => {
        const keys = Object.keys(translations.de).filter((k) => k.startsWith('audit.event.'));
        expect(keys.length).toBeGreaterThan(40);
        for (const key of keys) {
            const type = key.slice('audit.event.'.length);
            expect(describeAuditEvent(entry({ eventType: type, payload: {} }), t), type).not.toMatch(/\{\{/);
            expect(translations.en[key], `en ${type}`).toBeTruthy();
        }
    });
});

describe('auditParams', () => {
    it('takes only scalar payload facts and joins field lists', () => {
        const p = auditParams(entry({ payload: { changedFields: ['phone', 'email'], count: 3, secret: { a: 1 } } }), 'System', 'eine Person');
        expect(p.fields).toBe('phone, email');
        expect(p.count).toBe('3');
        expect(p).not.toHaveProperty('secret');
    });
});

describe('auditQuery / auditPath', () => {
    it('sends only set filters', () => {
        const q = new URLSearchParams(auditQuery('c1', { kind: 'read', type: 'consent*', actorId: '', from: '2026-10-01', to: '', page: 2 }));
        expect(q.get('kind')).toBe('read');
        expect(q.get('type')).toBe('consent*');
        expect(q.get('from')).toBe('2026-10-01');
        expect(q.has('actorId')).toBe(false);
        expect(q.has('to')).toBe(false);
        expect(q.get('page')).toBe('2');
    });
    it('leaves paging out for the export', () => expect(auditQuery('c1', { kind: '', type: '', actorId: '', from: '', to: '', page: 3 }, false)).toBe('clubId=c1'));
    it('uses the member path for a person', () => {
        expect(auditPath(null)).toBe('/audit-log');
        expect(auditPath('abc')).toBe('/audit-log/members/abc');
    });
});
