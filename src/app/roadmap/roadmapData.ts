import type { LucideIcon } from 'lucide-react';
import { Boxes, FileSpreadsheet, FileText, Globe, Handshake, IdCard, ScanLine, Search, Smartphone, Timer, UserPlus } from 'lucide-react';

export type RoadmapStatus = 'planned' | 'in-progress' | 'done';

/** Feature = new functionality. Fix = a scheduled fix for a known bug (see knownBugsData.ts). */
export type RoadmapType = 'feature' | 'fix';

export interface RoadmapItem {
    /** Stable, unique key -- also used as the React list key. */
    id: string;
    icon: LucideIcon;
    type: RoadmapType;
    title: { de: string; en: string };
    description: { de: string; en: string };
    status: RoadmapStatus;
    /** Free-form display label -- a quarter, a month, a year, or "Später" / "Backlog". */
    period: string;
    /**
     * Sort order, ascending. Use `YYYYMM` for a specific month, `YYYYQQ` for a
     * quarter, or `YYYY00` for "sometime that year". Items sharing the same
     * `period` string are grouped under one heading. Use a very large number
     * (999xxx) for an undated backlog/"someday" bucket -- none of the items
     * below have a real target date yet, so they all live in that bucket.
     */
    sortKey: number;
}

/**
 * The MyVerein roadmap, shown at /roadmap. Updated 2026-10-31: everything that
 * shipped (time tracking, member card, consent management, notice board and
 * broadcasts, votes, helper planning, reporting) moved to /features and
 * /changelog. What remains is the planned outreach block (sponsors, public club
 * page, enquiries, club search, federation report) and the honest leftovers
 * from the Feature List's "Weiterhin offen" sections. Nothing here has a target
 * date, so everything lives in the single undated "Später" bucket. Billing
 * (dues, dunning, cash book) is deliberately not on the roadmap.
 *
 * To add an entry: append it below. No other file needs to change -- the
 * page groups and sorts entries by `sortKey` automatically.
 */
