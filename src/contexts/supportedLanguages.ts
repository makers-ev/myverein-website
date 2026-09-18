// Shared language registry (ADR-009): a language is a registry entry + object
// keys in the translation files, not a type-level union edited in N places.
// Arabic/RTL is deliberately excluded -- this suite only ships LTR languages
// for now, see ADR-009's Consequences/Negative.
export interface SupportedLanguage {
    id: string;
    label: string;
    nativeLabel: string;
    isRTL: boolean;
    flag: string;
}

export const supportedLanguages = [
    { id: 'de', label: 'German', nativeLabel: 'Deutsch', isRTL: false, flag: '🇩🇪' },
    { id: 'en', label: 'English', nativeLabel: 'English', isRTL: false, flag: '🇺🇸' },
    { id: 'fr', label: 'French', nativeLabel: 'Français', isRTL: false, flag: '🇫🇷' },
    { id: 'es', label: 'Spanish', nativeLabel: 'Español', isRTL: false, flag: '🇪🇸' },
    { id: 'pt', label: 'Portuguese', nativeLabel: 'Português', isRTL: false, flag: '🇵🇹' },
    { id: 'it', label: 'Italian', nativeLabel: 'Italiano', isRTL: false, flag: '🇮🇹' },
    { id: 'nl', label: 'Dutch', nativeLabel: 'Nederlands', isRTL: false, flag: '🇳🇱' },
    { id: 'pl', label: 'Polish', nativeLabel: 'Polski', isRTL: false, flag: '🇵🇱' },
    { id: 'ru', label: 'Russian', nativeLabel: 'Русский', isRTL: false, flag: '🇷🇺' },
    { id: 'ja', label: 'Japanese', nativeLabel: '日本語', isRTL: false, flag: '🇯🇵' },
    { id: 'zh-Hans', label: 'Chinese (Simplified)', nativeLabel: '简体中文', isRTL: false, flag: '🇨🇳' },
] as const satisfies readonly SupportedLanguage[];

// `as const` keeps each entry's `id` a string literal so `Language` below is
// a real union (`'de' | 'en' | ...`), not a widened `string` -- that's what
// lets `setLanguage`/`t()` catch a typo'd language code at compile time.
export type Language = (typeof supportedLanguages)[number]['id'];

export const supportedLanguageIds = supportedLanguages.map((l) => l.id) as Language[];

export function isSupportedLanguage(value: unknown): value is Language {
    return typeof value === 'string' && (supportedLanguageIds as string[]).includes(value);
}
