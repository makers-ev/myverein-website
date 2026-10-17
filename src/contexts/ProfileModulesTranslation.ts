// DE/EN only, same pattern as CustomFieldsTranslation.ts: spread only for de/en in LanguageContext.tsx, every other language
// falls back to English via t()'s own per-key fallback. Texts of the profile modules ("Profil-Bausteine"): the credential
// field type (qualification with validity), the module catalog of the board and the credential overview "Qualifikationen".
type Translation = {
    de: Record<string, string>;
    en: Record<string, string>;
};

const ProfileModulesTranslation: Translation = {
    de: {
        // --- credential value (renderer, member views) ---
        'forms.cred.have': 'Habe ich',
        'forms.cred.level': 'Stufe',
        'forms.cred.obtainedOn': 'Erworben / vorgelegt am',
        'forms.cred.validUntil': 'Gültig bis',
        'forms.cred.status': 'Status:',
        'forms.cred.err.order': '„Gültig bis“ darf nicht vor „Erworben / vorgelegt am“ liegen.',
        'forms.cred.summary.level': 'Stufe: {{level}}',
        'forms.cred.summary.obtained': 'erworben am {{date}}',
        'forms.cred.summary.until': 'gültig bis {{date}}',
        'forms.cred.expiry.missing': 'Nicht eingetragen',
        'forms.cred.expiry.expired': 'Abgelaufen seit {{days}} Tagen',
        'forms.cred.expiry.expiredOne': 'Abgelaufen seit 1 Tag',
        'forms.cred.expiry.today': 'Läuft heute ab',
        'forms.cred.expiry.tomorrow': 'Läuft morgen ab',
        'forms.cred.expiry.expiring': 'Läuft ab in {{days}} Tagen',
        'forms.cred.expiry.validUntil': 'Gültig bis {{date}}',
        'forms.cred.expiry.noExpiry': 'Ohne Ablaufdatum',
        // --- custom field definitions: credential type, help text, error codes ---
        'forms.editor.type.credential': 'Qualifikation mit Gültigkeit',
        'forms.cf.helpText': 'Hilfetext (optional)',
        'forms.cf.helpText.hint': 'Wird beim Ausfüllen unter der Bezeichnung angezeigt, z. B. wofür die Angabe gebraucht wird. Nur Text, höchstens 500 Zeichen.',
        'forms.cf.credential.hint': 'Mitglieder kreuzen „Habe ich“ an und tragen auf Wunsch Stufe, Erwerbsdatum und „Gültig bis“ ein. Vorstand und Funktionsträger sehen, ob die Qualifikation abgelaufen ist oder bald abläuft. Es gibt keine Erinnerungen, das folgt mit den Benachrichtigungen.',
        'forms.cf.levels': 'Stufen (optional)',
        'forms.cf.levels.hint': 'Ohne Stufen gibt es nur „Habe ich“ und die Daten. Mit Stufen wählen die Mitglieder eine davon, z. B. C, B, A.',
        'forms.cf.levels.freeText': 'Die Stufe ist hier ein Freitext (höchstens {{max}} Zeichen) und kann nicht in eine Auswahl umgewandelt werden.',
        'forms.cf.problem.help_text': 'Der Hilfetext darf höchstens 500 Zeichen lang sein und keine unzulässigen Zeichen enthalten.',
        'forms.cf.err.neverMandatory': 'Führerschein-, Qualifikations- und Kinderschutz-Bausteine können nie Pflicht sein.',
        'forms.cf.err.credentialNotSupported': 'Qualifikationen mit Gültigkeit gibt es nur als Zusatzfeld, nicht in Formularen.',
        'forms.editor.problem.credential_not_supported': 'Qualifikationen mit Gültigkeit gibt es nur als Zusatzfeld, nicht in Formularen. Entferne das Feld aus dem Formular.',
        'forms.editor.problem.module_never_mandatory': 'Führerschein-, Qualifikations- und Kinderschutz-Bausteine können nie Pflicht sein. Mache das Feld freiwillig.',
    },
    en: {
        // --- credential value (renderer, member views) ---
        'forms.cred.have': 'I have this',
        'forms.cred.level': 'Level',
        'forms.cred.obtainedOn': 'Obtained / presented on',
        'forms.cred.validUntil': 'Valid until',
        'forms.cred.status': 'Status:',
        'forms.cred.err.order': '“Valid until” must not be before “Obtained / presented on”.',
        'forms.cred.summary.level': 'Level: {{level}}',
        'forms.cred.summary.obtained': 'obtained on {{date}}',
        'forms.cred.summary.until': 'valid until {{date}}',
        'forms.cred.expiry.missing': 'Not recorded',
        'forms.cred.expiry.expired': 'Expired {{days}} days ago',
        'forms.cred.expiry.expiredOne': 'Expired 1 day ago',
        'forms.cred.expiry.today': 'Expires today',
        'forms.cred.expiry.tomorrow': 'Expires tomorrow',
        'forms.cred.expiry.expiring': 'Expires in {{days}} days',
        'forms.cred.expiry.validUntil': 'Valid until {{date}}',
        'forms.cred.expiry.noExpiry': 'No expiry date',
        // --- custom field definitions: credential type, help text, error codes ---
        'forms.editor.type.credential': 'Qualification with validity',
        'forms.cf.helpText': 'Help text (optional)',
        'forms.cf.helpText.hint': 'Shown below the label when filling in, e.g. what the detail is needed for. Plain text, at most 500 characters.',
        'forms.cf.credential.hint': 'Members tick “I have this” and can add a level, the date obtained and “Valid until”. The board and officials see whether the qualification has expired or is about to. There are no reminders; they follow with notifications.',
        'forms.cf.levels': 'Levels (optional)',
        'forms.cf.levels.hint': 'Without levels there is only “I have this” and the dates. With levels members pick one of them, e.g. C, B, A.',
        'forms.cf.levels.freeText': 'The level is free text here (at most {{max}} characters) and cannot be turned into a choice.',
        'forms.cf.problem.help_text': 'The help text can have at most 500 characters and must not contain characters that are not allowed.',
        'forms.cf.err.neverMandatory': 'Driving licence, qualification and child protection modules can never be mandatory.',
        'forms.cf.err.credentialNotSupported': 'Qualifications with validity only exist as custom fields, not in forms.',
        'forms.editor.problem.credential_not_supported': 'Qualifications with validity only exist as custom fields, not in forms. Remove the field from the form.',
        'forms.editor.problem.module_never_mandatory': 'Driving licence, qualification and child protection modules can never be mandatory. Make the field optional.',
    },
};

export default ProfileModulesTranslation;
