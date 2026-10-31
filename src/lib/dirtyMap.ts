/**
 * Unsaved-edit flags of several independent sections (one per child in "Mein Profil"). `setDirtyFlag` returns the SAME object when
 * nothing changes, so a state setter fed with it does not re-render -- a report of an unchanged flag must never cause another render.
 */
export type DirtyMap = Readonly<Record<string, boolean>>;

export function setDirtyFlag(prev: DirtyMap, id: string, dirty: boolean): DirtyMap {
    if ((prev[id] ?? false) === dirty) return prev;
    return { ...prev, [id]: dirty };
}

export const anyDirty = (map: DirtyMap): boolean => Object.values(map).some(Boolean);
