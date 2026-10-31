import { describe, expect, it } from 'vitest';

import { REMINDER_RULES, draftFromTemplate, isValidReplyTo, mailTemplatePatch, mailTemplateProblems, parseLead } from './clubCommSettings';

describe('parseLead', () => {
    it('accepts whole numbers inside the range only', () => {
        const r = REMINDER_RULES.event;
        expect(parseLead('24', r.min, r.max)).toBe(24);
        expect(parseLead('0', r.min, r.max)).toBeUndefined();
        expect(parseLead('169', r.min, r.max)).toBeUndefined();
        expect(parseLead('', r.min, r.max)).toBeUndefined();
        expect(parseLead('2.5', r.min, r.max)).toBeUndefined();
        expect(parseLead('-1', r.min, r.max)).toBeUndefined();
        expect(parseLead('0', REMINDER_RULES.loan.min, REMINDER_RULES.loan.max)).toBe(0);
    });
});

describe('reply-to', () => {
    it('allows empty or one plain address', () => {
        expect(isValidReplyTo('')).toBe(true);
        expect(isValidReplyTo('vorstand@tv-beispiel.de')).toBe(true);
        expect(isValidReplyTo('vorstand@tv-beispiel')).toBe(false);
        expect(isValidReplyTo('a@b.de, c@d.de')).toBe(false);
        expect(isValidReplyTo('a@b.de\nBcc: x@y.de')).toBe(false);
    });
});

describe('mail template draft', () => {
    it('reports invalid fields', () => {
        expect(mailTemplateProblems({ senderName: 'Vorstand', signature: '', replyTo: '' })).toEqual([]);
        expect(mailTemplateProblems({ senderName: 'a\nb', signature: '', replyTo: 'x' })).toEqual(['senderName', 'replyTo']);
        expect(mailTemplateProblems({ senderName: '', signature: 'x'.repeat(1001), replyTo: '' })).toEqual(['signature']);
    });

    it('sends only changed fields and clears emptied ones', () => {
        const saved = { senderName: 'Vorstand TV', signature: null, replyTo: 'vorstand@tv.de' };
        expect(mailTemplatePatch(saved, draftFromTemplate(saved))).toEqual({});
        expect(mailTemplatePatch(saved, { senderName: '', signature: 'Mit sportlichen Grüßen', replyTo: 'VORSTAND@tv.de' })).toEqual({ senderName: null, signature: 'Mit sportlichen Grüßen' });
        expect(mailTemplatePatch(saved, { senderName: 'Vorstand TV', signature: '', replyTo: '' })).toEqual({ replyTo: null });
    });
});
