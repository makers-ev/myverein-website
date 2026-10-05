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
