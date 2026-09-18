import type { Language } from './supportedLanguages';

// Browsers commonly send region variants ("zh-CN") the registry has no exact
// entry for -- map the common ones onto the script code we do support.
const REGION_ALIASES: Record<string, Language> = {
    'zh-cn': 'zh-Hans',
    'zh-sg': 'zh-Hans',
};

// Pure parser (no `navigator`/`headers()` dependency) so it's unit-testable
// without mocking either runtime.
export function resolveAcceptLanguage(
    header: string | null | undefined,
    supportedIds: readonly string[],
): Language | null {
    if (!header) return null;

    const tags = header
        .split(',')
        .map((part) => part.split(';')[0].trim())
        .filter(Boolean);

    for (const tag of tags) {
        const lower = tag.toLowerCase();
        if (REGION_ALIASES[lower]) return REGION_ALIASES[lower];
        if (supportedIds.includes(tag)) return tag as Language;
        const base = tag.split('-')[0];
        if (supportedIds.includes(base)) return base as Language;
    }
    return null;
}
