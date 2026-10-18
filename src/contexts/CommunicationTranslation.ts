import type { Language } from './supportedLanguages';

type Translation = Partial<Record<Language, Record<string, string>>>;

// Club communication (Wave 9): "Mitteilungen" of the club (announcements + inbox), notification settings, the public
// unsubscribe page, event cancellation and the club's mail template. Wording rule (W8): the bell in the navbar shows
// *platform* notifications (messages of MyVerein itself), "Mitteilungen" are messages of the *club* -- never mix the two
// words. DE/EN only (like the other club-area files); other languages fall back to English via t().
const CommunicationTranslation: Translation = {
    de: {
        'nav.mitteilungen': 'Mitteilungen',

        'mitteilungen.page.title': 'Mitteilungen',
        'mitteilungen.page.subtitle': 'Nachrichten deines Vereins. Hinweise der Plattform findest du unter der Glocke.',
        'mitteilungen.noRights': 'Du hast keine Berechtigung, Mitteilungen zu verfassen.',
        'mitteilungen.tab.verfassen': 'Verfassen',
        'mitteilungen.scope.department': 'Du schreibst im Namen deiner Abteilung(en) und erreichst nur deren Mitglieder.',
        'mitteilungen.done.draft': 'Entwurf gespeichert. Du findest ihn im Verlauf.',
        'mitteilungen.done.sent': 'Mitteilung wurde versendet.',
        'mitteilungen.done.scheduled': 'Mitteilung ist geplant und geht zum gewählten Zeitpunkt raus.',

        'mitteilungen.field.title': 'Titel',
        'mitteilungen.field.body': 'Text',
        'mitteilungen.field.body.hint': 'Nur Text, keine Formatierung. {{count}} / {{max}} Zeichen.',

        'mitteilungen.section.audience': 'An wen?',
        'mitteilungen.section.channels': 'Wie?',
        'mitteilungen.section.options': 'Optionen',

        'mitteilungen.audience.club': 'Verein',
        'mitteilungen.audience.all': 'Alle Mitglieder des Vereins',
        'mitteilungen.audience.departments': 'Abteilungen',
        'mitteilungen.audience.departments.empty': 'Der Verein hat noch keine Abteilungen.',
        'mitteilungen.audience.departments.none-own': 'Dir ist keine Abteilung zugeordnet.',
        'mitteilungen.audience.roles': 'Funktionen und Rollen',
        'mitteilungen.audience.categories': 'Mitgliedskategorien',
        'mitteilungen.audience.categories.empty': 'Keine Kategorien angelegt.',
        'mitteilungen.audience.members': 'Einzelne Mitglieder',
        'mitteilungen.audience.members.picked': 'Ausgewählte Mitglieder',
        'mitteilungen.audience.members.remove': '{{name}} entfernen',
        'mitteilungen.audience.members.search': 'Mitglied suchen (mind. 2 Buchstaben)',
        'mitteilungen.audience.members.none': 'Keine Treffer.',
        'mitteilungen.audience.members.added': 'Hinzugefügt',
        'mitteilungen.audience.guardians': 'Erziehungsberechtigte einbeziehen',
        'mitteilungen.audience.guardians.hint': 'Erziehungsberechtigte von angeschriebenen Kindern erhalten die Mitteilung ebenfalls.',

        'mitteilungen.channels.inapp': 'Immer dabei: Schwarzes Brett in der App und auf der Website. Zusätzlich:',
        'mitteilungen.channel.email': 'E-Mail',
        'mitteilungen.channel.push': 'Push (App)',
        'mitteilungen.channel.in_app': 'Schwarzes Brett',

        'mitteilungen.option.urgent': 'Dringend',
        'mitteilungen.option.urgent.hint': 'Wird hervorgehoben. Nur für wirklich wichtige Dinge nutzen, die Zahl pro Tag ist begrenzt.',
        'mitteilungen.option.pinned': 'Oben anpinnen',
        'mitteilungen.option.pinned.hint': 'Bleibt auf dem Schwarzen Brett oben stehen.',
        'mitteilungen.option.expires': 'Ablaufdatum (optional)',
        'mitteilungen.option.expires.hint': 'Danach verschwindet die Mitteilung vom Schwarzen Brett.',
        'mitteilungen.option.schedule': 'Zeitlich planen',
        'mitteilungen.option.schedule.at': 'Versandzeitpunkt',

        'mitteilungen.preview.title': 'Wer wird erreicht?',
        'mitteilungen.preview.idle': 'Wähle eine Zielgruppe, dann siehst du hier, wie viele Personen die Mitteilung erreicht.',
        'mitteilungen.preview.error': 'Die Vorab-Zählung ist gerade nicht möglich. Du kannst trotzdem speichern.',
        'mitteilungen.preview.reach': 'Erreicht {{reachable}} von {{total}} Personen',
        'mitteilungen.preview.emailOnly': 'davon {{count}} nur per E-Mail',
        'mitteilungen.preview.push': '{{count}} per Push',
        'mitteilungen.preview.unreachable': '{{count}} nicht erreichbar (keine E-Mail-Adresse oder abgemeldet)',
        'mitteilungen.preview.shared': '{{count}} teilen sich eine E-Mail-Adresse (z. B. Familie)',

        'mitteilungen.action.send': 'Jetzt senden',
        'mitteilungen.action.schedule': 'Planen',
        'mitteilungen.action.sending': 'Wird gesendet …',
        'mitteilungen.action.draft': 'Als Entwurf speichern',
        'mitteilungen.send.hint': 'Nach dem Senden kannst du eine Mitteilung nicht mehr ändern, nur zurückziehen.',

        'mitteilungen.confirm.title': 'Wirklich an viele senden?',
        'mitteilungen.confirm.body': 'Diese Mitteilung geht an {{count}} Personen. Das lässt sich nicht rückgängig machen.',
        'mitteilungen.confirm.body.schedule': 'Diese Mitteilung wird zum gewählten Zeitpunkt an {{count}} Personen gesendet.',
        'mitteilungen.confirm.send': 'An {{count}} senden',
        'mitteilungen.confirm.schedule': 'Für {{count}} planen',

        'mitteilungen.problem.title': 'Bitte gib einen Titel ein.',
        'mitteilungen.problem.body': 'Bitte schreibe einen Text.',
        'mitteilungen.problem.audience': 'Bitte wähle, wer die Mitteilung bekommen soll.',
        'mitteilungen.problem.publishAt': 'Der Versandzeitpunkt muss in der Zukunft liegen.',
        'mitteilungen.problem.expiresAt': 'Das Ablaufdatum muss nach dem Versand liegen.',

        'mitteilungen.err.tooMany': 'Du hast gerade zu viele Mitteilungen gesendet. Bitte versuche es später erneut.',
        'mitteilungen.err.rule.announcement.max_recipients': 'Diese Mitteilung hat zu viele Empfänger. Bitte teile sie in kleinere Gruppen auf.',
        'mitteilungen.err.rule.announcement.club_day': 'Der Verein hat heute das Tageslimit für Mitteilungen erreicht. Bitte versuche es morgen erneut.',
        'mitteilungen.err.rule.announcement.author_hour': 'Du hast in der letzten Stunde schon viele Mitteilungen gesendet. Bitte warte etwas.',
        'mitteilungen.err.rule.announcement.urgent_day': 'Das Tageslimit für dringende Mitteilungen ist erreicht. Sende diese Mitteilung ohne „Dringend“ oder morgen.',
        'mitteilungen.err.rule.announcement.duplicate': 'Genau diese Mitteilung wurde gerade erst an dieselbe Zielgruppe gesendet.',
        'mitteilungen.err.confirmationRequired': 'Bitte bestätige die Empfängerzahl und sende erneut.',
        'mitteilungen.err.conflict': 'Diese Mitteilung kann in ihrem aktuellen Zustand nicht geändert werden. Bitte lade die Seite neu.',
        'mitteilungen.err.audienceTooLarge': 'Die Zielgruppe ist zu groß. Bitte wähle kleinere Gruppen.',
        // -- next:de
    },
    en: {
        'nav.mitteilungen': 'Announcements',

        'mitteilungen.page.title': 'Announcements',
        'mitteilungen.page.subtitle': 'Messages from your club. Notices from the platform are under the bell.',
        'mitteilungen.noRights': 'You are not allowed to write announcements.',
        'mitteilungen.tab.verfassen': 'Compose',
        'mitteilungen.scope.department': 'You write on behalf of your department(s) and only reach their members.',
        'mitteilungen.done.draft': 'Draft saved. You will find it in the history.',
        'mitteilungen.done.sent': 'Announcement sent.',
        'mitteilungen.done.scheduled': 'Announcement scheduled. It goes out at the chosen time.',

        'mitteilungen.field.title': 'Title',
        'mitteilungen.field.body': 'Text',
        'mitteilungen.field.body.hint': 'Plain text only. {{count}} / {{max}} characters.',

        'mitteilungen.section.audience': 'Who gets it?',
        'mitteilungen.section.channels': 'How?',
        'mitteilungen.section.options': 'Options',

        'mitteilungen.audience.club': 'Club',
        'mitteilungen.audience.all': 'All members of the club',
        'mitteilungen.audience.departments': 'Departments',
        'mitteilungen.audience.departments.empty': 'The club has no departments yet.',
        'mitteilungen.audience.departments.none-own': 'You are not assigned to a department.',
        'mitteilungen.audience.roles': 'Functions and roles',
        'mitteilungen.audience.categories': 'Membership categories',
        'mitteilungen.audience.categories.empty': 'No categories yet.',
        'mitteilungen.audience.members': 'Individual members',
        'mitteilungen.audience.members.picked': 'Selected members',
        'mitteilungen.audience.members.remove': 'Remove {{name}}',
        'mitteilungen.audience.members.search': 'Search a member (at least 2 letters)',
        'mitteilungen.audience.members.none': 'No matches.',
        'mitteilungen.audience.members.added': 'Added',
        'mitteilungen.audience.guardians': 'Include guardians',
        'mitteilungen.audience.guardians.hint': 'Guardians of addressed children receive the announcement as well.',

        'mitteilungen.channels.inapp': 'Always included: the club notice board in the app and on the website. In addition:',
        'mitteilungen.channel.email': 'E-mail',
        'mitteilungen.channel.push': 'Push (app)',
        'mitteilungen.channel.in_app': 'Notice board',

        'mitteilungen.option.urgent': 'Urgent',
        'mitteilungen.option.urgent.hint': 'Highlighted for readers. Use only for what really matters; the number per day is limited.',
        'mitteilungen.option.pinned': 'Pin to top',
        'mitteilungen.option.pinned.hint': 'Stays at the top of the notice board.',
        'mitteilungen.option.expires': 'Expiry date (optional)',
        'mitteilungen.option.expires.hint': 'After that the announcement disappears from the notice board.',
        'mitteilungen.option.schedule': 'Schedule for later',
        'mitteilungen.option.schedule.at': 'Send at',

        'mitteilungen.preview.title': 'Who is reached?',
        'mitteilungen.preview.idle': 'Choose an audience and you will see here how many people the announcement reaches.',
        'mitteilungen.preview.error': 'The count is not available right now. You can still save.',
        'mitteilungen.preview.reach': 'Reaches {{reachable}} of {{total}} people',
        'mitteilungen.preview.emailOnly': '{{count}} of them by e-mail only',
        'mitteilungen.preview.push': '{{count}} by push',
        'mitteilungen.preview.unreachable': '{{count}} not reachable (no e-mail address or unsubscribed)',
        'mitteilungen.preview.shared': '{{count}} share an e-mail address (e.g. a family)',

        'mitteilungen.action.send': 'Send now',
        'mitteilungen.action.schedule': 'Schedule',
        'mitteilungen.action.sending': 'Sending …',
        'mitteilungen.action.draft': 'Save as draft',
        'mitteilungen.send.hint': 'Once sent, an announcement can no longer be edited, only withdrawn.',

        'mitteilungen.confirm.title': 'Really send to many people?',
        'mitteilungen.confirm.body': 'This announcement goes to {{count}} people. This cannot be undone.',
        'mitteilungen.confirm.body.schedule': 'This announcement will be sent to {{count}} people at the chosen time.',
        'mitteilungen.confirm.send': 'Send to {{count}}',
        'mitteilungen.confirm.schedule': 'Schedule for {{count}}',

        'mitteilungen.problem.title': 'Please enter a title.',
        'mitteilungen.problem.body': 'Please write a text.',
        'mitteilungen.problem.audience': 'Please choose who should get the announcement.',
        'mitteilungen.problem.publishAt': 'The send time must be in the future.',
        'mitteilungen.problem.expiresAt': 'The expiry date must be after the send time.',

        'mitteilungen.err.tooMany': 'You have sent too many announcements just now. Please try again later.',
        'mitteilungen.err.rule.announcement.max_recipients': 'This announcement has too many recipients. Please split it into smaller groups.',
        'mitteilungen.err.rule.announcement.club_day': 'The club has reached today\'s limit for announcements. Please try again tomorrow.',
        'mitteilungen.err.rule.announcement.author_hour': 'You have already sent many announcements in the last hour. Please wait a bit.',
        'mitteilungen.err.rule.announcement.urgent_day': 'The daily limit for urgent announcements is reached. Send this one without "Urgent" or tomorrow.',
        'mitteilungen.err.rule.announcement.duplicate': 'This exact announcement was just sent to the same audience.',
        'mitteilungen.err.confirmationRequired': 'Please confirm the number of recipients and send again.',
        'mitteilungen.err.conflict': 'This announcement cannot be changed in its current state. Please reload the page.',
        'mitteilungen.err.audienceTooLarge': 'The audience is too large. Please choose smaller groups.',
        // -- next:en
    },
};

export default CommunicationTranslation;
