'use client';

import { useCallback, useEffect, useState } from 'react';
import { HeartPulse } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type Absence } from '@/lib/absences';
import { SectionCard, primaryButtonClass } from '@/components/standorte/ui';
import LoadingText from '@/components/LoadingText';
import AbsenceForm from '@/components/absences/AbsenceForm';
import AbsenceList from '@/components/absences/AbsenceList';

/**
 * "Krank melden" for a ward in two clicks: open the form (kind "krank", today preset), send. With a note hint "keine
 * Diagnosen". Needs `canReportAbsence` on the guardian link; without it the card only lists the reports.
 */
export default function WardAbsences({ clubId, wardId, canReport, onChanged }: { clubId: string; wardId: string; canReport: boolean; onChanged?: () => void }) {
    const { t } = useLanguage();
    const [absences, setAbsences] = useState<Absence[] | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const base = `/guardian/wards/${encodeURIComponent(wardId)}/absences`;
    const query = `?clubId=${encodeURIComponent(clubId)}`;

    const load = useCallback(async () => {
        setLoadError(false);
        try {
            const res = await apiFetch<{ data: Absence[] }>(`${base}${query}`);
            setAbsences(res.data);
        } catch {
            setLoadError(true);
        }
    }, [base, query]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    return (
        <SectionCard
            title={t('familie.absences.title')}
            action={
                canReport &&
                !formOpen && (
                    <button type="button" onClick={() => setFormOpen(true)} className={primaryButtonClass}>
                        <HeartPulse className="h-4 w-4" aria-hidden />
                        {t('familie.absences.report')}
                    </button>
                )
            }
        >
            {!canReport && <p className="mb-3 text-sm text-muted-foreground">{t('familie.absences.noRight')}</p>}
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
                            await apiFetch(`${base}${query}`, { method: 'POST', body });
                            setFormOpen(false);
                            setNotice(t('familie.absences.saved'));
                            await load();
                            onChanged?.();
                        }}
                    />
                </div>
            )}
            {loadError ? (
                <p role="alert" className="text-sm text-destructive">
                    {t('common.error')}{' '}
                    <button type="button" onClick={() => void load()} className="font-semibold underline">
                        {t('common.retry')}
                    </button>
                </p>
            ) : !absences ? (
                <LoadingText />
            ) : (
                <AbsenceList
                    absences={absences}
                    canEdit={canReport}
                    onWithdraw={async (id) => {
                        await apiFetch(`${base}/${encodeURIComponent(id)}${query}`, { method: 'DELETE' });
                        setNotice(null);
                        await load();
                        onChanged?.();
                    }}
                />
            )}
        </SectionCard>
    );
}
