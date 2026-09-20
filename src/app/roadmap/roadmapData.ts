import type { LucideIcon } from 'lucide-react';
import { Clock, IdCard, ShieldCheck, Megaphone, Vote, ClipboardList, Handshake, BarChart3 } from 'lucide-react';

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
 * The MyVerein roadmap, shown at /roadmap. None of these ideas (see Concept
 * §7 Future Ideas) have a scheduled target date yet -- everything here is an
 * undated backlog, grouped under a single "Später" period.
 *
 * To add an entry: append it below. No other file needs to change -- the
 * page groups and sorts entries by `sortKey` automatically.
 */
export const ROADMAP_ITEMS: RoadmapItem[] = [
    {
        id: 'zeiterfassung-verguetung',
        icon: Clock,
        type: 'feature',
        title: {
            de: 'Zeiterfassung & Vergütungsabrechnung',
            en: 'Time tracking & compensation payroll',
        },
        description: {
            de: 'Übungsleiter:innen stempeln sich pro Einsatz ein und aus; ein Report multipliziert Stunden × Stundensatz und summiert den Auszahlungsbetrag pro Person automatisch.',
            en: 'Coaches clock in and out per session; a report multiplies hours × hourly rate and automatically totals the payout amount per person.',
        },
        status: 'planned',
        period: 'Später',
        sortKey: 999002,
    },
    {
        id: 'mitgliedsausweis',
        icon: IdCard,
        type: 'feature',
        title: {
            de: 'Digitaler Mitgliedsausweis',
            en: 'Digital membership card',
        },
        description: {
            de: 'Ein Mitgliedsausweis mit QR-Code direkt auf dem Smartphone, für Zutritt und Vergünstigungen bei Partnern, ganz ohne Plastikkarte.',
            en: 'A membership card with a QR code, right on your phone, for access and partner discounts, no plastic card needed.',
        },
        status: 'planned',
        period: 'Später',
        sortKey: 999003,
    },
    {
        id: 'dsgvo-einwilligungen',
        icon: ShieldCheck,
        type: 'feature',
        title: {
            de: 'DSGVO-Einwilligungsverwaltung',
            en: 'GDPR consent management',
        },
        description: {
            de: 'Verwaltung von Einwilligungen, insbesondere Foto- und Videoeinwilligung bei Minderjährigen, nachvollziehbar dokumentiert statt auf Zuruf.',
            en: 'Manage consent, especially photo/video consent for minors, documented and traceable instead of handled informally.',
        },
        status: 'planned',
        period: 'Später',
        sortKey: 999004,
    },
    {
        id: 'kommunikation-broadcast',
        icon: Megaphone,
        type: 'feature',
        title: {
            de: 'Schwarzes Brett & Rundmails',
            en: 'Notice board & broadcast messages',
        },
        description: {
            de: 'Ein digitales schwarzes Brett plus Rundmail-/Push-Broadcast an eine Zielgruppe: ganzer Verein, einzelne Abteilung oder nur der Vorstand.',
            en: 'A digital notice board plus broadcast emails/push notifications to a target group: the whole club, a single department, or just the board.',
        },
        status: 'planned',
        period: 'Später',
        sortKey: 999005,
    },
    {
        id: 'abstimmungen-umlaufbeschluesse',
        icon: Vote,
        type: 'feature',
        title: {
            de: 'Abstimmungen & Umlaufbeschlüsse',
            en: 'Votes & circular resolutions',
        },
        description: {
            de: 'Digitale Abstimmungen und Umlaufbeschlüsse außerhalb regulärer Sitzungen, inklusive Stimmrecht-Prüfung für die Mitgliederversammlung.',
            en: 'Digital votes and circular resolutions outside of regular meetings, including voting-rights verification for the general assembly.',
        },
        status: 'planned',
        period: 'Später',
        sortKey: 999006,
    },
    {
        id: 'helferplanung',
        icon: ClipboardList,
        type: 'feature',
        title: {
            de: 'Helfer- & Schichtplanung',
            en: 'Volunteer & shift scheduling',
        },
        description: {
            de: 'Schichtplanung für Veranstaltungen wie Feste oder Turniere, aufbauend auf den bereits hinterlegten Verfügbarkeiten.',
            en: 'Shift scheduling for events like fêtes or tournaments, built on the availability data members already provide.',
        },
        status: 'planned',
        period: 'Später',
        sortKey: 999007,
    },
    {
        id: 'sponsoren-profile',
        icon: Handshake,
        type: 'feature',
        title: {
            de: 'Sponsoren-/Partnerprofile',
            en: 'Sponsor & partner profiles',
        },
        description: {
            de: 'Eigene Profile für Sponsoren und Partner mit Laufzeit und Gegenleistung, sichtbar für die externe Rolle, ohne Zugriff auf Mitgliederdaten.',
            en: 'Dedicated profiles for sponsors and partners with term and consideration, visible to the external role, without access to member data.',
        },
        status: 'planned',
        period: 'Später',
        sortKey: 999008,
    },
    {
        id: 'reporting-statistik',
        icon: BarChart3,
        type: 'feature',
        title: {
            de: 'Reporting & Statistik',
            en: 'Reporting & statistics',
        },
        description: {
            de: 'Auswertungen zu Mitgliederentwicklung und Altersstruktur für Jahresbericht und Fördermittelanträge, statt händisch aus Excel zusammengetragen.',
            en: 'Reports on membership growth and age structure for the annual report and grant applications, instead of compiling them by hand from spreadsheets.',
        },
        status: 'planned',
        period: 'Später',
        sortKey: 999009,
    },
];