export const ROADMAP_ITEMS: RoadmapItem[] = [
    {
        id: 'sponsoren-profile',
        icon: Handshake,
        type: 'feature',
        title: {
            de: 'Sponsoren-/Partnerprofile',
            en: 'Sponsor and partner profiles',
        },
        description: {
            de: 'Eigene Profile für Sponsoren und Partner mit Laufzeit und Gegenleistung, sichtbar für eine eingeschränkte externe Rolle, ohne Zugriff auf Mitgliederdaten.',
            en: 'Dedicated profiles for sponsors and partners with term and consideration, visible to a restricted external role, without access to member data.',
        },
        status: 'planned',
        period: 'Später',
        sortKey: 999001,
    },
    {
        id: 'oeffentliche-vereinsseite',
        icon: Globe,
        type: 'feature',
        title: {
            de: 'Öffentliche Vereinsseite',
            en: 'Public club page',
        },
        description: {
            de: 'Eine freiwillige Seite, die zeigt, wer ihr seid und wie man mitmacht. Der Verein entscheidet, was darauf steht; Mitgliederdaten gehören nicht dazu.',
            en: 'An optional page that shows who you are and how to join. The club decides what is on it; member data is not part of it.',
        },
        status: 'planned',
        period: 'Später',
        sortKey: 999002,
    },
    {
        id: 'interessenten-probetraining',
        icon: UserPlus,
        type: 'feature',
        title: {
            de: 'Anfragen und Probetraining',
            en: 'Enquiries and trial sessions',
        },
        description: {
            de: 'Interessierte melden sich über die Vereinsseite, der Vorstand sieht die Anfragen in einer Liste und macht daraus einen Aufnahmeantrag. Dazu eine Warteliste je Abteilung.',
            en: 'Interested people get in touch through the club page; the board sees the enquiries in a list and turns them into a membership application. Plus a waiting list per department.',
        },
        status: 'planned',
        period: 'Später',
        sortKey: 999003,
    },
    {
        id: 'vereinssuche',
        icon: Search,
        type: 'feature',
        title: {
            de: 'Verein finden',
            en: 'Find a club',
        },
        description: {
            de: 'Vereine, die das ausdrücklich wollen, lassen sich per Suche finden. Der Beitritt läuft weiter über einen Aufnahmeantrag.',
            en: 'Clubs that explicitly opt in can be found by search. Joining still goes through a membership application.',
        },
        status: 'planned',
        period: 'Später',
        sortKey: 999004,
    },
    {
        id: 'verbandsmeldung',
        icon: FileSpreadsheet,
        type: 'feature',
        title: {
            de: 'Verbandsmeldung als Export',
            en: 'Federation report as export',
        },
        description: {
            de: 'Bestandsmeldung für Sportbund & Co. als CSV mit Stichtag und wählbaren Spalten, aus den Mitgliedsdaten, die ohnehin da sind.',
            en: 'A membership return for sports federations and the like as CSV with a cut-off date and selectable columns, from the member data that is already there.',
        },
        status: 'planned',
        period: 'Später',
        sortKey: 999005,
    },
    {
        id: 'selbst-check-in',
        icon: ScanLine,
        type: 'feature',
        title: {
            de: 'Selbst-Check-in per Code',
            en: 'Self check-in by code',
        },
        description: {
            de: 'Teilnehmende checken am Platz selbst ein, statt dass die Trainerin sie antippt. Heute erfasst die Trainerin die Anwesenheit.',
            en: 'Participants check in themselves on site instead of the coach tapping them. Today the coach records attendance.',
        },
        status: 'planned',
        period: 'Später',
        sortKey: 999006,
    },
    {
        id: 'vereinsvorlagen',
        icon: FileText,
        type: 'feature',
        title: {
            de: 'Eigene Vorlagen mit Platzhaltern',
            en: 'Your own templates with placeholders',
        },
        description: {
            de: 'Eigene Briefe und Bescheinigungen aus Vereinsvorlagen. Heute sind die PDF-Vorlagen vorgegeben und nur das Branding (Logo, Farben, Briefkopf) lässt sich anpassen.',
            en: 'Your own letters and confirmations from club templates. Today the PDF templates are fixed and only the branding (logo, colours, letterhead) can be adapted.',
        },
        status: 'planned',
        period: 'Später',
        sortKey: 999007,
    },
    {
        id: 'ausweis-offline-pruefung',
        icon: IdCard,
        type: 'feature',
        title: {
            de: 'Ausweis auch ohne Netz prüfen',
            en: 'Check the card without a network',
        },
        description: {
            de: 'Heute prüft man den Mitgliedsausweis nur online. Eine Prüfung ohne Netz ist noch nicht gebaut.',
            en: 'Today the membership card can only be checked online. Checking without a network is not built yet.',
        },
        status: 'planned',
        period: 'Später',
        sortKey: 999008,
    },
    {
        id: 'app-verwaltung',
        icon: Smartphone,
        type: 'feature',
        title: {
            de: 'Mehr Verwaltung in der App',
            en: 'More management in the app',
        },
        description: {
            de: 'Einiges geht heute nur auf der Website, etwa Teilnehmerlisten, Helferplan verwalten, Dokumente hochladen und Stundensätze. Ob und was davon in die App kommt, ist noch offen.',
            en: 'Some things only work on the website today, such as participant lists, managing the helper plan, uploading documents and hourly rates. Whether and what of it comes to the app is still open.',
        },
        status: 'planned',
        period: 'Später',
        sortKey: 999009,
    },
    {
        id: 'website-ausleihe',
        icon: Boxes,
        type: 'feature',
        title: {
            de: 'Ausleihe und Schadensmeldung auf der Website',
            en: 'Lending and damage reports on the website',
        },
        description: {
            de: 'Material ausleihen und Schäden melden geht heute in der App. Die Website soll das später auch können.',
            en: 'Borrowing equipment and reporting damage works in the app today. The website is meant to follow later.',
        },
        status: 'planned',
        period: 'Später',
        sortKey: 999010,
    },
    {
        id: 'stundensaetze-ausbau',
        icon: Timer,
        type: 'feature',
        title: {
            de: 'Stundensätze und Stundenbericht ausbauen',
            en: 'Extend hourly rates and the hours report',
        },
        description: {
            de: 'Stundensätze für weitere Vereinsrollen und zum Bearbeiten, dazu der Stundenbericht-Export in der App. Eine Auszahlung oder Lohnabrechnung ist ausdrücklich nicht geplant.',
            en: 'Hourly rates for more club roles and editing, plus the hours report export in the app. A payout or payroll is explicitly not planned.',
        },
        status: 'planned',
        period: 'Später',
        sortKey: 999011,
    },
];
