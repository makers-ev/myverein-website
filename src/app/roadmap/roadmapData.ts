import type { LucideIcon } from 'lucide-react';
import { Boxes, FileText, IdCard, Languages, QrCode, ScanLine, Smartphone, Timer } from 'lucide-react';

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
 * The MyVerein roadmap, shown at /roadmap. Updated 2026-11-22: everything that
 * shipped (time tracking, member card, documents, public club page, club
 * search, enquiries and trial sessions, sponsors, federation report, help
 * portal) moved to /features and /changelog. What remains are the honest
 * leftovers from the Feature List's "Weiterhin offen" sections. Nothing here
 * has a target date, so everything lives in the single undated "Später"
 * bucket. Billing (dues, dunning, cash book) is deliberately not on the roadmap.
 *
 * To add an entry: append it below. No other file needs to change -- the
 * page groups and sorts entries by `sortKey` automatically.
 */
export const ROADMAP_ITEMS: RoadmapItem[] = [
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
        sortKey: 999001,
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
        sortKey: 999002,
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
        sortKey: 999003,
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
        sortKey: 999004,
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
        sortKey: 999005,
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
        sortKey: 999006,
    },
    {
        id: 'beitrittslink',
        icon: QrCode,
        type: 'feature',
        title: {
            de: 'Einladungslink und QR-Code für neue Mitglieder',
            en: 'Invitation link and QR code for new members',
        },
        description: {
            de: 'Ein Link oder QR-Code für den ganzen Verein, etwa für den Flyer oder das Vereinsheim, und Einladungen an viele Personen auf einmal. Heute treten Interessierte über den Vereinscode, die Vereinssuche oder die Vereinsseite bei und der Vorstand lädt einzeln ein.',
            en: 'One link or QR code for the whole club, for example for a flyer or the clubhouse, and invitations to many people at once. Today interested people join with the club code, the club search or the club page, and the board invites one by one.',
        },
        status: 'planned',
        period: 'Später',
        sortKey: 999099,
    },
    {
        id: 'hilfe-englisch',
        icon: Languages,
        type: 'feature',
        title: {
            de: 'Hilfe-Portal auf Englisch',
            en: 'Help portal in English',
        },
        description: {
            de: 'Handbuch und Anleitungen gibt es bisher nur auf Deutsch. Eine englische Fassung ist noch nicht gebaut.',
            en: 'The manual and guides only exist in German so far. An English version is not built yet.',
        },
        status: 'planned',
        period: 'Später',
        sortKey: 999100,
    },
];
