'use client';

import { useCallback, useEffect, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type Absence } from '@/lib/absences';
import { SectionCard, errorMessage, primaryButtonClass } from '@/components/standorte/ui';
import LoadingText from '@/components/LoadingText';
import AbsenceForm from './AbsenceForm';
import AbsenceList from './AbsenceList';

/**
 * "Meine Abwesenheit": an adult member (or any member with a club account) reports being sick or away and sees the open
 * reports. Needs a `club_members` row; external guests get 403 and see the plain-language hint instead of the form.
 */
export default function OwnAbsencesPanel({ clubId }: { clubId: string }) {
    const { t } = useLanguage();
    const [absences, setAbsences] = useState<Absence[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const base = `?clubId=${encodeURIComponent(clubId)}`;

    const load = useCallback(async () => {
        setError(null);
        try {
            const res = await apiFetch<{ data: Absence[] }>(`/absences${base}`);
            setAbsences(res.data);
        } catch (err) {
            setAbsences(null);
            setError(errorMessage(err, t));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [base]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    return (
        <SectionCard
            title={t('absence.own.title')}
            action={
                !formOpen && absences && (
                    <button type="button" onClick={() => setFormOpen(true)} className={primaryButtonClass}>
                        {t('absence.own.report')}
                    </button>
                )
            }
        >
            <p className="mb-3 text-sm text-muted-foreground">{t('absence.own.intro')}</p>
            {notice && (
                <p role="status" className="mb-3 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
                    {notice}
                </p>
            )}
            {formOpen && (
                <div className="mb-4 rounded-lg border border-border p-3">
                    <AbsenceForm
                        onCancel={() => setFormOpen(false)}
                        onSubmit={async (body) => {
                            await apiFetch(`/absences${base}`, { method: 'POST', body });
                            setFormOpen(false);
                            setNotice(t('absence.own.saved'));
                            await load();
                        }}
                    />
                </div>
            )}
            {error ? (
                <p role="alert" className="text-sm text-destructive">
                    {error}{' '}
                    <button type="button" onClick={() => void load()} className="font-semibold underline">
                        {t('common.retry')}
                    </button>
                </p>
            ) : absences === null ? (
                <LoadingText />
            ) : (
                <AbsenceList
                    absences={absences}
                    canEdit
                    onWithdraw={async (id) => {
                        await apiFetch(`/absences/${encodeURIComponent(id)}${base}`, { method: 'DELETE' });
                        setNotice(null);
                        await load();
                    }}
                />
            )}
        </SectionCard>
    );
}
