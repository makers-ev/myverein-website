// Shared types/constants for the "Verein gruenden" flow (Wave 6). The shapes mirror the
// backend's club-registrations contract (POST/PATCH/GET /club-registrations, documents sub-routes)
// -- kept in sync by hand, same as CLUB_ROLE_TYPES in Verein.tsx.

export const LEGAL_FORMS = ['e_v', 'nicht_eingetragen', 'sonstige'] as const;
export type LegalForm = (typeof LEGAL_FORMS)[number];

export const CLAIMED_ROLES = ['vorsitz', 'stellv_vorsitz', 'schriftfuehrer'] as const;
export type ClaimedRole = (typeof CLAIMED_ROLES)[number];

export const DOCUMENT_KINDS = ['registerauszug', 'satzung', 'freistellungsbescheid', 'gruendungsprotokoll', 'sonstiges'] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export type RegistrationStatus = 'draft' | 'pending' | 'needs_info' | 'approved' | 'rejected';

export interface RegistrationDocument {
    id: string;
    kind: DocumentKind;
    filename: string;
    mimeType: string;
    sizeBytes: number;
}

export interface ClubRegistration {
    id: string;
    clubName: string;
    legalForm: LegalForm;
    registerCourt: string | null;
    registerNumber: string | null;
    street: string;
    postalCode: string;
    city: string;
    websiteUrl: string | null;
    claimedRole: ClaimedRole;
    status: RegistrationStatus;
    reviewNote: string | null;
    slugSuggestion: string | null;
    clubId: string | null;
    clubSlug: string | null;
    submittedAt: string | null;
    createdAt: string;
    documents: RegistrationDocument[];
}

export const ALLOWED_DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENTS = 5;

/** Shared input styling, same classes as the existing forms. */
export const inputClass =
    'mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none';

/**
 * Proofs that count per legal form -- mirrors QUALIFYING_KINDS in the backend's
 * routes/club-registrations.ts (`sonstiges` alone never suffices). Kept in sync by hand.
 */
export const QUALIFYING_KINDS: Record<LegalForm, readonly DocumentKind[]> = {
    e_v: ['registerauszug', 'satzung', 'freistellungsbescheid', 'gruendungsprotokoll'],
    nicht_eingetragen: ['satzung', 'gruendungsprotokoll'],
    sonstige: ['registerauszug', 'satzung', 'freistellungsbescheid', 'gruendungsprotokoll'],
};

/** Field limits mirroring the backend's zod schema (routes/club-registrations.ts). */
export const LIMITS = {
    clubName: { min: 2, max: 120 },
    registerCourt: { max: 120 },
    registerNumber: { max: 60 },
    street: { max: 200 },
    postalCode: { min: 3, max: 12 },
    city: { max: 120 },
    websiteUrl: { max: 300 },
} as const;

/** Only http(s) URLs are accepted, same as the backend. */
export function isHttpUrl(value: string): boolean {
    try {
        const u = new URL(value);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}

/** Reasons the wizard hands back to NoClubSection so it can show a short notice after closing. */
export type RegistrationNotice = 'open' | 'locked' | 'recheck';
