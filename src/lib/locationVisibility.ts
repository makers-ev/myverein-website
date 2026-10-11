/** Visibility levels of location wifi networks and links (backend `LOCATION_VISIBILITIES`), widest audience first. */
export const LOCATION_VISIBILITIES = ['gast', 'mitglied', 'vorstand'] as const;
export type LocationVisibility = (typeof LOCATION_VISIBILITIES)[number];

export function isLocationVisibility(value: unknown): value is LocationVisibility {
    return typeof value === 'string' && (LOCATION_VISIBILITIES as readonly string[]).includes(value);
}

/**
 * Level of a row from the API: `visibility` is the source of truth; an older response with only the derived
 * `visibleToGuests` flag maps `true` -> `gast`, anything else -> `mitglied` (the backend default).
 */
export function visibilityOf(row: { visibility?: unknown; visibleToGuests?: boolean }): LocationVisibility {
    if (isLocationVisibility(row.visibility)) return row.visibility;
    return row.visibleToGuests ? 'gast' : 'mitglied';
}
