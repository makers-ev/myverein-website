import { describe, expect, it } from 'vitest';

import { ApiError } from './api-client';
import { cardErrorKey, extractCardToken, refreshDelayMs, safeColor, textOn } from './memberCard';

const TOKEN = 'mc1.AbCd_ef-12.3.lq2x9k.Zm9vYmFyLXNpZw';

describe('memberCard', () => {
    it('finds the token in a bare code, a link or surrounding text', () => {
        expect(extractCardToken(TOKEN)).toBe(TOKEN);
        expect(extractCardToken(`  ${TOKEN}\n`)).toBe(TOKEN);
        expect(extractCardToken(`https://example.org/check?token=${encodeURIComponent(TOKEN)}`)).toBe(TOKEN);
        expect(extractCardToken(`Code: ${TOKEN}.`)).toBe(TOKEN);
    });

    it('returns null for anything else', () => {
        expect(extractCardToken('')).toBeNull();
        expect(extractCardToken('hello world')).toBeNull();
        expect(extractCardToken('mc1.only.two')).toBeNull();
        expect(extractCardToken('x'.repeat(5000))).toBeNull();
    });

    it('refreshes a minute before the token expires, but not in a tight loop', () => {
        const now = Date.parse('2026-01-01T10:00:00Z');
        expect(refreshDelayMs({ token: 't', tokenExpiresAt: '2026-01-01T10:10:00Z' }, now)).toBe(9 * 60_000);
        expect(refreshDelayMs({ token: 't', tokenExpiresAt: '2026-01-01T10:00:10Z' }, now)).toBe(15_000);
        expect(refreshDelayMs({ token: null, tokenExpiresAt: null }, now)).toBeNull();
        expect(refreshDelayMs({ token: 't', tokenExpiresAt: 'garbage' }, now)).toBeNull();
    });

    it('lets only hex colours reach inline styles', () => {
        expect(safeColor('#12abEF', '#000000')).toBe('#12abEF');
        expect(safeColor('red; background:url(x)', '#111111')).toBe('#111111');
        expect(safeColor(null, '#222222')).toBe('#222222');
    });

    it('picks readable text colours', () => {
        expect(textOn('#ffffff')).toBe('#000000');
        expect(textOn('#000000')).toBe('#ffffff');
        expect(textOn('#1f4e8c')).toBe('#ffffff');
    });

    it('maps card errors', () => {
        expect(cardErrorKey(new ApiError(429, 'TOO_MANY_REQUESTS', 'x'))).toBe('docs.card.err.rate');
        expect(cardErrorKey(new ApiError(403, 'FORBIDDEN', 'x'))).toBe('docs.card.err.forbidden');
        expect(cardErrorKey(new TypeError('network'))).toBe('docs.card.verify.offline');
    });
});
