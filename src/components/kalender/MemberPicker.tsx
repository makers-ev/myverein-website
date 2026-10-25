'use client';

import { useEffect, useId, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';

import { errorMessage, inputClass, secondaryBtn } from './calendarTypes';

export interface PickedMember {
    id: string;
    name: string;
}

interface Props {
    clubId: string;
    label: string;
    /** Member ids that are already taken (hidden from the results). */
    exclude?: ReadonlySet<string>;
    onPick: (member: PickedMember) => void;
    disabled?: boolean;
}

/** Search field over `GET /club-members?q=` (name search, 8 hits); used to add people to lists, plans and registrations. */
export default function MemberPicker({ clubId, label, exclude, onPick, disabled }: Props) {
    const { t } = useLanguage();
    const id = useId();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PickedMember[]>([]);
    const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setResults([]);
            setState('idle');
            return;
        }
        let alive = true;
        setState('loading');
        const timer = setTimeout(() => {
            apiFetch<{ data: Array<{ id: string; name: string | null }> }>(`/club-members?clubId=${clubId}&q=${encodeURIComponent(q)}&pageSize=8`)
                .then((res) => {
                    if (!alive) return;
                    setResults(res.data.map((m) => ({ id: m.id, name: m.name ?? '—' })));
                    setState('idle');
                })
                .catch((err) => {
                    if (!alive) return;
                    setError(errorMessage(err, t));
                    setState('error');
                });
        }, 300);
        return () => {
            alive = false;
            clearTimeout(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, clubId]);

    const shown = results.filter((m) => !exclude?.has(m.id));
    return (
        <div>
            <label htmlFor={id} className="mb-1 block text-xs font-semibold text-muted-foreground">
                {label}
            </label>
            <input id={id} type="search" value={query} disabled={disabled} onChange={(e) => setQuery(e.target.value)} placeholder={t('events.picker.placeholder')} className={inputClass} autoComplete="off" />
            <div aria-live="polite" className="mt-1">
                {state === 'loading' && <p className="text-xs text-muted-foreground">{t('common.loading')}</p>}
                {state === 'error' && (
                    <p role="alert" className="text-xs text-destructive">
                        {error}
                    </p>
                )}
                {state === 'idle' && query.trim().length >= 2 && shown.length === 0 && <p className="text-xs text-muted-foreground">{t('events.picker.none')}</p>}
            </div>
            {shown.length > 0 && (
                <ul className="mt-1 divide-y divide-border rounded-lg border border-border">
                    {shown.map((m) => (
                        <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm">
                            <span className="truncate text-foreground">{m.name}</span>
                            <button
                                type="button"
                                disabled={disabled}
                                onClick={() => {
                                    onPick(m);
                                    setQuery('');
                                    setResults([]);
                                }}
                                className={`${secondaryBtn} !px-2.5 !py-1 text-xs`}
                            >
                                {t('events.picker.add')}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
