import { describe, expect, it } from 'vitest';

import { isLocationVisibility, visibilityOf } from './locationVisibility';

describe('visibilityOf', () => {
    it('uses the visibility level when present', () => {
        expect(visibilityOf({ visibility: 'vorstand', visibleToGuests: false })).toBe('vorstand');
        expect(visibilityOf({ visibility: 'gast' })).toBe('gast');
    });
    it('falls back to the legacy flag', () => {
        expect(visibilityOf({ visibleToGuests: true })).toBe('gast');
        expect(visibilityOf({ visibleToGuests: false })).toBe('mitglied');
        expect(visibilityOf({ visibility: 'bogus' })).toBe('mitglied');
    });
    it('validates levels', () => {
        expect(isLocationVisibility('mitglied')).toBe(true);
        expect(isLocationVisibility('admin')).toBe(false);
    });
});
