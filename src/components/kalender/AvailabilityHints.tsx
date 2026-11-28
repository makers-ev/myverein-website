'use client';

import { useEffect, useId, useState } from 'react';
import { UsersRound } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type AvailabilityHints as Hints, type HintFailure, hintFailure, hintRequest, sortedNames } from '@/lib/availabilityHints';

import { secondaryBtn } from './calendarTypes';

interface Props {
    clubId: string;
    calendarId: string;
    /** ISO start/end of the event as it is currently entered (first occurrence for a new series). */
    startsAt: string;
    endsAt: string | null;
    /** Existing event being edited: its sign-ups join the pool. */
    eventId?: string;
    /** The hint covers one occurrence only. */
    series?: 'first' | 'this';
}

interface Result {
    key: string;
    /** Calendar the answer belongs to: another calendar means another pool, so the old answer must not stay visible. */
    calendarId: string;
    data?: Hints;
    failure?: HintFailure;
}

const DEBOUNCE_MS = 500;

/**
 * "Wer hat Zeit?" in the event form (Wave 16 W3). Counters for everybody the backend lets in, names of the unavailable people
 * only when it sends them. A hint: it never disables saving, and "unbekannt" means no entries, not "nicht verfügbar".
 */
export default function AvailabilityHints({ clubId, calendarId, startsAt, endsAt, eventId, series }: Props) {
    const { t } = useLanguage();
    const id = useId();
    const [result, setResult] = useState<Result | null>(null);
    const [attempt, setAttempt] = useState(0);

    const request = hintRequest({ clubId, calendarId, startsAt, endsAt, eventId });
    const key = request.kind === 'query' ? `${request.query}#${attempt}` : null;
    const query = request.kind === 'query' ? request.query : null;

    useEffect(() => {
        if (!query || !key) return;
        const controller = new AbortController();
        const timer = setTimeout(() => {
            apiFetch<{ data: Hints }>(`/events/availability-hints?${query}`, { signal: controller.signal })
                .then((res) => {
                    // A superseded answer (aborted, or arriving late) never replaces the current one.
                    if (!controller.signal.aborted) setResult({ key, calendarId, data: res.data });
                })
                .catch((err) => {
                    if (!controller.signal.aborted) setResult({ key, calendarId, failure: hintFailure(err) });
                });
        }, DEBOUNCE_MS);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query, key, calendarId]);

    // Without the right to see hints the section simply does not exist (the form works as before).
    if (result?.failure === 'forbidden') return null;

    const current = result && result.key === key ? result : null;
    const loading = key !== null && current === null;
    // While a new answer is on its way the last one stays visible (dimmed) instead of flickering away.
    const data = (current ?? (result?.calendarId === calendarId ? result : null))?.data;
    const failure = current?.failure;

    return (
        <section aria-labelledby={`${id}-title`} className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <h3 id={`${id}-title`} className="flex items-center gap-2 font-semibold text-foreground">
                <UsersRound className="h-4 w-4 text-muted-foreground" aria-hidden />
                {t('availability.title')}
            </h3>

            {request.kind === 'skip' ? (
                <p aria-live="polite" className="text-muted-foreground">{t(request.reason === 'range' ? 'availability.range' : 'availability.incomplete')}</p>
            ) : failure ? (
                // role="alert" announces itself: no extra live region around it.
                <div className="flex flex-wrap items-center gap-2">
                    <p role="alert" className="text-destructive">
                        {t(failure === 'rate' ? 'availability.rate' : failure === 'range' ? 'availability.range' : 'availability.error')}
                    </p>
                    {failure !== 'range' && (
                        <button type="button" onClick={() => setAttempt((n) => n + 1)} className={`${secondaryBtn} min-h-[44px] !px-4 text-sm`}>
                            {t('availability.retry')}
                        </button>
                    )}
                </div>
            ) : !data ? (
                <p aria-live="polite" className="text-muted-foreground">{t('availability.loading')}</p>
            ) : data.counts.total === 0 ? (
                <p aria-live="polite" className="text-muted-foreground">{t('availability.empty')}</p>
            ) : (
                <Summary data={data} loading={loading} />
            )}

            <p className="text-xs text-muted-foreground">
                {series ? `${t(series === 'first' ? 'availability.series.first' : 'availability.series.this')} ` : ''}
                {t('availability.hint')}
            </p>
        </section>
    );
}

function Summary({ data, loading }: { data: Hints; loading: boolean }) {
    const { t } = useLanguage();
    const { counts } = data;
    const names = sortedNames(data);
    const pct = (n: number) => `${Math.round((n / counts.total) * 100)}%`;

    return (
        <div className={`space-y-2 transition-opacity ${loading ? 'opacity-60' : ''}`}>
            {/* Only the counter is announced; the name list stays outside the live region. */}
            <p aria-live="polite" aria-busy={loading} className="text-base font-semibold text-foreground">
                {t('availability.count', { free: counts.verfuegbar, total: counts.total })}
                {loading && <span className="ml-2 text-xs font-normal text-muted-foreground">{t('availability.loading')}</span>}
            </p>
            <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                <span className="bg-success" style={{ width: pct(counts.verfuegbar) }} />
                <span className="bg-destructive" style={{ width: pct(counts.nicht_verfuegbar) }} />
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <li>{t('availability.busy', { count: counts.nicht_verfuegbar })}</li>
                <li>{t('availability.unknown', { count: counts.unbekannt })}</li>
            </ul>
            {data.includesNames && names.length > 0 && (
                <details className="rounded-lg bg-background px-3 py-2">
                    <summary className="cursor-pointer font-medium text-foreground">{t('availability.names', { count: names.length })}</summary>
                    <ul className="mt-2 list-disc space-y-0.5 pl-5 text-foreground">
                        {names.map((n, i) => (
                            <li key={`${n}-${i}`}>{n}</li>
                        ))}
                    </ul>
                </details>
            )}
            <p className="text-xs text-muted-foreground">{t(`availability.pool.${data.pool}`)}</p>
            {data.truncated && <p className="text-xs text-warning">{t('availability.truncated')}</p>}
        </div>
    );
}
