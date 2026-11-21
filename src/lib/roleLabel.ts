type Translate = (key: string, params?: Record<string, string | number>) => string;

/** "stellv_vorsitz" -> "Stellv Vorsitz"; free-form names are kept as typed. */
function humanize(role: string): string {
    if (!/^[a-z0-9_-]+$/.test(role)) return role;
    return role
        .split(/[_-]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

/**
 * Display label for a club role. Uses the `verein.role.<type>` translation when it exists,
 * else the role's own display name, else a humanized type. Never returns the raw key.
 */
export function roleLabel(t: Translate, role: string | null | undefined, displayName?: string | null): string {
    const type = role?.trim();
    if (type) {
        const key = `verein.role.${type}`;
        const label = t(key);
        if (label && label !== key) return label;
    }
    const name = displayName?.trim();
    if (name) return name;
    return type ? humanize(type) : '';
}
