'use client';

import { useState } from 'react';

import { Modal } from '@/components/Modal';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';

const CATEGORIES = ['aktiv', 'passiv', 'foerdernd', 'ehrenmitglied', 'jugend'] as const;

export interface EditableMember {
    id: string;
    name: string | null;
    category: string | null;
    leftAt?: string | null;
    memberNumber?: string | null;
}

/** Board edit of a membership (PATCH /club-members/:id, needs members:write). */
export default function MemberEditModal({
    member,
    clubId,
    onClose,
    onSaved,
}: {
    member: EditableMember;
    clubId: string;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { t } = useLanguage();
    const [category, setCategory] = useState(member.category ?? 'aktiv');
    const [memberNumber, setMemberNumber] = useState(member.memberNumber ?? '');
    const [leftAt, setLeftAt] = useState(member.leftAt ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSave() {
        setSaving(true);
        setError(null);
        try {
            const res = await apiFetch<{ data?: unknown }>(`/club-members/${member.id}?clubId=${clubId}`, {
                method: 'PATCH',
                body: {
                    category,
                    leftAt: leftAt || null,
                    memberNumber: memberNumber.trim() || null,
                },
            });
            if (!res.data) throw new Error('Request failed');
            onSaved();
            onClose();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            title={member.name ?? '—'}
            footer={
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">
                        {t('verein.roles.add.cancel')}
                    </button>
                    <button
                        onClick={() => void handleSave()}
                        disabled={saving}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                        {t('verein.profil.save')}
                    </button>
                </div>
            }
        >
            <p className="text-xs font-semibold text-muted-foreground">{t('verein.members.table.category')}</p>
            <div className="mt-1 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                    <button
                        key={c}
                        type="button"
                        aria-pressed={category === c}
                        onClick={() => setCategory(c)}
                        className={`rounded-full border px-3 py-1 text-sm ${
                            category === c ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:border-primary'
                        }`}
                    >
                        {t(`verein.category.${c}`)}
                    </button>
                ))}
            </div>

            {member.memberNumber !== undefined && (
                <label className="mt-4 block text-xs font-semibold text-muted-foreground">
                    {t('verein.profil.memberNumber')}
                    <input
                        value={memberNumber}
                        maxLength={50}
                        onChange={(e) => setMemberNumber(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                </label>
            )}

            <label className="mt-4 block text-xs font-semibold text-muted-foreground">
                {t('verein.members.leftAt')}
                <div className="mt-1 flex items-center gap-2">
                    <input
                        type="date"
                        value={leftAt}
                        onChange={(e) => setLeftAt(e.target.value)}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                    {leftAt && (
                        <button type="button" onClick={() => setLeftAt('')} className="text-xs text-muted-foreground hover:text-foreground">
                            {t('verein.members.leftAt.clear')}
                        </button>
                    )}
                </div>
            </label>

            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </Modal>
    );
}
