import { can } from './clubPermissions';
import type { Folder } from './documents';

/**
 * Wave 13 W9: gating of the document features. The permission strings come from `GET /club-members/me`; the backend enforces
 * them again (and answers `404` for what the caller may not see), so this only decides what is shown. Deny-by-default: a missing
 * or unknown permission grants nothing. Guardians (external `erziehungsberechtigt` role) hold none of them.
 */

export interface DocumentsGate {
    /** Edit club documents (Satzung, ...) and restore versions (`club_info:write`). */
    editClubInfo: boolean;
    /** Archive: manage every folder, folder rights, empty the trash (`documents:manage`). */
    manage: boolean;
    /** Archive: upload and edit everywhere (`documents:write`). */
    write: boolean;
    /** Tab "Dokumente" in the member file (`documents:read_personal`). */
    readPersonal: boolean;
    /** Generate documents (`documents:generate`). Offered templates still come from the server. */
    generate: boolean;
    /** Logo, colours, letterhead, test page (`branding:write`). */
    branding: boolean;
    /** Storage usage (`storage:read`). */
    storage: boolean;
    /** Issue, re-issue, revoke membership cards and print them (`member_cards:manage`). */
    cardsManage: boolean;
    /** Check a card by pasted code or link (`member_cards:verify`). */
    cardsVerify: boolean;
}

export function documentsGate(permissions: readonly string[] | null | undefined): DocumentsGate {
    return {
        editClubInfo: can(permissions, 'club_info:write'),
        manage: can(permissions, 'documents:manage'),
        write: can(permissions, 'documents:write'),
        readPersonal: can(permissions, 'documents:read_personal'),
        generate: can(permissions, 'documents:generate'),
        branding: can(permissions, 'branding:write'),
        storage: can(permissions, 'storage:read'),
        cardsManage: can(permissions, 'member_cards:manage'),
        cardsVerify: can(permissions, 'member_cards:verify'),
    };
}

/**
 * The archive page needs no global permission (a member may hold a folder right): it is shown when the server lists at least one
 * readable folder or grants a level at the root.
 */
export function archiveVisible(res: { data: readonly Folder[]; rootLevel: string | null } | null | undefined): boolean {
    return !!res && (res.data.length > 0 || res.rootLevel !== null);
}

/** The settings tab holds branding and storage: shown for either right. */
export function showsDocumentSettings(permissions: readonly string[] | null | undefined): boolean {
    const g = documentsGate(permissions);
    return g.branding || g.storage;
}
