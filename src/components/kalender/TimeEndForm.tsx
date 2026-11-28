'use client';

import { useId, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { END_PROBLEM_KEY, type TimeEntry, endTimeErrorKey, endTimeProblem, isAmbiguousLocal, isStaleEndError, latestEnd, toLocalValue } from '@/lib/timeTracking';

import { inputClass, labelClass, primaryBtn, secondaryBtn } from './calendarTypes';

interface Props {
    entry: TimeEntry;
    /** Request that ends the entry: own clock-out (`POST /time-entries/clock-out`) or the board's `POST /time-entries/:id/close`. */
    endpoint: string;
    /** Button label, e.g. "Ende nachtragen" or "Beenden mit Endzeit". */
    submitLabel: string;
    onDone: () => void;
    onCancel: () => void;
    /** The entry changed under the form (no longer running / stuck, overlap): the parent reloads and shows the text key. */
    onStale: (errorKey: string) => void;
    /** Parent is busy with another request: the buttons wait. */
    disabled?: boolean;
    /** Shares the pending state with the parent so that nothing else can be fired meanwhile. */
    onBusy?: (busy: boolean) => void;
}

/** Sets the end of a running entry afterwards. The picker is bounded by the start and the latest allowed end; the server re-checks. */
export default function TimeEndForm({ entry, endpoint, submitLabel, onDone, onCancel, onStale, disabled = false, onBusy }: Props) {
    const { t, language } = useLanguage();
    const id = useId();
    // Fixed when the form opens: keeps render pure; the server re-checks "in the future" anyway.
    const [openedAt] = useState(() => Date.now());
    const [value, setValue] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const min = toLocalValue(new Date(entry.startedAt).getTime());
    const max = toLocalValue(latestEnd(entry, openedAt));
    const problem = value ? endTimeProblem(entry.startedAt, value, openedAt) : null;
    const ambiguous = value !== '' && isAmbiguousLocal(value);
    const fmt = (local: string) => new Date(local).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' });

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!value || disabled) return;
        // The tab may have been open for hours: check against the clock of this moment, not of the moment the form opened.
        if (endTimeProblem(entry.startedAt, value, Date.now())) return;
        setBusy(true);
        onBusy?.(true);
        setError(null);
        try {
            await apiFetch(endpoint, { method: 'POST', body: { endedAt: new Date(value).toISOString() } });
            onDone();
        } catch (err) {
            if (isStaleEndError(err)) onStale(endTimeErrorKey(err));
            else setError(t(endTimeErrorKey(err)));
        } finally {
            setBusy(false);
            onBusy?.(false);
        }
    }

    return (
        <form onSubmit={(e) => void submit(e)} className="space-y-2 rounded-lg border border-border bg-background p-3" aria-label={submitLabel}>
            <div>
                <label htmlFor={`${id}-end`} className={labelClass}>
                    {t('time.end.label')}
                </label>
                <input id={`${id}-end`} type="datetime-local" required autoFocus min={min} max={max} value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={problem !== null} aria-describedby={`${id}-hint`} className={inputClass} />
            </div>
            <p id={`${id}-hint`} className={`text-xs ${problem ? 'text-destructive' : 'text-muted-foreground'}`} role={problem ? 'alert' : undefined}>
                {problem ? t(END_PROBLEM_KEY[problem]) : t('time.end.hint', { from: fmt(min), to: fmt(max) })}
            </p>
            {ambiguous && !problem && <p className="text-xs text-muted-foreground">{t('time.end.ambiguous')}</p>}
            {error && (
                <p role="alert" className="text-xs text-destructive">
                    {error}
                </p>
            )}
            <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={busy || disabled || !value || problem !== null} className={`${primaryBtn} min-h-[44px] !px-4 text-sm`}>
                    {submitLabel}
                </button>
                <button type="button" disabled={busy} onClick={onCancel} className={`${secondaryBtn} min-h-[44px] !px-4 text-sm`}>
                    {t('time.rates.cancel')}
                </button>
            </div>
        </form>
    );
}
