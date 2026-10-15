import { type Language } from './supportedLanguages';

type Translation = Partial<Record<Language, Record<string, string>>>;

// DE/EN only by design, same as VereinTranslation.ts -- see KalenderTranslation.ts.
const VerfuegbarkeitTranslation: Translation = {
    de: {
        'nav.verfuegbarkeit': 'Verfügbarkeit',
        'verfuegbarkeit.page.title': 'Verfügbarkeit',
        'verfuegbarkeit.weekday.monday': 'Montag',
        'verfuegbarkeit.weekday.tuesday': 'Dienstag',
        'verfuegbarkeit.weekday.wednesday': 'Mittwoch',
        'verfuegbarkeit.weekday.thursday': 'Donnerstag',
        'verfuegbarkeit.weekday.friday': 'Freitag',
        'verfuegbarkeit.weekday.saturday': 'Samstag',
        'verfuegbarkeit.weekday.sunday': 'Sonntag',
        'verfuegbarkeit.start-time': 'Von',
        'verfuegbarkeit.end-time': 'Bis',
        'verfuegbarkeit.exceptions.title': 'Ausnahmen',
        'verfuegbarkeit.exceptions.add': 'Ausnahme hinzufügen',
        'verfuegbarkeit.exceptions.date': 'Datum',
        'verfuegbarkeit.exceptions.available': 'Verfügbar',
        'verfuegbarkeit.exceptions.unavailable': 'Nicht verfügbar',
        'verfuegbarkeit.exceptions.note': 'Notiz (optional)',
        'verfuegbarkeit.exceptions.empty': 'Noch keine Ausnahmen erfasst.',
        'verfuegbarkeit.exceptions.remove': 'Entfernen',
        'verfuegbarkeit.exceptions.status': 'Status',
        'verfuegbarkeit.weekly.title': 'Wöchentliche Verfügbarkeit',
        'verfuegbarkeit.weekly.hint': 'Tippe auf einen Wochentag, um ihn ein- oder auszuschalten, und lege darunter die Uhrzeit fest.',
    },
    en: {
        'nav.verfuegbarkeit': 'Availability',
        'verfuegbarkeit.page.title': 'Availability',
        'verfuegbarkeit.weekday.monday': 'Monday',
        'verfuegbarkeit.weekday.tuesday': 'Tuesday',
        'verfuegbarkeit.weekday.wednesday': 'Wednesday',
        'verfuegbarkeit.weekday.thursday': 'Thursday',
        'verfuegbarkeit.weekday.friday': 'Friday',
        'verfuegbarkeit.weekday.saturday': 'Saturday',
        'verfuegbarkeit.weekday.sunday': 'Sunday',
        'verfuegbarkeit.start-time': 'From',
        'verfuegbarkeit.end-time': 'To',
        'verfuegbarkeit.exceptions.title': 'Exceptions',
        'verfuegbarkeit.exceptions.add': 'Add exception',
        'verfuegbarkeit.exceptions.date': 'Date',
        'verfuegbarkeit.exceptions.available': 'Available',
        'verfuegbarkeit.exceptions.unavailable': 'Not available',
        'verfuegbarkeit.exceptions.note': 'Note (optional)',
        'verfuegbarkeit.exceptions.empty': 'No exceptions yet.',
        'verfuegbarkeit.exceptions.remove': 'Remove',
        'verfuegbarkeit.exceptions.status': 'Status',
        'verfuegbarkeit.weekly.title': 'Weekly availability',
        'verfuegbarkeit.weekly.hint': 'Tap a weekday to switch it on or off, then set the times below.',
    },
};

export default VerfuegbarkeitTranslation;
