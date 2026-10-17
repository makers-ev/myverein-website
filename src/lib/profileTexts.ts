/**
 * Language of module-derived texts. The backend keeps German as the stored text and delivers English next to it
 * (`translations: { de, en }`) for profile modules whose label/help text the board has not changed; a board-edited text is club
 * content and is never translated (`translations` is `null` then). Pure, so the choice is unit-tested.
 */
export type TextLang = 'de' | 'en';

/** The site has more languages than the module texts: everything but German gets English (the same fallback `t()` uses). */
export const textLang = (language: string): TextLang => (language === 'de' ? 'de' : 'en');

export interface TextVariants {
    label?: string | null;
    description?: string | null;
    helpText?: string | null;
}
export type TextTranslations = Partial<Record<TextLang, TextVariants>>;

interface Translatable {
    label: string;
    description?: string | null;
    helpText?: string | null;
    translations?: TextTranslations | null;
}

/** `translations[lang]?.label ?? label` (and the same for description and help text); an empty translation never hides the text. */
export function localizedTexts<T extends Translatable>(item: T, lang: TextLang): { label: string; description: string | null; helpText: string | null } {
    const tr = item.translations?.[lang];
    const pick = (own: string | null | undefined, fallback: string | null | undefined) => (typeof own === 'string' && own.trim() !== '' ? own : (fallback ?? null));
    return {
        label: pick(tr?.label, item.label) ?? item.label,
        description: pick(tr?.description, item.description),
        helpText: pick(tr?.helpText, item.helpText),
    };
}

/**
 * The text as STORED (German or the board's own): what the definition editor shows and compares against. A definition fetched with
 * `?lang=en` carries the English label at top level, so the stored text is `translations.de` when there is a translation.
 */
export function storedTexts(item: Pick<Translatable, 'label' | 'helpText' | 'translations'>): { label: string; helpText: string | null } {
    const de = item.translations?.de;
    return {
        label: typeof de?.label === 'string' ? de.label : item.label,
        helpText: de ? (de.helpText ?? null) : (item.helpText ?? null),
    };
}

/** Appends `lang=` to a path (with or without a query already). */
export const withLang = (path: string, lang: TextLang): string => `${path}${path.includes('?') ? '&' : '?'}lang=${lang}`;
