import { describe, expect, it } from 'vitest';

import { CLAIMED_ROLES, sanitizeClaimedRole } from './clubRegistration';

describe('claimable founding roles', () => {
    it('offers only the roles the backend accepts (no schriftfuehrer)', () => {
        expect([...CLAIMED_ROLES]).toEqual(['vorsitz', 'stellv_vorsitz']);
    });
    it('replaces an outdated draft role by vorsitz', () => {
        expect(sanitizeClaimedRole('schriftfuehrer')).toBe('vorsitz');
        expect(sanitizeClaimedRole(undefined)).toBe('vorsitz');
        expect(sanitizeClaimedRole('stellv_vorsitz')).toBe('stellv_vorsitz');
    });
});
