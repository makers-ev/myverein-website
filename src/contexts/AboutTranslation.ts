// DE/EN only for now (documented gap, same as FeaturesTranslation.ts) --
// spread only for de/en in LanguageContext.tsx, every other language falls
// back to English via t()'s own per-key fallback.
type Translation = {
    de: Record<string, string>;
    en: Record<string, string>;
};

const AboutTranslation: Translation = {
    de: {
        'about.title': 'Über uns',
        'about.what.title': 'Was ist MyVerein?',
        'about.what.body':
            'MyVerein ist eine Vereinsverwaltung für Website und App: Mitglieder und Abteilungen, Kalender und Treffen, Standorte und Material an einem Ort. Vorstände organisieren den Verein, Mitglieder sehen Termine, sagen zu und melden sich ein.',
        'about.makers.title': 'Ein Projekt von Makers e.V.',
        'about.makers.body':
            'MyVerein entsteht bei Makers e.V., einem gemeinnützigen Verein zur Jugendförderung für 14- bis 27-Jährige. Statt starrer Lehrpläne setzen die Teilnehmenden eigene Projekte von der Idee bis zum Prototyp um, begleitet von Mentoren statt Lehrern. Ob Programmieren, Elektronik und Game Design oder Holz- und Metallverarbeitung: Ziel ist es, Zukunftskompetenzen zu vermitteln und die berufliche Orientierung zu stärken.',
        'about.developers.title': 'Entwickelt von',
        'about.developers.role': 'Anwendungsentwickler',
    },
    en: {
        'about.title': 'About us',
        'about.what.title': 'What is MyVerein?',
        'about.what.body':
            'MyVerein is club management for web and app: members and departments, calendar and meetings, locations and inventory in one place. Boards run the club, members see events, RSVP and check in.',
        'about.makers.title': 'A project by Makers e.V.',
        'about.makers.body':
            'MyVerein is built at Makers e.V., a non-profit association for youth development aimed at 14 to 27 year olds. Instead of rigid curricula, participants carry out projects of their own choosing from idea to prototype, guided by mentors rather than teachers. Whether programming, electronics and game design or woodworking and metalworking: the goal is to teach future skills and strengthen career orientation.',
        'about.developers.title': 'Built by',
        'about.developers.role': 'Application developer',
    },
};

export default AboutTranslation;
