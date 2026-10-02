export type ChangelogChangeType = 'feature' | 'improvement' | 'fix';

export interface ChangelogChange {
    type: ChangelogChangeType;
    title: { de: string; en: string };
    description: { de: string; en: string };
}

export interface ChangelogRelease {
    /** Stable, unique key -- also used as the React list key. */
    id: string;
    /** ISO date (YYYY-MM-DD) this release shipped. Drives both sorting and the displayed date. */
    date: string;
    title: { de: string; en: string };
    changes: ChangelogChange[];
}

/**
 * The MyVerein changelog, shown at /changelog. One entry per shipped
 * release, derived from the actual git history of myverein-backend,
 * myverein-mobile, and myverein-website.
 *
 * To add an entry: append it below (newest last -- the page sorts and
 * displays newest-first automatically). Derive entries from the actual
 * commits/PRs that shipped, grouped by release date.
 */
export const CHANGELOG_RELEASES: ChangelogRelease[] = [
    {
        id: '2026-09-18-mitglieder-kalender-treffen',
        date: '2026-09-18',
        title: { de: 'Start: Mitgliederverwaltung, Kalender & Treffen', en: 'Launch: member management, calendar & meetings' },
        changes: [
            {
                type: 'feature',
                title: { de: 'Mitgliederverwaltung', en: 'Member management' },
                description: {
                    de: 'Stammdaten, Mitgliedskategorien und Mitgliederliste pro Verein.',
                    en: 'Core member data, membership categories, and a per-club member list.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Rollen- und Abteilungsmodell', en: 'Roles & departments' },
                description: {
                    de: 'Vorstand-Unterrollen (Vorsitz, Kassenwart, Schriftführer u.a.), Abteilungsleitung und Zuweisung von Rollen zu Mitgliedern.',
                    en: 'Board sub-roles (chair, treasurer, secretary, and more), department leads, and assigning roles to members.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Vereinsinfo', en: 'Club info' },
                description: {
                    de: 'Übersicht über Vorstand und Abteilungen, jeweils mit Ansprechpartnern.',
                    en: 'An overview of the board and departments, each with a contact person.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Beitritt per Vereins-Link', en: 'Joining a club by link' },
                description: {
                    de: 'Neue Mitglieder treten einem Verein über einen Beitritts-Link bei, statt über ein Papierformular.',
                    en: 'New members join a club via a join link, instead of a paper form.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Kalender & Termine', en: 'Calendar & events' },
                description: {
                    de: 'Vereinsweiter Kalender und abteilungsspezifische Unterkalender mit Terminen, iCal-Export und RSVP inklusive Warteliste.',
                    en: 'A club-wide calendar plus department sub-calendars with events, iCal export, and RSVP including a waitlist.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Verfügbarkeitsverwaltung', en: 'Availability management' },
                description: {
                    de: 'Mitglieder hinterlegen wiederkehrende Verfügbarkeit und Ausnahmen, als Grundlage für die Terminfindung.',
                    en: 'Members record recurring availability and exceptions, the foundation for finding a meeting time.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Vorstandssitzungen & Mitgliederversammlung', en: 'Board meetings & general assembly' },
                description: {
                    de: 'Agenda vorab, Protokoll danach, inklusive Beschlüssen, Abstimmungen und Anwesenheitsliste.',
                    en: 'An agenda beforehand, minutes afterward, including resolutions, votes, and an attendance list.',
                },
            },
        ],
    },
    {
        id: '2026-09-20-standorte-material',
        date: '2026-09-20',
        title: { de: 'Standorte & Material', en: 'Locations & materials' },
        changes: [
            {
                type: 'feature',
                title: { de: 'Standort-Infocenter', en: 'Locations info center' },
                description: {
                    de: 'Mehrere Standorte pro Verein mit Adresse, Öffnungszeiten und Ansprechpartner.',
                    en: 'Multiple locations per club with address, opening hours, and a contact person.',
                },
            },
            {
                type: 'feature',
                title: { de: 'WLAN per QR-Code & Links', en: 'WiFi via QR code & links' },
                description: {
                    de: 'WLAN-Zugangsdaten je Standort als QR-Code, rollenabhängig sichtbar, plus weitere Links (Hausordnung, Belegungsplan, Schlüsselinfo).',
                    en: 'Per-location WiFi credentials as a QR code, visible based on role, plus additional links (house rules, booking calendar, key info).',
                },
            },
            {
                type: 'feature',
                title: { de: 'Lager- und Materialverwaltung', en: 'Inventory & material management' },
                description: {
                    de: 'Inventarliste mit Zustand und Lagerort, Ausleihe/Rückgabe und Schadensmeldung mit Foto.',
                    en: 'An inventory list with condition and storage location, borrow/return tracking, and damage reports with a photo.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Wartungsintervalle', en: 'Maintenance intervals' },
                description: {
                    de: 'Sicherheitsrelevantes Material zeigt an, wenn eine Wartung überfällig ist.',
                    en: 'Safety-relevant items flag when maintenance is overdue.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Verwaltungsseiten für den Vorstand', en: 'Board admin pages' },
                description: {
                    de: 'Eigene Verwaltungsseiten für Standorte und Material, mit rollenabhängigen Rechten.',
                    en: 'Dedicated admin pages for locations and materials, with role-based permissions.',
                },
            },
        ],
    },
    {
        id: '2026-09-24-ui-paritaet',
        date: '2026-09-24',
        title: { de: 'Kalenderansicht & App-Website-Parität', en: 'Calendar view & app/website parity' },
        changes: [
            {
                type: 'feature',
                title: { de: 'Monatskalender', en: 'Month calendar' },
                description: {
                    de: 'Termine als Monatsansicht mit Abteilungsfarben auf Website und App; Tag antippen legt einen Termin an.',
                    en: 'Events in a month view with department colors on website and app; tap a day to create an event.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Mehr Funktionen in der App', en: 'More features in the app' },
                description: {
                    de: 'Termine, Kalender, Inventar, Standorte sowie WLAN-Netze und Links lassen sich jetzt auch mobil anlegen und bearbeiten.',
                    en: 'Events, calendars, inventory, locations, WiFi networks and links can now be created and edited on mobile too.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Mehr Funktionen auf der Website', en: 'More features on the website' },
                description: {
                    de: 'Selbstauskunft pflegen, Aufnahmeantrag stellen und WLAN-QR-Codes anzeigen, jetzt auch im Browser.',
                    en: 'Maintain your self-disclosure, submit a membership application and show WiFi QR codes, now in the browser too.',
                },
            },
            {
                type: 'improvement',
                title: { de: 'Neue Bedienelemente', en: 'New UI components' },
                description: {
                    de: 'Datums-/Zeitauswahl, Formular-Dialoge, Status-Chips und Leerzustände statt einfacher Eingabefelder.',
                    en: 'Date/time pickers, form dialogs, status chips and empty states instead of plain input fields.',
                },
            },
            {
                type: 'fix',
                title: { de: 'Rollen nicht mehr doppelt vergebbar', en: 'Roles can no longer be assigned twice' },
                description: {
                    de: 'Eine Rolle kann einem Mitglied nur noch einmal zugewiesen werden.',
                    en: 'A role can only be assigned to a member once.',
                },
            },
        ],
    },
];
