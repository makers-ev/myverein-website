type Translation = {
    de: Record<string, string>;
    en: Record<string, string>;
};

// Legal copy modelled on what {{appName}} actually does (see the data-protection sections of the backend README).
// Items in [square brackets] are placeholders for facts that are not evidenced in the repos or the vault
// (operator address, register data, hosting/mail providers, third-country transfers, supervisory authority, governing law).
// `{{appName}}` is filled in from project.config.json at render time (LanguageContext.tsx `t()`). Keep section counts in sync with
// the `sectionCount` props in privacy/terms/imprint page.tsx and bump the `*.updated` stamps whenever the text changes.
const LegalTranslation: Translation = {
    de: {
        'legal.privacy.title': 'Datenschutzerklärung',
        'legal.privacy.updated': 'Stand: November 2026',
        'legal.privacy.section1.title': '1. Wer verantwortlich ist und in welchen Rollen',
        'legal.privacy.section1.text':
            'Für Konto- und Website-Daten (Registrierung, Login, Sicherheit, Besuch dieser Website) ist der im Impressum genannte Betreiber Luca-Pascal Junge Verantwortlicher im Sinne der DSGVO. Datenschutzkontakt: lucapascal.junge@gmail.com.\n\nFür die Daten der Vereinsmitglieder und alles, was ein Verein in {{appName}} erfasst, ist der jeweilige Verein Verantwortlicher. Der Betreiber (Luca-Pascal Junge) verarbeitet diese Daten als Auftragsverarbeiter nach Art. 28 DSGVO auf Grundlage eines Auftragsverarbeitungsvertrags (AV-Vertrag), den die Inhaberin bzw. der Inhaber des Vereins online mit dem Betreiber abschließt. Anfragen zu Mitgliederdaten richtest du deshalb zuerst an deinen Verein (Datenschutzhinweis und Datenschutzkontakt des Vereins).',
        'legal.privacy.section2.title': '2. Besuch der Website, Cookies und lokaler Speicher',
        'legal.privacy.section2.text':
            'Beim Aufruf der Seiten fallen technisch bedingt Verbindungsdaten an (u. a. IP-Adresse, Zeitpunkt, aufgerufene Adresse) [Hoster und Dauer der Server-Protokolle]. Tracking, Werbe- oder Profiling-Cookies setzt {{appName}} nicht ein.\n\nTechnisch notwendig: das Sitzungs-Cookie des Logins (wird vom Anmeldedienst gesetzt, nur nach dem Login), das Sprach-Cookie "app_lang" und lokal im Browser gespeicherte Einstellungen: Cookie-Auswahl, Farbpalette bzw. Design, eingeklappte Seitenleiste, gewählte Spalten der Mitgliederliste, zuletzt aktiver Verein und ob die Einführung gesehen wurde. Diese Werte verlassen deinen Browser nicht.\n\nDas Cookie-Banner enthält eine Kategorie "Analytics" (Google Analytics), die nur nach deiner Zustimmung wirken würde. Derzeit ist kein Analyse-Dienst eingebunden. Die Texte unter docs.myverein.de (Hilfeportal) setzen keine Cookies und nutzen kein Tracking.',
        'legal.privacy.section3.title': '3. Konto-Daten und Zwecke',
        'legal.privacy.section3.text':
            'Name, E-Mail-Adresse, gehashtes Passwort (nie im Klartext), optional ein Geheimnis für die Zwei-Faktor-Anmeldung, Sitzungen mit IP-Adresse und Gerätekennung sowie E-Mails zu Bestätigung, Passwort-Zurücksetzen und Sicherheitshinweisen. Zweck ist die Bereitstellung des Kontos und seine Absicherung (Login, Zwei-Faktor, Rate-Limiting, Missbrauchsschutz). Rechtsgrundlagen: Vertrag bzw. Nutzungsverhältnis (Art. 6 Abs. 1 lit. b DSGVO) und berechtigtes Interesse an Sicherheit und Missbrauchsschutz (lit. f). Es gibt keine Werbung, und Daten werden nicht verkauft.',
        'legal.privacy.section4.title': '4. Daten, die Vereine in MyVerein verarbeiten',
        'legal.privacy.section4.text':
            'Im Auftrag des jeweiligen Vereins werden je nach genutzter Funktion verarbeitet: Mitglieder-Stammdaten (auch von Mitgliedern ohne Konto, mit Anschrift, Kontakt, Geburtsdatum, Notfallkontakt, Kategorie, Status, Abteilungen; Profilfoto nur mit Einwilligung), Verknüpfungen zwischen Erziehungsberechtigten und Kindern, Termine, Zu- und Absagen, Anwesenheitslisten (auch Gäste mit Name und E-Mail-Adresse), Helferschichten, Fahrgemeinschaften, Abwesenheitsmeldungen (ohne Diagnosen), Mitteilungen samt Zustell- und Lesestatus, Dokumente und erzeugte PDF, Mitgliedsausweis (QR-Code ohne Personenbezug im Code), Zeiterfassung und Stundensätze, Abstimmungen, Wahlen und Protokolle (geheime Stimmen ohne Personenbezug), Einwilligungen und deren Nachweise, Datenschutzanfragen sowie Zugriffs- und Änderungsprotokolle. Die Rechtsgrundlage bestimmt der Verein (z. B. Mitgliedschaft, Einwilligung, rechtliche Pflicht, berechtigtes Interesse); sie steht in seinem Datenschutzhinweis. Einwilligungen sind freiwillig und können jederzeit widerrufen werden.',
        'legal.privacy.section5.title': '5. Empfänger und Auftragsverarbeiter',
        'legal.privacy.section5.text':
            'Innerhalb eines Vereins sehen Personen nur, was ihre Rolle und ihre Rechte erlauben; ohne ausdrückliche Freigabe ist nichts sichtbar. Der Betreiber setzt folgende technische Dienstleister ein, soweit sie im jeweiligen Betrieb aktiv sind: E-Mail-Versand über einen konfigurierten Dienst (vorgesehen sind Resend oder ein eigener SMTP-Server) [Anbieter], Push-Nachrichten über den Expo-Push-Dienst (die Nachricht enthält keine Personendaten, nur eine allgemeine Meldung), Hosting und Datenbank [Anbieter und Standort]. Die vollständige Liste der Unterauftragnehmer steht im AV-Vertrag.',
        'legal.privacy.section6.title': '6. Übermittlung in Drittländer',
        'legal.privacy.section6.text':
            'Ob und in welche Drittländer Daten übermittelt werden (z. B. durch den Sitz oder die Rechenzentren der in Abschnitt 5 genannten Dienstleister) und auf welcher Garantie dies beruht, ist: [Angaben zu Drittlandübermittlung und Garantie (Angemessenheitsbeschluss, Standardvertragsklauseln)].',
        'legal.privacy.section7.title': '7. Speicherdauer',
        'legal.privacy.section7.text':
            'Konto-Daten bleiben, solange das Konto besteht. Vereinsdaten bleiben, solange der Verein sie braucht. Für viele Kategorien sind Löschfristen als Vorschlag hinterlegt, die ein Verein innerhalb von Grenzen anpassen kann. Standardwerte: ehemalige Mitglieder werden 730 Tage nach dem Austritt anonymisiert, Interessierte ohne Beitritt nach 365 Tagen, Notfallkontakte ausgetretener Mitglieder nach 30 Tagen, abgelehnte Aufnahmeanträge Erwachsener nach 180 Tagen, Abwesenheitsmeldungen 90 Tage nach Ende, Einwilligungsnachweise und Anwesenheitslisten nach 1095 Tagen, Gäste-Anmeldungen 90 Tage nach der Veranstaltung (unbestätigte nach 48 Stunden), Zustellprotokolle von E-Mails nach 90 Tagen, Sicherheits-Anmeldeprotokolle nach 180 und sonstige Protokolle nach 730 Tagen. Protokolle und Beschlüsse von Versammlungen werden nicht automatisch gelöscht; für Dokumente gelten Aufbewahrungsklassen je Dokumenttyp, für Zeiteinträge gesetzliche Aufbewahrung. Die automatische Löschung läuft standardmäßig zunächst als Trockenlauf (es wird nur gezählt) und wird erst nach rechtlicher Prüfung der Fristen scharf geschaltet.',
        'legal.privacy.section8.title': '8. Deine Rechte',
        'legal.privacy.section8.text':
            'Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch sowie auf Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft. In {{appName}} kannst du Daten selbst berichtigen ("Mein Profil"), eine Datenauskunft als Export abrufen (auch für dein Kind) und Einwilligungen widerrufen. Dein Konto löschst du in den Einstellungen; Löschung und Anonymisierung laufen über einen geprüften Löschprozess und werden zum Beispiel durch eine Rechtssperre, eine offene Ausleihe, eine Vorstandsrolle oder als einzige:r Inhaber:in eines Vereins blockiert. Anfragen zu Vereinsdaten bearbeitet der Verein mit Fristanzeige; Anfragen zum Konto richtest du an den Datenschutzkontakt aus Abschnitt 1. Du kannst dich außerdem bei einer Datenschutzaufsichtsbehörde beschweren [zuständige Aufsichtsbehörde].',
        'legal.privacy.section9.title': '9. Kinder und Jugendliche',
        'legal.privacy.section9.text':
            'Einwilligungen von Minderjährigen geben die Erziehungsberechtigten oder der Vorstand mit Papier-Nachweis ab. Die Altersgrenze legt der Verein fest (Standardwert: 18 Jahre). Erziehungsberechtigte sehen nur Daten ihres verknüpften Kindes; die Verknüpfung bestätigt der Vorstand und sie endet mit dem 18. Geburtstag. Profilfotos von Minderjährigen unterliegen strengeren Regeln.',
        'legal.privacy.section10.title': '10. Datensicherheit',
        'legal.privacy.section10.text':
            'Umgesetzt sind unter anderem verschlüsselte Verbindungen, gehashte Passwörter, optionale Zwei-Faktor-Anmeldung, ein Rechtemodell, das standardmäßig nichts freigibt, die Trennung der Vereine voneinander, kurzlebige signierte Links für Bilder und Dateien, ein Zugriffsprotokoll für sensible Dokumente, Entfernen von Standortdaten aus Bildern, Begrenzung von Anfragen sowie Protokolle ohne Personendaten. Vollständige Sicherheit und unterbrechungsfreie Verfügbarkeit kann kein Dienst garantieren.',
        'legal.privacy.section11.title': '11. Änderungen',
        'legal.privacy.section11.text':
            'Diese Erklärung wird angepasst, wenn sich der Dienst oder die Rechtslage ändert. Das Datum oben nennt den aktuellen Stand. {{appName}} befindet sich in einer Testphase: Der Funktionsumfang kann sich ändern, und Daten können zurückgesetzt oder gelöscht werden; darüber wird vorab informiert. Der Betreiber kann den Betrieb auf ein Unternehmen übertragen; Nutzer werden informiert.',

        'legal.imprint.title': 'Impressum',
        'legal.imprint.updated': 'Stand: November 2026',
        'legal.imprint.section1.title': '1. Angaben gemäß § 5 DDG',
        'legal.imprint.section1.text':
            'Luca-Pascal Junge\nSiedlung 15\n63571 Gelnhausen',
        'legal.imprint.section2.title': '2. Kontakt',
        'legal.imprint.section2.text':
            'E-Mail: lucapascal.junge@gmail.com',
        'legal.imprint.section3.title': '3. Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV',
        'legal.imprint.section3.text':
            'Luca-Pascal Junge, Siedlung 15, 63571 Gelnhausen.',
        'legal.imprint.section4.title': '4. Hinweis',
        'legal.imprint.section4.text':
            '{{appName}} wird betrieben von Luca-Pascal Junge.',

        'legal.tos.title': 'Nutzungsbedingungen',
        'legal.tos.updated': 'Stand: November 2026',
        'legal.tos.section1.title': '1. Geltungsbereich',
        'legal.tos.section1.text':
            'Diese Bedingungen regeln die Nutzung von {{appName}} (der "Dienst"), betrieben von dem im Impressum genannten Betreiber, Luca-Pascal Junge. Mit der Erstellung eines Kontos stimmst du diesen Bedingungen und der Datenschutzerklärung zu. Für Vereine gilt zusätzlich der Auftragsverarbeitungsvertrag (AV-Vertrag), den die Inhaberin bzw. der Inhaber des Vereins im Dienst mit dem Betreiber abschließt.',
        'legal.tos.section2.title': '2. Was {{appName}} ist',
        'legal.tos.section2.text':
            '{{appName}} ist eine Plattform für Vereine mit Website und App: Mitglieder, Termine und Anwesenheit, Mitteilungen, Abstimmungen und Versammlungen, Dokumente, Material und Orte, Zeiterfassung. Die Abrechnung von Beiträgen (Beitragseinzug, Mahnwesen, Kassenbuch, Spendenquittungen) ist nicht Teil des Dienstes. Der Stundenbericht ist eine Berechnungsgrundlage, keine Abrechnung und keine Auszahlung. Entgelte und Tarife werden gesondert vereinbart oder angekündigt.',
        'legal.tos.section3.title': '3. Konto und Rollen',
        'legal.tos.section3.text':
            'Für die meisten Funktionen brauchst du ein Konto. Du bist für die Vertraulichkeit deiner Zugangsdaten und für alles verantwortlich, was unter deinem Konto passiert; aktiviere bei Bedarf die Zwei-Faktor-Anmeldung. Was du im Verein sehen und tun darfst, bestimmen die Rollen und Rechte, die dein Verein vergibt. Melde einen vermuteten unbefugten Zugriff sofort.',
        'legal.tos.section4.title': '4. Verfügbarkeit und Wartung',
        'legal.tos.section4.text':
            'Der Betreiber bemüht sich um einen zuverlässigen Betrieb, garantiert aber keine unterbrechungsfreie Verfügbarkeit. Der Dienst kann für Wartung vorübergehend eingeschränkt, geändert oder eingestellt werden. {{appName}} befindet sich in einer Test- bzw. Pilotphase: Der Funktionsumfang kann sich ändern, und Daten können zurückgesetzt oder gelöscht werden; darüber informiert der Betreiber vorab.',
        'legal.tos.section5.title': '5. Inhalte und Nutzungsrechte',
        'legal.tos.section5.text':
            'Deine Inhalte und die Daten deines Vereins bleiben bei dir bzw. beim Verein. Du räumst dem Betreiber nur die Rechte ein, die er braucht, um sie zu speichern, anzuzeigen, zu übertragen und zu sichern. Du bist dafür verantwortlich, dass Inhalte keine Gesetze oder Rechte Dritter verletzen.',
        'legal.tos.section6.title': '6. Verantwortung des Vereins',
        'legal.tos.section6.text':
            'Der Verein entscheidet, welche Daten er erfasst, wer sie sieht und wie lange sie bleiben, und ist dafür datenschutzrechtlich verantwortlich. Er sorgt für eine Rechtsgrundlage, für Einwilligungen, wo sie nötig sind, und für die Einhaltung von Satzung und Gesetzen, etwa bei Einladungsfristen, Beschlüssen und Wahlen. Vorlagen und voreingestellte Fristen im Dienst sind Vorschläge und keine Rechtsberatung.',
        'legal.tos.section7.title': '7. Zulässige Nutzung',
        'legal.tos.section7.text':
            'Nicht gestattet sind rechtswidrige Inhalte, das Ausspähen oder Verändern von Daten anderer, das Umgehen von Sicherheits- oder Schutzmechanismen, übermäßige automatisierte Zugriffe sowie das Dekompilieren oder Zurückentwickeln der App und die Weitergabe so erlangten Quellcodes. Verstöße können zur Sperrung des Kontos führen.',
        'legal.tos.section8.title': '8. Beendigung und Datenexport',
        'legal.tos.section8.text':
            'Du kannst dein Konto jederzeit in den Einstellungen löschen. Ein Verein kann seine Mitglieder-, Anwesenheits- und weiteren Daten über die Export-Funktionen (z. B. CSV, Datenauskunft, Dokumente) sichern; vor einer Beendigung sollte er das tun. Der Betreiber kann Konten sperren oder beenden, die gegen diese Bedingungen verstoßen oder ein Sicherheitsrisiko darstellen.',
        'legal.tos.section9.title': '9. Haftung',
        'legal.tos.section9.text':
            'Der Dienst wird "wie besehen" bereitgestellt. Soweit gesetzlich zulässig, haftet der Betreiber nicht für mittelbare Schäden oder Datenverlust, außer bei Vorsatz oder grober Fahrlässigkeit; zwingende gesetzliche Haftung bleibt unberührt.',
        'legal.tos.section10.title': '10. Änderungen',
        'legal.tos.section10.text':
            'Der Betreiber kann diese Bedingungen bei Weiterentwicklung des Dienstes anpassen und informiert über wesentliche Änderungen. Die fortgesetzte Nutzung nach einer Aktualisierung gilt als Zustimmung. Der Betreiber kann den Betrieb auf ein Unternehmen übertragen; Nutzer werden informiert.',
        'legal.tos.section11.title': '11. Anwendbares Recht und Gerichtsstand',
        'legal.tos.section11.text':
            'Es gilt deutsches Recht. Gerichtsstand: [Gerichtsstand].',
    },
    en: {
        'legal.privacy.title': 'Privacy Policy',
        'legal.privacy.updated': 'Last updated: November 2026',
        'legal.privacy.section1.title': '1. Who is responsible and in which role',
        'legal.privacy.section1.text':
            'For account and website data (registration, login, security, visits to this website) the operator named in the Imprint, Luca-Pascal Junge, is the controller under GDPR. Privacy contact: lucapascal.junge@gmail.com.\n\nFor the data of club members and everything a club records in {{appName}}, the respective club is the controller. The operator (Luca-Pascal Junge) processes this data as a processor under Art. 28 GDPR on the basis of a data processing agreement (DPA) that the club\'s owner concludes online with the operator. Requests about member data should therefore go to your club first (the club\'s privacy notice and privacy contact).',
        'legal.privacy.section2.title': '2. Visiting the website, cookies and local storage',
        'legal.privacy.section2.text':
            'Visiting the pages produces technical connection data (including IP address, time, requested address) [host and duration of server logs]. {{appName}} does not set tracking, advertising or profiling cookies.\n\nTechnically necessary: the login session cookie (set by the sign-in service, only after login), the language cookie "app_lang" and settings stored locally in your browser: cookie choice, colour palette or theme, collapsed sidebar, chosen member list columns, last active club and whether the introduction has been seen. These values do not leave your browser.\n\nThe cookie banner contains an "Analytics" category (Google Analytics) that would only take effect with your consent. No analytics service is currently connected. The help portal at docs.myverein.de sets no cookies and uses no tracking.',
        'legal.privacy.section3.title': '3. Account data and purposes',
        'legal.privacy.section3.text':
            'Name, email address, hashed password (never in plain text), optionally a two-factor secret, sessions with IP address and device identifier, and emails for verification, password reset and security notices. The purpose is to provide and protect your account (login, two-factor, rate limiting, abuse prevention). Legal bases: contract or user relationship (Art. 6(1)(b) GDPR) and legitimate interest in security and abuse prevention (point (f)). There is no advertising and data is not sold.',
        'legal.privacy.section4.title': '4. Data that clubs process in MyVerein',
        'legal.privacy.section4.text':
            'On behalf of the respective club, depending on the features used: member master data (also of members without an account, with address, contact, birth date, emergency contact, category, status, departments; profile photo only with consent), links between guardians and children, events, RSVPs, attendance lists (also guests with name and email), helper shifts, carpools, absence reports (no diagnoses), announcements with delivery and read status, documents and generated PDFs, membership card (QR code with no personal data in the code), time tracking and hourly rates, votes, elections and minutes (secret ballots without personal reference), consents and their proofs, data requests, and access and change logs. The club determines the legal basis (e.g. membership, consent, legal obligation, legitimate interest); it is stated in its privacy notice. Consent is voluntary and can be withdrawn at any time.',
        'legal.privacy.section5.title': '5. Recipients and processors',
        'legal.privacy.section5.text':
            'Within a club people only see what their role and rights allow; nothing is visible without explicit permission. The operator uses the following technical providers where they are active in the respective deployment: email delivery through a configured service (Resend or an own SMTP server are supported) [provider], push notifications through the Expo push service (the message carries no personal data, only a generic notice), hosting and database [provider and location]. The full list of sub-processors is in the DPA.',
        'legal.privacy.section6.title': '6. Transfers to third countries',
        'legal.privacy.section6.text':
            'Whether data is transferred to third countries (e.g. through the seat or data centres of the providers named in section 5) and on which safeguard this rests: [details on third-country transfers and safeguard (adequacy decision, standard contractual clauses)].',
        'legal.privacy.section7.title': '7. Retention',
        'legal.privacy.section7.text':
            'Account data is kept as long as the account exists. Club data is kept as long as the club needs it. For many categories, deletion periods are stored as suggestions, which a club can adjust within limits. Defaults: former members are anonymised 730 days after leaving, interested people without joining after 365 days, emergency contacts of departed members after 30 days, rejected applications of adults after 180 days, absence reports 90 days after the end, consent proofs and attendance lists after 1095 days, guest registrations 90 days after the event (unconfirmed ones after 48 hours), email delivery logs after 90 days, sign-in security logs after 180 and other logs after 730 days. Minutes and resolutions of assemblies are not deleted automatically; documents follow retention classes per document type, and time entries follow statutory retention. Automatic deletion runs as a dry run by default (it only counts) and is switched on only after the periods have been legally reviewed.',
        'legal.privacy.section8.title': '8. Your rights',
        'legal.privacy.section8.text':
            'You have the right of access, rectification, erasure, restriction, data portability and objection, and the right to withdraw consent with effect for the future. In {{appName}} you can correct data yourself ("My profile"), retrieve a data export (also for your child) and withdraw consent. You delete your account in Settings; erasure and anonymisation run through a checked process and are blocked, for example, by a legal hold, an open loan, a board role, or being the only owner of a club. Requests about club data are handled by the club with a deadline indicator; requests about your account go to the privacy contact in section 1. You can also lodge a complaint with a data protection authority [competent authority].',
        'legal.privacy.section9.title': '9. Children and young people',
        'legal.privacy.section9.text':
            'Consent of minors is given by their guardians or by the board with paper proof. The club sets the age limit (default: 18 years). Guardians only see data of their linked child; the board confirms the link, and it ends on the 18th birthday. Profile photos of minors are subject to stricter rules.',
        'legal.privacy.section10.title': '10. Data security',
        'legal.privacy.section10.text':
            'Implemented measures include encrypted connections, hashed passwords, optional two-factor sign-in, a rights model that grants nothing by default, separation of clubs from each other, short-lived signed links for images and files, an access log for sensitive documents, removal of location data from images, request rate limiting and logs without personal data. No service can guarantee complete security or uninterrupted availability.',
        'legal.privacy.section11.title': '11. Changes',
        'legal.privacy.section11.text':
            'This policy is updated when the service or the legal situation changes. The date above states the current version. {{appName}} is in a test phase: features may change and data may be reset or deleted; you will be told in advance. The operator may transfer operation to a company; users will be informed.',

        'legal.imprint.title': 'Imprint',
        'legal.imprint.updated': 'Last updated: November 2026',
        'legal.imprint.section1.title': '1. Information pursuant to § 5 DDG',
        'legal.imprint.section1.text':
            'Luca-Pascal Junge\nSiedlung 15\n63571 Gelnhausen, Germany',
        'legal.imprint.section2.title': '2. Contact',
        'legal.imprint.section2.text':
            'Email: lucapascal.junge@gmail.com',
        'legal.imprint.section3.title': '3. Person responsible for content under § 18(2) MStV',
        'legal.imprint.section3.text':
            'Luca-Pascal Junge, Siedlung 15, 63571 Gelnhausen, Germany.',
        'legal.imprint.section4.title': '4. Note',
        'legal.imprint.section4.text':
            '{{appName}} is operated by Luca-Pascal Junge.',

        'legal.tos.title': 'Terms of Service',
        'legal.tos.updated': 'Last updated: November 2026',
        'legal.tos.section1.title': '1. Scope',
        'legal.tos.section1.text':
            'These terms govern your use of {{appName}} (the "Service"), operated by the operator named in the Imprint, Luca-Pascal Junge. By creating an account you agree to these terms and to the Privacy Policy. For clubs, the data processing agreement (DPA) that the club\'s owner concludes with the operator in the Service applies in addition.',
        'legal.tos.section2.title': '2. What {{appName}} is',
        'legal.tos.section2.text':
            '{{appName}} is a platform for clubs with a website and an app: members, events and attendance, announcements, votes and assemblies, documents, equipment and places, time tracking. Billing of dues (collection, dunning, cash book, donation receipts) is not part of the Service. The hours report is a basis for calculation, not billing and not a payout. Fees and plans are agreed or announced separately.',
        'legal.tos.section3.title': '3. Account and roles',
        'legal.tos.section3.text':
            'You need an account for most features. You are responsible for keeping your credentials confidential and for everything that happens under your account; enable two-factor sign-in if you want extra protection. What you may see and do in a club is determined by the roles and rights your club grants. Report suspected unauthorised access immediately.',
        'legal.tos.section4.title': '4. Availability and maintenance',
        'legal.tos.section4.text':
            'The operator aims to run the Service reliably but does not guarantee uninterrupted availability. The Service may be temporarily restricted, changed or discontinued for maintenance. {{appName}} is in a test and pilot phase: the scope of features may change and data may be reset or deleted; the operator will tell you in advance.',
        'legal.tos.section5.title': '5. Content and usage rights',
        'legal.tos.section5.text':
            'Your content and your club\'s data remain with you or the club. You grant the operator only the rights it needs to store, display, transmit and back it up. You are responsible for making sure content does not violate the law or the rights of others.',
        'legal.tos.section6.title': '6. Responsibility of the club',
        'legal.tos.section6.text':
            'The club decides which data it records, who sees it and how long it stays, and is responsible for it under data protection law. It makes sure there is a legal basis, consent where needed, and compliance with its statutes and the law, for example for invitation deadlines, resolutions and elections. Templates and preset periods in the Service are suggestions, not legal advice.',
        'legal.tos.section7.title': '7. Acceptable use',
        'legal.tos.section7.text':
            'Not permitted are unlawful content, spying on or altering other people\'s data, circumventing security or protection mechanisms, excessive automated access, and decompiling or reverse-engineering the app and passing on source code obtained that way. Violations can lead to suspension of the account.',
        'legal.tos.section8.title': '8. Ending and data export',
        'legal.tos.section8.text':
            'You can delete your account at any time in Settings. A club can back up its member, attendance and other data with the export functions (e.g. CSV, data export, documents) and should do so before ending. The operator may suspend or terminate accounts that violate these terms or pose a security risk.',
        'legal.tos.section9.title': '9. Liability',
        'legal.tos.section9.text':
            'The Service is provided "as is". To the extent permitted by law, the operator is not liable for indirect damages or lost data, except in cases of intent or gross negligence; mandatory statutory liability remains unaffected.',
        'legal.tos.section10.title': '10. Changes',
        'legal.tos.section10.text':
            'The operator may update these terms as the Service evolves and will inform about material changes. Continued use after an update means you accept the revised terms. The operator may transfer operation to a company; users will be informed.',
        'legal.tos.section11.title': '11. Governing law and venue',
        'legal.tos.section11.text':
            'German law applies. Place of jurisdiction: [place of jurisdiction].',
    },
};

export default LegalTranslation;
