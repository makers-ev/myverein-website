'use client';

import { useId, useState } from 'react';
import { FileCheck2 } from 'lucide-react';

import { inputClass, secondaryButtonClass } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { todayIso } from '@/lib/clubMembers';
import GenerateDialog, { useTemplateOffered } from './GenerateDialog';

/**
 * "Mitgliedsbestätigung erstellen" (Wave 13 W3/W4): for oneself, a ward (guardian who is a member) or, as the board, for any member.
 * The PDF lands in the person's own storage (`onDone` reloads that list). The server checks who may ask and answers `404` otherwise.
 */
export default function MembershipConfirmationAction({ clubId, clubMemberId, onDone }: { clubId: string; clubMemberId: string; onDone: () => void }) {
    const { t } = useLanguage();
    const offered = useTemplateOffered(clubId, 'mitgliedsbestaetigung');
    const [open, setOpen] = useState(false);
    if (!offered) return null;
    return (
        <>
            <button type="button" className={secondaryButtonClass} onClick={() => setOpen(true)}>
                <FileCheck2 className="h-4 w-4" aria-hidden="true" />
                {t('docs.gen.confirmation.action')}
            </button>
            {open && <ConfirmationDialog clubId={clubId} clubMemberId={clubMemberId} onClose={() => setOpen(false)} onDone={onDone} />}
        </>
    );
}

function ConfirmationDialog({ clubId, clubMemberId, onClose, onDone }: { clubId: string; clubMemberId: string; onClose: () => void; onDone: () => void }) {
    const { t } = useLanguage();
    const id = useId();
    const [asOf, setAsOf] = useState('');
    const today = todayIso();
    const dateOk = asOf === '' || asOf <= today;
    return (
        <GenerateDialog
            clubId={clubId}
            templateId="mitgliedsbestaetigung"
            title={t('docs.gen.confirmation.title')}
            intro={t('docs.gen.confirmation.intro')}
            params={{ clubMemberId, ...(asOf ? { asOf } : {}) }}
            target={{ kind: 'person', memberId: clubMemberId }}
            canSubmit={dateOk}
            onClose={onClose}
            onDone={onDone}
        >
            <label className="block" htmlFor={`${id}-asof`}>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.gen.confirmation.asOf')}</span>
                <input id={`${id}-asof`} type="date" max={today} value={asOf} onChange={(e) => setAsOf(e.target.value)} className={inputClass} aria-invalid={!dateOk} />
                <span className="mt-1 block text-xs text-muted-foreground">{t('docs.gen.confirmation.asOfHint')}</span>
            </label>
        </GenerateDialog>
    );
}
