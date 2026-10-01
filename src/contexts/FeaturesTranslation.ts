// DE/EN only for now (documented gap, same as VereinTranslation.ts/
// LegalTranslation.ts) -- spread only for de/en in LanguageContext.tsx,
// every other language falls back to English via t()'s own per-key
// fallback.
type Translation = {
    de: Record<string, string>;
    en: Record<string, string>;
};

const FeaturesTranslation: Translation = {
    de: {
        'features.title': 'Funktionen',
        'features.intro': 'Das sind die Funktionen, die heute schon nutzbar sind, aufgeteilt nach Website und App.',
        'features.filter-all': 'Alle',
        'features.platform.web': 'Website',
        'features.platform.app': 'App',
        'features.platform.both': 'Website & App',
        'features.roadmap-teaser': 'Neugierig, was als Nächstes kommt?',
        'features.roadmap-teaser-link': 'Zur Roadmap',
    },
    en: {
        'features.title': 'Features',
        'features.intro': 'These are the features you can use today, broken down by Website and App.',
        'features.filter-all': 'All',
        'features.platform.web': 'Website',
        'features.platform.app': 'App',
        'features.platform.both': 'Website & App',
        'features.roadmap-teaser': "Curious what's coming next?",
        'features.roadmap-teaser-link': 'See the roadmap',
    },
};

export default FeaturesTranslation;
