import type { LucideIcon } from 'lucide-react';
import { Boxes, Building2, CalendarDays, Clock, MapPin, Users } from 'lucide-react';

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
 * Sourced 1:1 from the internal Feature List (`lpj-its-vault`, "Feature
 * List - MyVerein.md"), which is the verified source of truth for shipped
 * status. Only customer-visible ✅ rows are included here -- backend-only
 * plumbing without any direct UI (e.g. the two-tier role model behind
 * §2.4, the `guardian_links` data layer behind §1.6, the shared
 * availability data source behind §4.3) and the still-⬜ items (club-info
 * editing UI, the UI club-switcher) are deliberately left out -- those
 * belong on /roadmap instead, not here. Some adjacent doc rows (esp. the
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
                label: { de: 'Eigene Kontaktdaten selbst pflegen', en: 'Self-service contact-data updates' },
                platform: 'app',
            },
            {
                label: { de: 'Digitaler Aufnahmeantrag', en: 'Digital membership application' },
                platform: 'app',
            },
            {
                label: { de: 'Vereinsrollen zuweisen', en: 'Assign club roles' },
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
                    de: 'Vereinsdokumente einsehen (Satzung, Leitbild, ...)',
                    en: 'Browse club documents (bylaws, mission statement, ...)',
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
                label: { de: 'Termine anlegen & bearbeiten', en: 'Create & edit events' },
                platform: 'web',
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
                platform: 'web',
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
                platform: 'web',
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
                platform: 'web',
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
                platform: 'web',
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
                platform: 'app',
            },
            {
                label: { de: 'WLAN-Netze & Links verwalten', en: 'Manage WiFi networks & links' },
                platform: 'web',
            },
            {
                label: { de: 'Schlüsselverwaltung', en: 'Key management' },
                platform: 'web',
            },
        ],
    },
];
