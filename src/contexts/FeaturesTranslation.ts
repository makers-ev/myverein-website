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
        'features.intro': 'Das ist keine Zukunftsmusik: Diese Funktionen sind heute schon einsatzbereit, aufgeteilt nach Website und App.',
        'features.platform.web': 'Website',
        'features.platform.app': 'App',
        'features.platform.both': 'Website & App',
        'features.roadmap-teaser': 'Neugierig, was als Nächstes kommt?',
        'features.roadmap-teaser-link': 'Zur Roadmap',
    },
    en: {
        'features.title': 'Features',
        'features.intro': "This isn't a future promise: these features are ready to use today, broken down by Website and App.",
        'features.platform.web': 'Website',
        'features.platform.app': 'App',
        'features.platform.both': 'Website & App',
        'features.roadmap-teaser': "Curious what's coming next?",
        'features.roadmap-teaser-link': 'See the roadmap',
    },
};

export default FeaturesTranslation;
