import type { LucideIcon } from 'lucide-react';
import {
    Baby,
    Boxes,
    Building2,
    CalendarDays,
    ClipboardList,
    Clock,
    FileText,
    LayoutDashboard,
    MapPin,
    Megaphone,
    ShieldCheck,
    Timer,
    Users,
    Vote,
} from 'lucide-react';

/** Which platform(s) a built capability ships on today. */
export type BuiltPlatform = 'web' | 'app' | 'both';

export interface BuiltCapability {
    label: { de: string; en: string };
    platform: BuiltPlatform;
}

export interface BuiltFeatureArea {
    /** Stable, unique key -- also used as the React list key. */
    id: string;
    icon: LucideIcon;
    title: { de: string; en: string };
    capabilities: BuiltCapability[];
}

/**
 * What's already built and usable today, shown at /features -- the
 * "here's what you get right now" answer, grouped by feature area, each
 * capability tagged with the platform(s) it ships on. See /roadmap for
 * what's planned but not yet built.
 *
 * Updated 2026-10-31 for the delivered work up to the time-tracking report (Feature List §11-§21).
 * Sourced 1:1 from the internal Feature List (`lpj-its-vault`, "Feature
 * List - MyVerein.md"), which is the verified source of truth for shipped
 * status. Only customer-visible ✅ rows are included here -- backend-only
 * plumbing without any direct UI (e.g. the two-tier role model behind
 * §2.4, the `guardian_links` data layer behind §1.6, the shared
 * availability data source behind §4.3) and the still-⬜ items are
 * deliberately left out -- those belong on /roadmap instead, not here.
 * Platform tags follow the Feature List's "Plattform" column, so management
 * screens that only exist on the website are tagged 'web'. Some adjacent doc rows (esp. the
 * Wave 2 meeting-management rows §3.6-3.10) are condensed into fewer,
 * punchier capability labels -- this is marketing copy, not a spec, but
 * every capability below traces back to a ✅ row.
 *
 * To add an entry: append it to the relevant area's `capabilities`, or add
 * a new area object. No other file needs to change.
 */
