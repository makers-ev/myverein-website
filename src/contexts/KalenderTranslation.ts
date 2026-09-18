import { type Language } from './supportedLanguages';

type Translation = Partial<Record<Language, Record<string, string>>>;

// DE/EN only by design, same as VereinTranslation.ts/LegalTranslation.ts --
// other languages resolve via LanguageContext.tsx's per-key English
// fallback, no alias trick needed (this module isn't typed as a complete
// Record<Language, ...> the way mobile's modules are).
const KalenderTranslation: Translation = {
    de: {
        'nav.kalender': 'Kalender',
        'kalender.page.title': 'Kalender',
        'kalender.tab.termine': 'Termine',
        'kalender.tab.treffen': 'Treffen',

        'kalender.calendars.title': 'Kalenderverwaltung',
        'kalender.calendars.empty': 'Noch keine Kalender angelegt.',
        'kalender.calendars.new.name': 'Name',
        'kalender.calendars.new.department': 'Abteilung',
        'kalender.calendars.new.department.none': 'Vereinsweit',
        'kalender.calendars.new.submit': 'Kalender anlegen',
        'kalender.calendars.default': 'Standard',

        'kalender.calendars.visibility.title': 'Sichtbarkeit',
        'kalender.calendars.visibility.everyone': 'Vereinsweit sichtbar (keine Einschränkung)',
        'kalender.calendars.visibility.member': 'Mitglied',
        'kalender.calendars.visibility.role': 'Rolle',
        'kalender.calendars.visibility.department': 'Abteilung',
        'kalender.calendars.visibility.add': 'Freigabe hinzufügen',
        'kalender.calendars.visibility.remove': 'Entfernen',

        'kalender.events.title': 'Termine',
        'kalender.events.empty': 'Keine Termine.',
        'kalender.events.new': 'Neuer Termin',
        'kalender.events.new.calendar': 'Kalender',
        'kalender.events.new.title': 'Titel',
        'kalender.events.new.description': 'Beschreibung',
        'kalender.events.new.category': 'Kategorie',
        'kalender.events.new.startsAt': 'Beginn',
        'kalender.events.new.endsAt': 'Ende',
        'kalender.events.new.capacity': 'Kapazität (optional)',
        'kalender.events.new.submit': 'Anlegen',
        'kalender.events.rsvp': 'Anmelden',
        'kalender.events.rsvp.confirmed': 'Angemeldet',
        'kalender.events.rsvp.waitlist': 'Warteliste',
        'kalender.events.rsvp.cancel': 'Abmelden',
    },
    en: {
        'nav.kalender': 'Calendar',
        'kalender.page.title': 'Calendar',
        'kalender.tab.termine': 'Events',
        'kalender.tab.treffen': 'Meetings',

        'kalender.calendars.title': 'Calendar management',
        'kalender.calendars.empty': 'No calendars yet.',
        'kalender.calendars.new.name': 'Name',
        'kalender.calendars.new.department': 'Department',
        'kalender.calendars.new.department.none': 'Club-wide',
        'kalender.calendars.new.submit': 'Create calendar',
        'kalender.calendars.default': 'Default',

        'kalender.calendars.visibility.title': 'Visibility',
        'kalender.calendars.visibility.everyone': 'Club-wide visible (no restriction)',
        'kalender.calendars.visibility.member': 'Member',
        'kalender.calendars.visibility.role': 'Role',
        'kalender.calendars.visibility.department': 'Department',
        'kalender.calendars.visibility.add': 'Add grant',
        'kalender.calendars.visibility.remove': 'Remove',

        'kalender.events.title': 'Events',
        'kalender.events.empty': 'No events.',
        'kalender.events.new': 'New event',
        'kalender.events.new.calendar': 'Calendar',
        'kalender.events.new.title': 'Title',
        'kalender.events.new.description': 'Description',
        'kalender.events.new.category': 'Category',
        'kalender.events.new.startsAt': 'Starts',
        'kalender.events.new.endsAt': 'Ends',
        'kalender.events.new.capacity': 'Capacity (optional)',
        'kalender.events.new.submit': 'Create',
        'kalender.events.rsvp': 'Sign up',
        'kalender.events.rsvp.confirmed': 'Signed up',
        'kalender.events.rsvp.waitlist': 'Waitlisted',
        'kalender.events.rsvp.cancel': 'Cancel',
    },
};

export default KalenderTranslation;
