'use client';

import MemberCustomFields from '@/components/verein/MemberCustomFields';
import { Modal } from '@/components/Modal';
import { useLanguage } from '@/contexts/LanguageContext';
import { secondaryButtonClass } from '@/lib/clubMembers';

/**
 * Read-only member details for people without `members:write` (Wave 8 W5): the custom fields their role may see. The server
 * decides per field (`visible_to`, protected fields only with `members:read_sensitive`); nothing can be edited here, except
 * the caller's own fields in "Mein Profil".
 */
export default function MemberDetailDialog({ clubId, memberId, name, onClose }: { clubId: string; memberId: string; name: string | null; onClose: () => void }) {
    const { t } = useLanguage();
    return (
        <Modal
            open
            onClose={onClose}
            title={name ?? t('forms.cf.detail.title')}
            footer={
                <div className="flex justify-end">
                    <button type="button" onClick={onClose} className={secondaryButtonClass}>
                        {t('forms.editor.versions.close')}
                    </button>
                </div>
            }
        >
            <MemberCustomFields clubId={clubId} target={memberId} />
            <p className="mt-3 text-xs text-muted-foreground">{t('forms.cf.detail.hint')}</p>
        </Modal>
    );
}
