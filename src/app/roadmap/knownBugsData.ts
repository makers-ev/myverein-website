import type { LucideIcon } from 'lucide-react';

export type BugStatus = 'open' | 'investigating' | 'fix-in-progress';

export interface KnownBug {
    /** Stable, unique key -- also used as the React list key. */
    id: string;
    icon: LucideIcon;
    title: { de: string; en: string };
    description: { de: string; en: string };
    status: BugStatus;
}

/**
 * Known, unresolved bugs, shown at /roadmap below the feature timeline.
 *
 * To add one: append a new entry below. Remove the entry once the fix has
 * shipped -- this list is "currently known", not a changelog.
 */
export const KNOWN_BUGS: KnownBug[] = [];
