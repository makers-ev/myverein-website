import { describe, expect, it } from 'vitest';

import { anyDirty, type DirtyMap, setDirtyFlag } from './dirtyMap';

// Regression: ChildrenFields once passed a new inline callback per render and MemberCustomFields re-reported on every identity change,
// which looped. The reducer must be idempotent (same object for an unchanged flag) so a repeated report cannot cause a render.
describe('dirty map', () => {
    it('returns the same object for an unchanged flag, also for a first "clean" report', () => {
        const start: DirtyMap = {};
        expect(setDirtyFlag(start, 'a', false)).toBe(start);
        const dirty = setDirtyFlag(start, 'a', true);
        expect(dirty).toEqual({ a: true });
        expect(setDirtyFlag(dirty, 'a', true)).toBe(dirty);
    });
    it('tracks sections independently and does not mutate', () => {
        const a = setDirtyFlag({}, 'a', true);
        const ab = setDirtyFlag(a, 'b', true);
        expect(a).toEqual({ a: true });
        expect(anyDirty(ab)).toBe(true);
        expect(anyDirty(setDirtyFlag(setDirtyFlag(ab, 'a', false), 'b', false))).toBe(false);
        expect(anyDirty({})).toBe(false);
    });
});
