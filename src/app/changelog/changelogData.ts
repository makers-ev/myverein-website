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
 * Releases from 2026-10-11 on are grouped by delivery date (not by internal wave names) and written for end users:
 * Neu / Verbessert / Behoben map to feature / improvement / fix.
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
    {
        id: '2026-10-11-mitglieder-ohne-konto',
        date: '2026-10-11',
        title: { de: 'Mitglieder ohne Konto, Kategorien & Kennzahlen', en: 'Members without an account, categories & key figures' },
        changes: [
            {
                type: 'feature',
                title: { de: 'Mitglieder ohne Konto', en: 'Members without an account' },
                description: {
                    de: 'Kinder, Senioren und alle, die lieber bei Papier bleiben, stehen in der Mitgliederliste und können später per E-Mail ein Konto verknüpfen.',
                    en: 'Children, seniors and everyone who prefers paper are on the member list and can link an account later by email.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Status, Kategorien und Austritt', en: 'Status, categories and exit' },
                description: {
                    de: 'Eigene Mitgliedskategorien, ein Status-Verlauf vom Interessenten bis zum Austritt und eine Rückgabe-Checkliste beim Austritt.',
                    en: 'Your own membership categories, a status history from prospect to exit, and a hand-back checklist when someone leaves.',
                },
            },
            {
                type: 'feature',
                title: { de: 'CSV-Import und -Export', en: 'CSV import and export' },
                description: {
                    de: 'Alte Excel-Listen importieren, mit Prüfbericht vor dem Übernehmen, und Mitglieder wieder exportieren.',
                    en: 'Import old Excel lists with a check report before applying, and export members again.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Vereinskennzahlen', en: 'Club key figures' },
                description: {
                    de: 'Mitglieder, Altersstruktur, Zu- und Abgänge auf einen Blick.',
                    en: 'Members, age structure, joins and leaves at a glance.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Schlüsselverwaltung in der App', en: 'Key management in the app' },
                description: {
                    de: 'Schlüssel ausgeben und zurücknehmen, jetzt auch in der App.',
                    en: 'Hand out and take back keys, now in the app too.',
                },
            },
        ],
    },
    {
        id: '2026-10-17-eigene-formulare',
        date: '2026-10-17',
        title: { de: 'Eigene Formulare & Zusatzfelder', en: 'Your own forms & extra fields' },
        changes: [
            {
                type: 'feature',
                title: { de: 'Aufnahme- und Austrittsformular selbst gestalten', en: 'Design the application and exit forms yourself' },
                description: {
                    de: 'Der Verein legt fest, was er beim Aufnahmeantrag und bei der Kündigung wissen will. Eltern können einen Antrag für ihr Kind stellen.',
                    en: 'The club decides what it wants to know on the application and on exit. Parents can apply for their child.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Zusatzfelder und Profil-Bausteine', en: 'Extra fields and profile modules' },
                description: {
                    de: 'Eigene Felder am Mitglied, mit Sichtbarkeit und Schutz für sensible Angaben, dazu ein Katalog fertiger Bausteine.',
                    en: 'Your own fields on the member, with visibility and protection for sensitive data, plus a catalogue of ready-made modules.',
                },
            },
            {
                type: 'improvement',
                title: { de: '„Mein Profil“ als vollständige Selbstauskunft', en: '"My profile" as a complete self-service page' },
                description: {
                    de: 'Name, Kontakt und Zusatzfelder pflegst du selbst; ungespeicherte Änderungen werden angemahnt.',
                    en: 'You maintain name, contact and extra fields yourself; unsaved changes trigger a warning.',
                },
            },
            {
                type: 'fix',
                title: { de: 'Neuer Verein ohne Kalender', en: 'New club without a calendar' },
                description: {
                    de: 'Jeder Verein bekommt jetzt automatisch einen Vereinskalender, der nicht versehentlich gelöscht werden kann.',
                    en: 'Every club now automatically gets a club calendar that cannot be deleted by accident.',
                },
            },
        ],
    },
    {
        id: '2026-10-18-mitteilungen',
        date: '2026-10-18',
        title: { de: 'Mitteilungen & Benachrichtigungen', en: 'Announcements & notifications' },
        changes: [
            {
                type: 'feature',
                title: { de: 'Mitteilungen an die richtige Gruppe', en: 'Announcements to the right group' },
                description: {
                    de: 'An den ganzen Verein, eine Abteilung, eine Rolle oder Einzelne; planen, zurückziehen und vorher sehen, wer erreichbar ist.',
                    en: 'To the whole club, a department, a role or individuals; schedule, withdraw and see beforehand who can be reached.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Schwarzes Brett', en: 'Notice board' },
                description: {
                    de: 'Angepinnte und dringende Mitteilungen, mit Zähler für Ungelesenes.',
                    en: 'Pinned and urgent announcements, with a counter for unread ones.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Push-Mitteilungen in der App', en: 'Push notifications in the app' },
                description: {
                    de: 'Ein Tipp auf die Mitteilung öffnet direkt die Mitteilung oder den Termin.',
                    en: 'One tap on the notification opens the announcement or event directly.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Erinnerungen und Absagen', en: 'Reminders and cancellations' },
                description: {
                    de: 'Erinnerung vor Terminen, bei fälliger Rückgabe oder fehlender Zusage. Termine werden abgesagt statt gelöscht, Betroffene erfahren es.',
                    en: 'Reminders before events, for due returns or missing answers. Events are cancelled instead of deleted, and affected people are told.',
                },
            },
            {
                type: 'improvement',
                title: { de: 'Benachrichtigungen selbst einstellen', en: 'Set your notifications yourself' },
                description: {
                    de: 'Pro Kategorie und Kanal, jede optionale Mail hat einen Abmeldelink.',
                    en: 'Per category and channel, and every optional email has an unsubscribe link.',
                },
            },
        ],
    },
    {
        id: '2026-10-21-datenschutz-eltern',
        date: '2026-10-21',
        title: { de: 'Datenschutz, Einwilligungen & Eltern', en: 'Data protection, consent & parents' },
        changes: [
            {
                type: 'feature',
                title: { de: 'Einwilligungen', en: 'Consent management' },
                description: {
                    de: 'Foto, Video und mehr: freiwillig, mit Datum und Textversion, jederzeit widerrufbar; für Kinder durch die Erziehungsberechtigten.',
                    en: 'Photo, video and more: voluntary, with date and text version, revocable at any time; for children by their guardians.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Eltern-Bereich', en: 'Parent area' },
                description: {
                    de: 'Eltern sehen Termine ihrer Kinder, sagen zu oder ab und melden sie krank, auch für Kinder ohne eigenes Konto.',
                    en: 'Parents see their children\'s events, accept or decline and report them sick, even for children without an account.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Auskunft, Löschung und Aufbewahrung', en: 'Access, deletion and retention' },
                description: {
                    de: 'Datenauskunft als Export, Löschung mit Prüf-Plan, Anfragen mit Fristanzeige und ein Zugriffsprotokoll. Vorlagen und Fristen sind Vorschläge, keine Rechtsberatung.',
                    en: 'Data access as an export, deletion with a review plan, requests with a deadline indicator and an access log. Templates and periods are suggestions, not legal advice.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Datenschutzhinweis des Vereins', en: 'Club privacy notice' },
                description: {
                    de: 'Aus einer Vorlage erzeugt, mit Kenntnisnahme beim Aufnahmeantrag.',
                    en: 'Created from a template, with acknowledgement on the membership application.',
                },
            },
        ],
    },
    {
        id: '2026-10-24-versammlung-abstimmungen',
        date: '2026-10-24',
        title: { de: 'Mitgliederversammlung & Abstimmungen', en: 'General assembly & votes' },
        changes: [
            {
                type: 'feature',
                title: { de: 'Versammlung vorbereiten', en: 'Prepare the assembly' },
                description: {
                    de: 'Satzungsparameter, Tagesordnung und eine Einladung, die gegen die Frist geprüft wird, samt Versandnachweis.',
                    en: 'Statute parameters, an agenda and an invitation checked against the deadline, with proof of dispatch.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Abstimmen und Wählen', en: 'Voting and elections' },
                description: {
                    de: 'Digital abstimmen, offen oder geheim, mit Vollmachten und Auszählung. Wahlen mit Kandidaturen; Umlaufbeschlüsse, wenn die Satzung das erlaubt.',
                    en: 'Vote digitally, open or secret, with proxies and counting. Elections with candidacies; circular resolutions if the statutes allow it.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Protokoll mit Freigabe', en: 'Minutes with approval' },
                description: {
                    de: 'Vom Entwurf bis zum unveränderlichen Archiv, mit Export und Berichtigungsvermerken. In der App lesbar.',
                    en: 'From draft to an unchangeable archive, with export and correction notes. Readable in the app.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Amtszeiten im Blick', en: 'Terms of office at a glance' },
                description: {
                    de: 'Auslaufende Ämter werden angezeigt, Vorsitz und Schriftführung werden erinnert.',
                    en: 'Expiring offices are shown, chair and secretary are reminded.',
                },
            },
        ],
    },
    {
        id: '2026-10-25-termine-anwesenheit-helfer',
        date: '2026-10-25',
        title: { de: 'Termine, Anwesenheit & Helfer', en: 'Events, attendance & helpers' },
        changes: [
            {
                type: 'feature',
                title: { de: 'Serientermine', en: 'Recurring events' },
                description: {
                    de: 'Täglich, wöchentlich oder monatlich, mit überspringbaren Feiertagen. Ändern oder absagen wahlweise nur einen Termin, ab hier oder die ganze Serie.',
                    en: 'Daily, weekly or monthly, with skippable public holidays. Change or cancel just one date, from here on, or the whole series.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Anwesenheit erfassen', en: 'Record attendance' },
                description: {
                    de: 'Antippen statt Papierliste, auch für Mitglieder ohne Konto und Gäste. Auswertung je Person, Gruppe und Termin als CSV.',
                    en: 'Tap instead of a paper list, also for members without an account and guests. Reports per person, group and event as CSV.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Anmeldung zu Veranstaltungen', en: 'Event registration' },
                description: {
                    de: 'Mit Formular, Begleitpersonen, Plätzen und Warteliste; Gäste ohne Konto melden sich per Link mit E-Mail-Bestätigung an.',
                    en: 'With a form, companions, places and a waiting list; guests without an account register via a link with email confirmation.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Helferplan', en: 'Helper plan' },
                description: {
                    de: 'Schichten mit Mindestbesetzung, Eintragen, Abgeben und Tauschen, plus Erinnerung vor dem Einsatz.',
                    en: 'Shifts with minimum staffing; sign up, hand over and swap, plus a reminder before the shift.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Fahrgemeinschaften und Raumbelegung', en: 'Carpools and room booking' },
                description: {
                    de: 'Fahrten anbieten und anfragen; Räume und Plätze buchen mit Kollisionswarnung.',
                    en: 'Offer and request rides; book rooms and pitches with a clash warning.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Kalender abonnieren', en: 'Subscribe to the calendar' },
                description: {
                    de: 'Der Vereinskalender als Link für den Kalender auf deinem Handy. Den Link kannst du widerrufen.',
                    en: 'The club calendar as a link for the calendar on your phone. You can revoke the link.',
                },
            },
            {
                type: 'fix',
                title: { de: 'Mehrtägige Termine', en: 'Multi-day events' },
                description: {
                    de: 'Sie erscheinen jetzt an jedem Tag, nicht nur am ersten. Dein eigener Anmeldestatus stimmt wieder auf allen Geräten.',
                    en: 'They now show on every day, not just the first. Your own registration status is correct on all devices again.',
                },
            },
        ],
    },
    {
        id: '2026-10-28-dokumente-pdf-ausweis',
        date: '2026-10-28',
        title: { de: 'Dokumente, PDF & Mitgliedsausweis', en: 'Documents, PDF & membership card' },
        changes: [
            {
                type: 'feature',
                title: { de: 'Dokumentenarchiv', en: 'Document archive' },
                description: {
                    de: 'Ordner mit Rechten, Versionen, Suche und Papierkorb. Dazu „Meine Dokumente“ als persönliche Ablage, auch für Mitglieder ohne Konto.',
                    en: 'Folders with permissions, versions, search and a recycle bin. Plus "My documents" as personal storage, also for members without an account.',
                },
            },
            {
                type: 'feature',
                title: { de: 'PDF aus Vereinsdaten', en: 'PDF from club data' },
                description: {
                    de: 'Aufnahmebeleg, Mitgliedsbestätigung, Mitgliederliste, Protokoll und Teilnehmerliste, mit Briefkopf und Logo deines Vereins.',
                    en: 'Admission receipt, membership confirmation, member list, minutes and attendee list, with your club\'s letterhead and logo.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Digitale Bestätigung', en: 'Digital confirmation' },
                description: {
                    de: 'Hausordnung oder Einverständnis an eine Gruppe schicken, Rückmeldungen einsammeln, Nachweis als PDF. Keine qualifizierte Signatur.',
                    en: 'Send house rules or a declaration to a group, collect answers, proof as PDF. Not a qualified signature.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Digitaler Mitgliedsausweis', en: 'Digital membership card' },
                description: {
                    de: 'Mit QR-Code auf dem Handy, in der App auch offline sichtbar, als PDF druckbar. Kontrolle per Kamera-Scan in der App oder Code-Eingabe auf der Website, nur online.',
                    en: 'With a QR code on your phone, visible offline in the app, printable as PDF. Checking by camera scan in the app or code entry on the website, online only.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Satzung und Ordnungen lesen', en: 'Read statutes and rules' },
                description: {
                    de: 'Mit Versionen und „gültig seit“, für alle, die sie sehen dürfen.',
                    en: 'With versions and "valid since", for everyone who may see them.',
                },
            },
            {
                type: 'improvement',
                title: { de: 'Speicher-Übersicht', en: 'Storage overview' },
                description: {
                    de: 'Der Verein sieht, wie viel Speicher belegt ist, und wird bei 80 und 100 Prozent gewarnt. Bei Überschreitung wird nur das Hochladen gesperrt, nie etwas gelöscht.',
                    en: 'The club sees how much storage is used and is warned at 80 and 100 percent. When the limit is exceeded only uploading is blocked, nothing is ever deleted.',
                },
            },
        ],
    },
    {
        id: '2026-10-29-navigation-suche',
        date: '2026-10-29',
        title: { de: 'Neue Navigation, „Heute“ & Suche', en: 'New navigation, "Today" & search' },
        changes: [
            {
                type: 'feature',
                title: { de: 'Startseite „Heute“', en: '"Today" start page' },
                description: {
                    de: 'In App und Website siehst du, was ansteht: fehlende Zusagen, Absagen, Ungelesenes, offene Abstimmungen. Der Vorstand sieht zusätzlich offene Anträge und fällige Wartung.',
                    en: 'In the app and on the website you see what is coming up: missing answers, cancellations, unread items, open votes. The board also sees open applications and maintenance due.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Suche im Verein', en: 'Search in the club' },
                description: {
                    de: 'Mitglieder (nur mit Recht), Termine, Dokumente und Orte in einer Suche. Auf der Website mit Strg+K.',
                    en: 'Members (only with permission), events, documents and places in one search. On the website with Ctrl+K.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Willkommen und Einrichten', en: 'Welcome and setup' },
                description: {
                    de: 'Eine kurze Einführung für Neue und eine Checkliste „Verein einrichten“.',
                    en: 'A short introduction for newcomers and a "Set up your club" checklist.',
                },
            },
            {
                type: 'feature',
                title: { de: 'Offline lesen in der App', en: 'Read offline in the app' },
                description: {
                    de: 'Termine, Vereinsliste und der Ausweis sind auch ohne Netz lesbar, mit Hinweis auf den Stand.',
                    en: 'Events, club list and the card can be read without a network, with a note on how recent they are.',
                },
            },
            {
                type: 'improvement',
                title: { de: 'Neue Navigation', en: 'New navigation' },
                description: {
                    de: 'Die App hat fünf Tabs (Heute, Kalender, Mitteilungen, Verein, Mehr). Die Website hat eine gruppierte Seitenleiste mit Pfadanzeige.',
                    en: 'The app has five tabs (Heute, Kalender, Mitteilungen, Verein, Mehr). The website has a grouped sidebar with breadcrumbs.',
                },
            },
            {
                type: 'improvement',
                title: { de: 'Barrierefreiheit und Fehlermeldungen', en: 'Accessibility and error messages' },
                description: {
                    de: 'Sprunglink zum Inhalt, größere Bedienflächen, bessere Kontraste und verständliche Fehlermeldungen statt Servertexten.',
                    en: 'A skip link to the content, larger touch targets, better contrast and understandable error messages instead of server texts.',
                },
            },
            {
                type: 'fix',
                title: { de: 'Vereinswechsel und Formulare', en: 'Club switcher and forms' },
                description: {
                    de: 'Wer in mehreren Vereinen ist, wählt jetzt selbst, statt stillschweigend im ersten zu landen. Formulare verwerfen Eingaben nicht mehr ohne Rückfrage.',
                    en: 'Anyone in several clubs now chooses instead of silently landing in the first one. Forms no longer discard input without asking.',
                },
            },
        ],
    },
    {
        id: '2026-10-30-hilfe-anleitungen',
        date: '2026-10-30',
        title: { de: 'Hilfe & Anleitungen', en: 'Help & guides' },
        changes: [
            {
                type: 'feature',
                title: { de: 'Dokumentationsportal', en: 'Documentation portal' },
                description: {
                    de: 'Ein eigenes Hilfeportal mit Leitfaden „Verein aufsetzen“, Handbuch nach Aufgaben, Szenario-Anleitungen, Glossar und FAQ. Auf Deutsch, mit Suche, ohne Tracking. Die feste öffentliche Adresse wird noch eingerichtet.',
                    en: 'A dedicated help portal with the guide "Set up your club", a task-based manual, scenario guides, a glossary and FAQ. In German, with search, without tracking. The permanent public address is still being set up.',
                },
            },
        ],
    },
    {
        id: '2026-10-31-zeiterfassung-stundenbericht',
        date: '2026-10-31',
        title: { de: 'Zeiterfassung & Stundenbericht', en: 'Time tracking & hours report' },
        changes: [
            {
                type: 'feature',
                title: { de: 'Stundenbericht mit Export', en: 'Hours report with export' },
                description: {
                    de: 'Stunden nach Person, Rolle, Abteilung und Termin, als CSV oder Excel. Das ist eine Berechnungsgrundlage, keine Abrechnung und keine Auszahlung; Beträge sieht nur, wer das darf.',
                    en: 'Hours by person, role, department and event, as CSV or Excel. This is a basis for calculation, not billing and not a payout; only those allowed to see amounts see them.',
                },
            },
            {
                type: 'feature',
                title: { de: '„Meine Stunden“ und „Team-Stunden“ in der App', en: '"My hours" and "Team hours" in the app' },
                description: {
                    de: 'Eigene bestätigte und offene Stunden pro Monat, und für Berechtigte die Stunden pro Person.',
                    en: 'Your own confirmed and open hours per month, and for those with access the hours per person.',
                },
            },
            {
                type: 'improvement',
                title: { de: 'Stempeln nach Stundensatz', en: 'Clocking in by hourly rate' },
                description: {
                    de: 'Wer heute einen Stundensatz hat, darf Zeiten erfassen, auch über eine Vereinsrolle. Die Bestätigung bleibt bei der Abteilungsleitung.',
                    en: 'Anyone who has an hourly rate today may record time, including via a club role. Confirmation stays with the department lead.',
                },
            },
            {
                type: 'improvement',
                title: { de: 'Hilfe-Links in Website und App', en: 'Help links in website and app' },
                description: {
                    de: 'Die Hilfe öffnet die passende Anleitung; in der App unter Mehr, Hilfe & Anleitungen.',
                    en: 'Help opens the matching guide; in the app under Mehr, Hilfe & Anleitungen.',
                },
            },
        ],
    },
];
