'use client';

import { useState } from 'react';

import RoleBadge from '@/components/verein/RoleBadge';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { memberErrorKey, type MemberRole } from '@/lib/clubMembers';

// Mirrors the backend's CLUB_ROLE_TYPES (src/lib/club-permissions.ts) --
// kept in sync by hand, same as the verein.role.* translation keys already
// are for display strings.
const CLUB_ROLE_TYPES = [
    'vorsitz',
    'stellv_vorsitz',
    'kassenwart',
    'schriftfuehrer',
    'beisitzer',
    'abteilungsleitung',
    'trainer',
    'erziehungsberechtigt',
] as const;

type RoleType = (typeof CLUB_ROLE_TYPES)[number];

/**
 * Role badges + "add role" for one member. Roles hang on a login account (backend answers 409 for members without
 * one), so the caller must not render this for `hasAccount === false`.
 */
export default function MemberRoleCell({
    memberId,
    roles,
    clubId,
    canEdit,
    onChange,
}: {
    /** `club_members.id` (the canonical id used in `/club-members/:id/roles`). */
    memberId: string;
    roles: MemberRole[];
    clubId: string;
    canEdit: boolean;
    onChange: () => void;
}) {
    const { t } = useLanguage();
    const [adding, setAdding] = useState(false);
    const [newRole, setNewRole] = useState<RoleType>('beisitzer');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Only offer roles the member doesn't hold yet; backend rejects duplicates with 409.
    const availableRoles = CLUB_ROLE_TYPES.filter((rt) => !roles.some((r) => r.roleType === rt));
    const selectedRole = availableRoles.includes(newRole) ? newRole : availableRoles[0];

    async function handleAdd() {
        if (!selectedRole) return;
        setError(null);
        setSubmitting(true);
        try {
            await apiFetch(`/club-members/${memberId}/roles?clubId=${clubId}`, {
                method: 'POST',
                body: { roleType: selectedRole },
            });
            setAdding(false);
            onChange();
        } catch (err) {
            // A 403 is shown inline instead of a silent no-op.
            setError(t(memberErrorKey(err)));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleRemove(roleId: string) {
        setError(null);
        try {
            await apiFetch(`/club-members/${memberId}/roles/${roleId}?clubId=${clubId}`, { method: 'DELETE' });
            onChange();
        } catch (err) {
            setError(t(memberErrorKey(err)));
        }
    }

    return (
        <div>
            <div className="flex flex-wrap gap-1">
                {roles.map((r) => (
                    <RoleBadge key={r.id} roleType={r.roleType} onRemove={canEdit ? () => void handleRemove(r.id) : undefined} />
                ))}
            </div>
            {!canEdit ? null : adding && selectedRole ? (
                <div className="mt-1.5 flex items-center gap-1">
                    <select
                        value={selectedRole}
                        onChange={(e) => setNewRole(e.target.value as RoleType)}
                        aria-label={t('verein.roles.add')}
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
                    >
                        {availableRoles.map((rt) => (
                            <option key={rt} value={rt}>
                                {t(`verein.role.${rt}`)}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => void handleAdd()}
                        disabled={submitting}
                        className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    >
                        {t('verein.roles.add.confirm')}
                    </button>
                    <button onClick={() => setAdding(false)} className="text-xs text-muted-foreground hover:text-foreground">
                        {t('verein.roles.add.cancel')}
                    </button>
                </div>
            ) : (
                availableRoles.length > 0 && (
                    <button onClick={() => setAdding(true)} className="mt-1.5 text-xs font-medium text-primary hover:underline">
                        {t('verein.roles.add')}
                    </button>
                )
            )}
            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
    );
}
