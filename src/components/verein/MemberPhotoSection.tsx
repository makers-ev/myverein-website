'use client';

import { useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';

import MemberAvatar from '@/components/verein/MemberAvatar';
import MemberPhotoDialog from '@/components/verein/MemberPhotoDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type ClubMember, secondaryButtonClass } from '@/lib/clubMembers';
import { isMinorBirthDate, photoErrorKey } from '@/lib/memberPhoto';

/**
 * Photo block with change/remove actions. `target` is `'me'` (own photo, `PUT/DELETE /club-members/me/photo`) or a
 * `club_members.id` (board, `members:write`). The own photo of a minor is set by the board: the buttons are replaced by
 * a hint (the backend answers 403 anyway). Nothing here persists the signed URL; after a change `onChanged` lets the
 * parent refetch the resource.
 */
export default function MemberPhotoSection({
    clubId,
    target,
    name,
    photoUrl,
    birthDate,
    onChanged,
    onExpired,
}: {
    clubId: string;
    target: 'me' | string;
    name: string | null;
    photoUrl?: string | null;
    /** Own photo only: known birth date, to explain the minor rule up front. */
    birthDate?: string | null;
    /** The server changed; `updated` is the member shape returned by PUT (absent after a removal). */
    onChanged: (updated?: ClubMember) => void;
    onExpired?: () => void;
}) {
    const { t } = useLanguage();
    const own = target === 'me';
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const minorBlocked = own && isMinorBirthDate(birthDate);
    const base = `/club-members/${target}/photo?clubId=${clubId}`;

    async function upload(jpeg: Blob) {
        const body = new FormData();
        body.append('file', jpeg, 'photo.jpg');
        try {
            const res = await apiFetch<{ data?: ClubMember }>(base, { method: 'PUT', body });
            setError(null);
            onChanged(res.data);
        } catch (err) {
            throw new Error(t(photoErrorKey(err, own)));
        }
    }

    async function remove() {
        if (!window.confirm(t('verein.photo.remove.confirm'))) return;
        setBusy(true);
        setError(null);
        try {
            await apiFetch(base, { method: 'DELETE' });
            onChanged();
        } catch (err) {
            setError(t(photoErrorKey(err, own)));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="flex items-center gap-3">
            <MemberAvatar name={name} photoUrl={photoUrl} size="md" onExpired={onExpired} />
            <div className="min-w-0">
                {minorBlocked ? (
                    <>
                        <p className="text-xs text-muted-foreground">{t('verein.photo.minorHint')}</p>
                        {photoUrl && (
                            <button type="button" onClick={() => void remove()} disabled={busy} className={`${secondaryButtonClass} mt-2 inline-flex items-center gap-1.5 !px-3 !py-1.5 text-xs`}>
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                {t('verein.photo.remove')}
                            </button>
                        )}
                    </>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setOpen(true)} disabled={busy} className={`${secondaryButtonClass} inline-flex items-center gap-1.5 !px-3 !py-1.5 text-xs`}>
                            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                            {photoUrl ? t('verein.photo.change') : t('verein.photo.add')}
                        </button>
                        {photoUrl && (
                            <button type="button" onClick={() => void remove()} disabled={busy} className={`${secondaryButtonClass} inline-flex items-center gap-1.5 !px-3 !py-1.5 text-xs`}>
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                {t('verein.photo.remove')}
                            </button>
                        )}
                    </div>
                )}
                {!photoUrl && !minorBlocked && <p className="mt-1 text-xs text-muted-foreground">{t('verein.photo.none')}</p>}
                {error && (
                    <p role="alert" className="mt-1 text-xs text-destructive">
                        {error}
                    </p>
                )}
            </div>
            {open && <MemberPhotoDialog title={own ? t('verein.photo.title.own') : t('verein.photo.title.member', { name: name ?? '—' })} onClose={() => setOpen(false)} onSave={upload} />}
        </div>
    );
}
