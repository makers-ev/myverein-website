// DE/EN only for now (documented gap, see Wave 1 Implementation Plan --
// fr/es/pt/it/nl/pl/ru/ja/zh-Hans pending a real translation pass), same
// pattern as LegalTranslation.ts: spread only for de/en in
// LanguageContext.tsx, every other language falls back to English via t()'s
// own per-key fallback.
type Translation = {
    de: Record<string, string>;
    en: Record<string, string>;
};

const VereinTranslation: Translation = {
    de: {
        'nav.verein': 'Verein',
        'verein.page.title': 'Verein',
        'verein.no-club.title': 'Noch kein Verein',
        'verein.no-club.body': 'Du bist noch in keinem Verein Mitglied. Wende dich an deinen Vorstand, um beizutreten.',
        'verein.tab.info': 'Vereinsinfo',
        'verein.tab.mitglieder': 'Mitglieder',
        'verein.tab.abteilungen': 'Abteilungen',
        'verein.info.board': 'Vorstand',
        'verein.info.board.empty': 'Noch keine Vorstandsrollen vergeben.',
        'verein.info.pages': 'Dokumente',
        'verein.info.pages.empty': 'Noch keine Vereinsdokumente hinterlegt.',
        'verein.members.empty': 'Keine Mitglieder gefunden.',
        'verein.members.table.name': 'Name',
        'verein.members.table.category': 'Kategorie',
        'verein.members.table.roles': 'Rollen',
        'verein.members.table.joined': 'Mitglied seit',
        'verein.departments.empty': 'Noch keine Abteilungen angelegt.',
        'verein.departments.new.placeholder': 'Neue Abteilung, z. B. "Fußball"',
        'verein.departments.new.submit': 'Anlegen',
        'verein.role.vorsitz': 'Vorsitz',
        'verein.role.stellv_vorsitz': 'Stellv. Vorsitz',
        'verein.role.kassenwart': 'Kassenwart:in',
        'verein.role.schriftfuehrer': 'Schriftführer:in',
        'verein.role.beisitzer': 'Beisitzer:in',
        'verein.role.abteilungsleitung': 'Abteilungsleitung',
        'verein.role.trainer': 'Trainer:in',
        'verein.role.erziehungsberechtigt': 'Erziehungsberechtigt',
        'verein.category.aktiv': 'Aktiv',
        'verein.category.passiv': 'Passiv',
        'verein.category.foerdernd': 'Fördernd',
        'verein.category.ehrenmitglied': 'Ehrenmitglied',
        'verein.category.jugend': 'Jugend',
    },
    en: {
        'nav.verein': 'Club',
        'verein.page.title': 'Club',
        'verein.no-club.title': 'No club yet',
        'verein.no-club.body': "You're not a member of a club yet. Ask your club's board how to join.",
        'verein.tab.info': 'Club info',
        'verein.tab.mitglieder': 'Members',
        'verein.tab.abteilungen': 'Departments',
        'verein.info.board': 'Board',
        'verein.info.board.empty': 'No board roles assigned yet.',
        'verein.info.pages': 'Documents',
        'verein.info.pages.empty': 'No club documents yet.',
        'verein.members.empty': 'No members found.',
        'verein.members.table.name': 'Name',
        'verein.members.table.category': 'Category',
        'verein.members.table.roles': 'Roles',
        'verein.members.table.joined': 'Member since',
        'verein.departments.empty': 'No departments yet.',
        'verein.departments.new.placeholder': 'New department, e.g. "Football"',
        'verein.departments.new.submit': 'Create',
        'verein.role.vorsitz': 'Chair',
        'verein.role.stellv_vorsitz': 'Deputy Chair',
        'verein.role.kassenwart': 'Treasurer',
        'verein.role.schriftfuehrer': 'Secretary',
        'verein.role.beisitzer': 'Assessor',
        'verein.role.abteilungsleitung': 'Department Lead',
        'verein.role.trainer': 'Trainer',
        'verein.role.erziehungsberechtigt': 'Guardian',
        'verein.category.aktiv': 'Active',
        'verein.category.passiv': 'Passive',
        'verein.category.foerdernd': 'Supporting',
        'verein.category.ehrenmitglied': 'Honorary member',
        'verein.category.jugend': 'Youth',
    },
};

export default VereinTranslation;
