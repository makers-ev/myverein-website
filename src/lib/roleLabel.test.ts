import { describe, expect, it } from 'vitest';
import { roleLabel } from './roleLabel';

const t = (key: string) => ({ 'verein.role.vorsitz': 'Vorsitz' })[key as 'verein.role.vorsitz'] ?? key;

describe('roleLabel', () => {
    it('uses the translation when the key exists', () => {
        expect(roleLabel(t, 'vorsitz')).toBe('Vorsitz');
        expect(roleLabel(t, 'vorsitz', 'Chef')).toBe('Vorsitz');
    });
    it('falls back to the display name, then a humanized type', () => {
        expect(roleLabel(t, 'ehrenpraesident', 'Ehrenpräsident:in')).toBe('Ehrenpräsident:in');
        expect(roleLabel(t, 'stellv_kassenwart')).toBe('Stellv Kassenwart');
    });
    it('keeps custom names as typed', () => {
        expect(roleLabel(t, 'Leiter Jugend')).toBe('Leiter Jugend');
    });
    it('returns an empty string for empty/undefined', () => {
        expect(roleLabel(t, undefined)).toBe('');
        expect(roleLabel(t, null)).toBe('');
        expect(roleLabel(t, '  ')).toBe('');
    });
});
