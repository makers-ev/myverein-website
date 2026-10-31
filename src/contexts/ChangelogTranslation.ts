// DE/EN only for now (documented gap, same as VereinTranslation.ts/
// LegalTranslation.ts) -- spread only for de/en in LanguageContext.tsx,
// every other language falls back to English via t()'s own per-key
// fallback.
type Translation = {
    de: Record<string, string>;
    en: Record<string, string>;
};

const ChangelogTranslation: Translation = {
    de: {
        'changelog.title': 'Änderungsprotokoll',
        'changelog.intro': 'Was in MyVerein zuletzt neu dazugekommen ist, chronologisch.',
        'changelog.empty': 'Noch keine Releases veröffentlicht.',
        'changelog.type.feature': 'Neu',
        'changelog.type.improvement': 'Verbessert',
        'changelog.type.fix': 'Behoben',
    },
    en: {
        'changelog.title': 'Changelog',
        'changelog.intro': "What's newly shipped in MyVerein, in chronological order.",
        'changelog.empty': 'No releases published yet.',
        'changelog.type.feature': 'New',
        'changelog.type.improvement': 'Improved',
        'changelog.type.fix': 'Fixed',
    },
};

export default ChangelogTranslation;
