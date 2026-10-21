'use client';

import { useId, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { ABSENCE_KINDS, type AbsenceInput, type AbsenceKind, NOTE_MAX, absenceBody, absenceErrorKey, absenceProblem } from '@/lib/absences';
import { inputClass, primaryButtonClass, secondaryButtonClass, todayIso } from '@/lib/clubMembers';

/**
 * Report form for an absence, shared by the own report ("Meine Abwesenheit") and the guardian's "Krank melden" for a ward.
 * Kind defaults to "krank" and the period to today, so the common case is: open, press send. The note carries a visible
 * "keine Diagnosen" hint (data minimisation, W5/B5); the backend has no diagnosis field at all.
 */
export default function AbsenceForm({
    onSubmit,
    onCancel,
    defaultKind = 'krank',
}: {
    onSubmit: (body: AbsenceInput) => Promise<void>;
    onCancel?: () => void;
    defaultKind?: AbsenceKind;
}) {
    const { t } = useLanguage();
    const id = useId();
    const [kind, setKind] = useState<AbsenceKind>(defaultKind);
    const [startsOn, setStartsOn] = useState(todayIso());
    const [endsOn, setEndsOn] = useState(todayIso());
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const problem = absenceProblem({ startsOn, endsOn, note });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (problem) return;
        setBusy(true);
        setError(null);
        try {
            await onSubmit(absenceBody({ kind, startsOn, endsOn, note }));
        } catch (err) {
            setError(t(absenceErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    return (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
            <fieldset>
                <legend className="mb-1 text-xs font-medium text-muted-foreground">{t('absence.form.kind')}</legend>
                <div className="flex gap-4">
                    {ABSENCE_KINDS.map((value) => (
                        <label key={value} className="flex items-center gap-2 text-sm text-foreground">
                            <input type="radio" name={`${id}-kind`} checked={kind === value} onChange={() => setKind(value)} />
                            {t(`absence.kind.${value}`)}
                        </label>
                    ))}
                </div>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('absence.form.from')}</span>
                    <input
                        type="date"
                        value={startsOn}
                        onChange={(e) => {
                            setStartsOn(e.target.value);
                            // Keep the common one-day case in sync until the end date is set apart.
                            if (endsOn === startsOn || endsOn < e.target.value) setEndsOn(e.target.value);
                        }}
                        required
                        className={inputClass}
                    />
                </label>
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('absence.form.to')}</span>
                    <input type="date" value={endsOn} min={startsOn} onChange={(e) => setEndsOn(e.target.value)} required className={inputClass} />
                </label>
            </div>
            <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('absence.form.note')}</span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={NOTE_MAX} rows={2} aria-describedby={`${id}-hint`} className={inputClass} />
                <span id={`${id}-hint`} className="mt-1 block text-xs text-warning">
                    {t('absence.form.noDiagnosis')}
                </span>
            </label>
            {problem === 'order' && <p className="text-xs text-destructive">{t('absence.err.invalidPeriod')}</p>}
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
            <div className="flex gap-2">
                <button type="submit" disabled={busy || problem !== null} className={primaryButtonClass}>
                    {t('absence.form.submit')}
                </button>
                {onCancel && (
                    <button type="button" onClick={onCancel} className={secondaryButtonClass}>
                        {t('absence.form.cancel')}
                    </button>
                )}
            </div>
        </form>
    );
}
