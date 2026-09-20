// DE/EN only for now (documented gap, same as VereinTranslation.ts/
// LegalTranslation.ts) -- spread only for de/en in LanguageContext.tsx,
// every other language falls back to English via t()'s own per-key
// fallback.
type Translation = {
    de: Record<string, string>;
    en: Record<string, string>;
};

const RoadmapTranslation: Translation = {
    de: {
        'roadmap.title': 'Roadmap',
        'roadmap.intro': 'So sieht der aktuelle Ausblick aus: alles hier ist geplant, aber noch nicht terminiert.',
        'roadmap.empty': 'Aktuell steht nichts auf der Roadmap.',
        'roadmap.status.planned': 'Geplant',
        'roadmap.status.in-progress': 'In Arbeit',
        'roadmap.status.done': 'Fertig',
        'roadmap.type.feature': 'Feature',
        'roadmap.type.fix': 'Fix',
        'roadmap.bugs.title': 'Bekannte Fehler',
        'roadmap.bugs.empty': 'Aktuell sind keine offenen Fehler bekannt.',
        'roadmap.bugs.status.open': 'Offen',
        'roadmap.bugs.status.investigating': 'Wird untersucht',
        'roadmap.bugs.status.fix-in-progress': 'Fix in Arbeit',
        'roadmap.bugs.report-info': 'Einen Fehler gefunden? Wir freuen uns über eine Meldung.',
        'roadmap.bugs.report-link': 'Fehler melden',
    },
    en: {
        'roadmap.title': 'Roadmap',
        'roadmap.intro': "Here's the current outlook: everything here is planned, but not yet scheduled.",
        'roadmap.empty': 'Nothing is on the roadmap right now.',
        'roadmap.status.planned': 'Planned',
        'roadmap.status.in-progress': 'In progress',
        'roadmap.status.done': 'Done',
        'roadmap.type.feature': 'Feature',
        'roadmap.type.fix': 'Fix',
        'roadmap.bugs.title': 'Known issues',
        'roadmap.bugs.empty': 'No open issues are known right now.',
        'roadmap.bugs.status.open': 'Open',
        'roadmap.bugs.status.investigating': 'Investigating',
        'roadmap.bugs.status.fix-in-progress': 'Fix in progress',
        'roadmap.bugs.report-info': 'Found a bug? We appreciate a report.',
        'roadmap.bugs.report-link': 'Report a bug',
    },
};

export default RoadmapTranslation;
