'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { type Absence, absenceErrorKey, periodLabel } from '@/lib/absences';
import { formatDate, secondaryButtonClass } from '@/lib/clubMembers';
import { Chip } from '@/components/standorte/ui';
import { useState } from 'react';

/** Own or ward reports with a "Zurückziehen" button each (withdraw is idempotent). `canEdit=false` hides the button. */
export default function AbsenceList({ absences, canEdit, onWithdraw }: { absences: Absence[]; canEdit: boolean; onWithdraw: (id: string) => Promise<void> }) {
    const { t, language } = useLanguage();
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function withdraw(id: string) {
        setBusyId(id);
        setError(null);
        try {
            await onWithdraw(id);
        } catch (err) {
            setError(t(absenceErrorKey(err)));
        } finally {
            setBusyId(null);
        }
    }

    if (absences.length === 0) return <p className="text-sm text-muted-foreground">{t('absence.list.empty')}</p>;
    return (
        <div>
            <ul className="space-y-2">
                {absences.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                        <span className="flex min-w-0 flex-wrap items-center gap-2 text-foreground">
                            <Chip tone={a.kind === 'krank' ? 'warning' : 'muted'}>{t(`absence.kind.${a.kind}`)}</Chip>
                            <span>{periodLabel(a.startsOn, a.endsOn, (d) => formatDate(d, language))}</span>
                            {a.note && <span className="truncate text-muted-foreground">{a.note}</span>}
                        </span>
                        {canEdit && (
                            <button type="button" disabled={busyId === a.id} onClick={() => void withdraw(a.id)} className={secondaryButtonClass}>
                                {t('absence.list.withdraw')}
                            </button>
                        )}
                    </li>
                ))}
            </ul>
            {error && (
                <p role="alert" className="mt-2 text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}