export const BUILT_FEATURE_AREAS: BuiltFeatureArea[] = [
    {
        id: 'mitgliederverwaltung',
        icon: Users,
        title: {
            de: 'Mitgliederverwaltung',
            en: 'Member management',
        },
        capabilities: [
            {
                label: { de: 'Stammdaten & Mitgliederliste einsehen', en: 'View member records & roster' },
                platform: 'both',
            },
            {
                label: { de: 'Mitgliederdaten bearbeiten', en: 'Edit member data' },
                platform: 'web',
            },
            {
                label: { de: 'Geburtsdatum & Notfallkontakt selbst pflegen', en: 'Maintain your own birth date & emergency contact' },
                platform: 'both',
            },
            {
                label: { de: 'Digitaler Aufnahmeantrag', en: 'Digital membership application' },
                platform: 'both',
            },
            {
                label: { de: 'Vereinsrollen zuweisen', en: 'Assign club roles' },
                platform: 'web',
            },
            {
                label: { de: 'Mitglieder ohne Konto führen und später per E-Mail einladen', en: 'Keep members without an account and invite them by email later' },
                platform: 'web',
            },
            {
                label: { de: 'Suchen, filtern, CSV-Import und -Export der Mitgliederliste', en: 'Search, filter, CSV import and export of the member list' },
                platform: 'web',
            },
            {
                label: { de: 'Status-Verlauf, Kategorien und Austritt mit Rückgabe-Checkliste', en: 'Status history, categories and exit with a hand-back checklist' },
                platform: 'web',
            },
            {
                label: { de: 'Abteilungen anlegen', en: 'Create departments' },
                platform: 'web',
            },
            {
                label: { de: 'Abteilungen einsehen (mit Farbcodierung)', en: 'Browse departments (color-coded)' },
                platform: 'both',
            },
        ],
    },
    {
        id: 'vereinsinfo',
        icon: Building2,
        title: {
            de: 'Vereinsinfo & Rollenmodell',
            en: 'Club info & roles',
        },
        capabilities: [
            {
                label: { de: 'Aktuellen Vorstand einsehen', en: 'View the current board' },
                platform: 'both',
            },
            {
                label: {
                    de: 'Vereinsdokumente (Satzung, Ordnungen, ...) mit Version und „gültig seit“ lesen',
                    en: 'Read club documents (bylaws, rules, ...) with version and "valid since"',
                },
                platform: 'both',
            },
        ],
    },
    {
        id: 'kalender-treffen',
        icon: CalendarDays,
        title: {
            de: 'Kalenderverwaltung & Treffenmanagement',
            en: 'Calendar & meeting management',
        },
        capabilities: [
            {
                label: { de: 'Termine einsehen (nach Sichtbarkeit gefiltert)', en: 'View events (filtered by visibility)' },
                platform: 'both',
            },
            {
                label: { de: 'Monatskalender mit Tagesansicht', en: 'Month calendar with day view' },
                platform: 'both',
            },
            {
                label: { de: 'Termine anlegen & bearbeiten', en: 'Create & edit events' },
                platform: 'both',
            },
            {
                label: { de: 'An-/Abmelden zu Terminen inkl. Warteliste', en: 'RSVP to events, with waitlist support' },
                platform: 'both',
            },
            {
                label: {
                    de: 'Kalender mit rollenbasierten Sichtbarkeits-Freigaben',
                    en: 'Calendars with role-based visibility rules',
                },
                platform: 'both',
            },
            {
                label: { de: 'Sitzungen mit Agenda & Protokoll', en: 'Meetings with agenda & minutes' },
                platform: 'both',
            },
            {
                label: { de: 'Terminfindung per Verfügbarkeitsabgleich', en: 'Scheduling polls based on real availability' },
                platform: 'both',
            },
            {
                label: {
                    de: 'Zu-/Absagen, Anwesenheit & Abstimmungen erfassen',
                    en: 'Track RSVPs, attendance & voting results',
                },
                platform: 'both',
            },
        ],
    },
    {
        id: 'verfuegbarkeit',
        icon: Clock,
        title: {
            de: 'Verfügbarkeitsverwaltung',
            en: 'Availability management',
        },
        capabilities: [
            {
                label: { de: 'Wiederkehrende Verfügbarkeit pflegen', en: 'Set recurring availability' },
                platform: 'both',
            },
            {
                label: {
                    de: 'Ausnahmen eintragen (Urlaub, zusätzlich verfügbar)',
                    en: 'Log exceptions (time off, extra availability)',
                },
                platform: 'both',
            },
        ],
    },
    {
        id: 'material',
        icon: Boxes,
        title: {
            de: 'Lager- & Materialmanagement',
            en: 'Inventory & equipment management',
        },
        capabilities: [
            {
                label: { de: 'Inventarliste einsehen', en: 'View the inventory list' },
                platform: 'both',
            },
            {
                label: { de: 'Inventar anlegen, bearbeiten & löschen', en: 'Add, edit & remove inventory items' },
                platform: 'both',
            },
            {
                label: { de: 'Ausleihe & Rückgabe per Selbstbedienung', en: 'Self-service check-out & return' },
                platform: 'app',
            },
            {
                label: { de: 'Schadensmeldung mit Foto', en: 'Report damage with a photo' },
                platform: 'app',
            },
            {
                label: { de: 'Schadensmeldungen bearbeiten (Triage)', en: 'Triage damage reports' },
                platform: 'both',
            },
            {
                label: {
                    de: 'Überfälligkeits- & Wartungsstatus auf einen Blick',
                    en: 'Overdue & maintenance status at a glance',
                },
                platform: 'both',
            },
        ],
    },
    {
        id: 'standorte',
        icon: MapPin,
        title: {
            de: 'Info-Center: Standorte',
            en: 'Info center: locations',
        },
        capabilities: [
            {
                label: { de: 'Standorte einsehen (Adresse, Anfahrt, Öffnungszeiten)', en: 'View locations (address, directions, hours)' },
                platform: 'both',
            },
            {
                label: { de: 'Standorte anlegen, bearbeiten & löschen', en: 'Add, edit & remove locations' },
                platform: 'both',
            },
            {
                label: {
                    de: 'WLAN-Zugangsdaten & weiterführende Links einsehen',
                    en: 'View WiFi credentials & useful links',
                },
                platform: 'both',
            },
            {
                label: { de: 'WLAN-QR-Code zum schnellen Verbinden', en: 'WiFi QR code for quick connecting' },
                platform: 'both',
            },
            {
                label: { de: 'WLAN-Netze & Links verwalten', en: 'Manage WiFi networks & links' },
                platform: 'both',
            },
            {
                label: { de: 'Schlüsselverwaltung', en: 'Key management' },
                platform: 'web',
            },
        ],
    },
    {
        id: 'termine-anwesenheit',
        icon: ClipboardList,
        title: {
            de: 'Termine, Anwesenheit & Helfer',
            en: 'Events, attendance & helpers',
        },
        capabilities: [
            {
                label: { de: 'Serientermine mit Feiertags-Überspringen, mehrtägige und ganztägige Termine', en: 'Recurring events that can skip public holidays, multi-day and all-day events' },
                platform: 'both',
            },
            {
                label: { de: 'Serie bearbeiten oder absagen: nur ein Termin, ab hier oder alle', en: 'Edit or cancel a series: one date, from here on, or all' },
                platform: 'both',
            },
            {
                label: { de: 'Kalender als abonnierbarer Link (widerrufbar) und iCal-Export', en: 'Calendar as a subscribable link (revocable) and iCal export' },
                platform: 'both',
            },
            {
                label: { de: 'Anwesenheit antippen, auch für Mitglieder ohne Konto und Gäste', en: 'Tap attendance, also for members without an account and guests' },
                platform: 'both',
            },
            {
                label: { de: 'Anwesenheits-Auswertung je Person, Gruppe und Termin mit CSV-Export', en: 'Attendance reports per person, group and event with CSV export' },
                platform: 'web',
            },
            {
                label: { de: 'Anmeldung mit Formular, Begleitpersonen, Kapazität und Warteliste', en: 'Registration with a form, companions, capacity and waiting list' },
                platform: 'both',
            },
            {
                label: { de: 'Teilnehmerliste mit Antworten und CSV-Export', en: 'Participant list with answers and CSV export' },
                platform: 'web',
            },
            {
                label: { de: 'Gäste-Anmeldung ohne Konto per Link mit E-Mail-Bestätigung', en: 'Guest registration without an account via link with email confirmation' },
                platform: 'web',
            },
            {
                label: { de: 'Helferplan mit Schichten, Eintragen, Abgeben und Tauschen', en: 'Helper plan with shifts: sign up, hand over and swap' },
                platform: 'both',
            },
            {
                label: { de: 'Fahrgemeinschaften anbieten und anfragen', en: 'Offer and request carpools' },
                platform: 'both',
            },
            {
                label: { de: 'Räume und Plätze buchen mit Kollisionswarnung', en: 'Book rooms and pitches with a clash warning' },
                platform: 'web',
            },
        ],
    },
    {
        id: 'zeiterfassung',
        icon: Timer,
        title: {
            de: 'Zeiterfassung & Stundenbericht',
            en: 'Time tracking & hours report',
        },
        capabilities: [
            {
                label: { de: 'Ein- und Ausstempeln, wer einen Stundensatz hat', en: 'Clock in and out for everyone who has an hourly rate' },
                platform: 'both',
            },
            {
                label: { de: 'Vorschlag aus der Anwesenheit, Bestätigung durch die Abteilungsleitung', en: 'Suggestion from attendance, confirmation by the department lead' },
                platform: 'web',
            },
            {
                label: { de: 'Manuelle Zeiteinträge und Stundensätze verwalten', en: 'Manual time entries and managing hourly rates' },
                platform: 'web',
            },
            {
                label: { de: 'Stundenbericht nach Person, Rolle, Abteilung und Termin', en: 'Hours report by person, role, department and event' },
                platform: 'web',
            },
            {
                label: { de: 'Export als CSV und Excel als Berechnungsgrundlage (keine Abrechnung, keine Auszahlung)', en: 'Export as CSV and Excel as a basis for calculation (no billing, no payout)' },
                platform: 'web',
            },
            {
                label: { de: '„Meine Stunden“ und „Team-Stunden“ pro Monat', en: '"My hours" and "Team hours" per month' },
                platform: 'app',
            },
        ],
    },
    {
        id: 'mitteilungen',
        icon: Megaphone,
        title: {
            de: 'Mitteilungen & Benachrichtigungen',
            en: 'Announcements & notifications',
        },
        capabilities: [
            {
                label: { de: 'Mitteilungen an Verein, Abteilung, Rolle oder Einzelne schreiben, planen und zurückziehen', en: 'Write, schedule and withdraw announcements to the club, a department, a role or individuals' },
                platform: 'web',
            },
            {
                label: { de: 'Empfänger-Vorschau und Zustell- und Lesestatus', en: 'Recipient preview and delivery and read status' },
                platform: 'web',
            },
            {
                label: { de: 'Schwarzes Brett mit Anpinnen, Dringend-Kennzeichen und Ungelesen-Zähler', en: 'Notice board with pinning, an urgent flag and an unread counter' },
                platform: 'both',
            },
            {
                label: { de: 'Push-Mitteilungen mit Direkt-Link auf Mitteilung oder Termin', en: 'Push notifications that open the announcement or event directly' },
                platform: 'app',
            },
            {
                label: { de: 'Erinnerungen an Termine, Rückgaben und fehlende Zusagen', en: 'Reminders for events, returns and missing answers' },
                platform: 'both',
            },
            {
                label: { de: 'Benachrichtigungen je Kategorie und Kanal einstellen, Abmeldelink in jeder optionalen Mail', en: 'Set notifications per category and channel, unsubscribe link in every optional email' },
                platform: 'both',
            },
            {
                label: { de: 'Termin absagen statt löschen, Betroffene werden benachrichtigt', en: 'Cancel an event instead of deleting it, affected people are notified' },
                platform: 'both',
            },
        ],
    },
    {
        id: 'abstimmungen-versammlung',
        icon: Vote,
        title: {
            de: 'Abstimmungen, Versammlung & Protokoll',
            en: 'Votes, assembly & minutes',
        },
        capabilities: [
            {
                label: { de: 'Satzungsparameter, Tagesordnung und fristgeprüfte Einladung mit Versandnachweis', en: 'Statute parameters, agenda and an invitation checked against the deadline with proof of dispatch' },
                platform: 'web',
            },
            {
                label: { de: 'Zu- und Absage, Vollmacht, Check-in und Beschlussfähigkeit live', en: 'Accept or decline, proxy, check-in and live quorum' },
                platform: 'both',
            },
            {
                label: { de: 'Digital abstimmen, offen oder geheim, mit Auszählung', en: 'Vote digitally, open or secret, with counting' },
                platform: 'both',
            },
            {
                label: { de: 'Umlaufbeschlüsse, wenn die Satzung das erlaubt', en: 'Circular resolutions, if the statutes allow it' },
                platform: 'web',
            },
            {
                label: { de: 'Wahlen mit Kandidaturen, Wahlgängen und Amtszeit-Überwachung', en: 'Elections with candidacies, rounds and term monitoring' },
                platform: 'web',
            },
            {
                label: { de: 'Protokoll mit Freigabe, Berichtigung und Export', en: 'Minutes with approval, corrections and export' },
                platform: 'web',
            },
            {
                label: { de: 'Protokolle und Amtszeit-Hinweise lesen', en: 'Read minutes and term notices' },
                platform: 'app',
            },
        ],
    },
    {
        id: 'dokumente-pdf',
        icon: FileText,
        title: {
            de: 'Dokumente, PDF & Mitgliedsausweis',
            en: 'Documents, PDF & membership card',
        },
        capabilities: [
            {
                label: { de: 'Dokumentenarchiv mit Ordnerrechten, Versionen, Suche und Papierkorb', en: 'Document archive with folder permissions, versions, search and recycle bin' },
                platform: 'both',
            },
            {
                label: { de: '„Meine Dokumente“ als persönliche Ablage, auch für Mitglieder ohne Konto', en: '"My documents" as personal storage, also for members without an account' },
                platform: 'both',
            },
            {
                label: { de: 'PDF: Aufnahmebeleg, Mitgliedsbestätigung, Mitgliederliste, Protokoll, Teilnehmerliste', en: 'PDF: admission receipt, membership confirmation, member list, minutes, attendee list' },
                platform: 'both',
            },
            {
                label: { de: 'Digitale Bestätigung einsammeln, mit Nachweis-PDF (keine qualifizierte Signatur)', en: 'Collect digital confirmations with a proof PDF (not a qualified signature)' },
                platform: 'both',
            },
            {
                label: { de: 'Digitaler Mitgliedsausweis mit QR-Code und druckbarem PDF', en: 'Digital membership card with QR code and printable PDF' },
                platform: 'both',
            },
            {
                label: { de: 'Ausweis offline in der App und Kontrolle per Kamera-Scan', en: 'Card offline in the app and checking by camera scan' },
                platform: 'app',
            },
            {
                label: { de: 'Vereins-Branding (Logo, Farben, Briefkopf) und Speicher-Übersicht', en: 'Club branding (logo, colours, letterhead) and storage overview' },
                platform: 'web',
            },
        ],
    },
    {
        id: 'datenschutz',
        icon: ShieldCheck,
        title: {
            de: 'Datenschutz & Einwilligungen',
            en: 'Data protection & consent',
        },
        capabilities: [
            {
                label: { de: 'Freiwillige Einwilligungen mit Textversionen, erteilen und widerrufen', en: 'Voluntary consents with text versions, give and withdraw' },
                platform: 'both',
            },
            {
                label: { de: 'Übersicht Mitglieder × Zweck und Erinnerung an Offene', en: 'Overview of members × purpose and a reminder for open ones' },
                platform: 'web',
            },
            {
                label: { de: 'Datenauskunft als Export und Löschung mit Prüf-Plan', en: 'Data access export and deletion with a review plan' },
                platform: 'web',
            },
            {
                label: { de: 'Anfragen mit Fristanzeige und Legal Hold', en: 'Requests with a deadline indicator and legal hold' },
                platform: 'both',
            },
            {
                label: { de: 'Datenschutzhinweis des Vereins aus Vorlage (Muster, keine Rechtsberatung)', en: 'Club privacy notice from a template (sample, not legal advice)' },
                platform: 'both',
            },
            {
                label: { de: 'Aufbewahrungsfristen als Vorschlag, Zugriffs- und Änderungsprotokoll', en: 'Retention periods as a suggestion, access and change log' },
                platform: 'web',
            },
            {
                label: { de: 'Sichtbarkeit je Feld (Telefon, E-Mail, Anschrift, Foto) einstellen', en: 'Set visibility per field (phone, email, address, photo)' },
                platform: 'both',
            },
        ],
    },
    {
        id: 'familie',
        icon: Baby,
        title: {
            de: 'Familie & Eltern',
            en: 'Family & parents',
        },
        capabilities: [
            {
                label: { de: 'Eltern-Zugang mit Kinderübersicht, vom Vorstand bestätigt', en: 'Parent access with an overview of the children, confirmed by the board' },
                platform: 'both',
            },
            {
                label: { de: 'Zu- und Absage für Kinder ohne eigenes Konto', en: 'Accept or decline for children without an account of their own' },
                platform: 'both',
            },
            {
                label: { de: 'Krankmeldung ohne Diagnose, Trainer:innen werden benachrichtigt', en: 'Sick notice without a diagnosis, coaches are notified' },
                platform: 'both',
            },
            {
                label: { de: 'Aufnahmeantrag für das eigene Kind', en: 'Membership application for your own child' },
                platform: 'web',
            },
            {
                label: { de: 'Einwilligungen und Bestätigungen für das Kind', en: 'Consents and confirmations for the child' },
                platform: 'both',
            },
        ],
    },
    {
        id: 'formulare',
        icon: ClipboardList,
        title: {
            de: 'Formulare & Zusatzfelder',
            en: 'Forms & extra fields',
        },
        capabilities: [
            {
                label: { de: 'Aufnahme- und Austrittsformular mit eigenen Fragen gestalten', en: 'Design the application and exit forms with your own questions' },
                platform: 'web',
            },
            {
                label: { de: 'Antrag mit dem Vereinsformular stellen, Entwurf speichern', en: 'Apply with the club form, save a draft' },
                platform: 'both',
            },
            {
                label: { de: 'Zusatzfelder und Profil-Bausteine am Mitglied', en: 'Extra fields and profile modules on the member' },
                platform: 'web',
            },
        ],
    },
    {
        id: 'heute-suche',
        icon: LayoutDashboard,
        title: {
            de: 'Heute, Suche & Hilfe',
            en: 'Today, search & help',
        },
        capabilities: [
            {
                label: { de: 'Startseite „Heute“ mit dem, was ansteht', en: 'A "Today" start page with what is coming up' },
                platform: 'both',
            },
            {
                label: { de: 'Globale Suche nach Mitgliedern (mit Recht), Terminen, Dokumenten und Orten', en: 'Global search for members (with permission), events, documents and places' },
                platform: 'both',
            },
            {
                label: { de: 'Offline-Lesekopien von Terminen und Vereinsliste in der App', en: 'Offline read copies of events and the club list in the app' },
                platform: 'app',
            },
            {
                label: { de: 'Hilfe & Anleitungen mit Link zur passenden Seite', en: 'Help & guides with a link to the matching page' },
                platform: 'both',
            },
        ],
    },
];
