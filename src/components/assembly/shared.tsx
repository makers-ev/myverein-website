'use client';

import { useEffect, useId, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import type { ClubMember } from '@/lib/clubMembers';
import { useLanguage } from '@/contexts/LanguageContext';
import { inputClass, labelClass } from '@/components/kalender/calendarTypes';

/** Inline error of a failed action; announced to screen readers. */
export function ErrorText({ children }: { children: React.ReactNode }) {
    return (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {children}
        </p>
    );
}

/** Hint box: `warning` for things that can go wrong legally or procedurally, `info` otherwise. Text and icon, never colour alone. */
export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warning'; children: React.ReactNode }) {
    const Icon = tone === 'warning' ? AlertTriangle : Info;
    return (
        <div role={tone === 'warning' ? 'alert' : 'note'} className={`flex gap-2 rounded-lg border px-3 py-2 text-sm ${tone === 'warning' ? 'border-warning/40 bg-warning/10 text-foreground' : 'border-border bg-muted/40 text-muted-foreground'}`}>
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone === 'warning' ? 'text-warning' : ''}`} aria-hidden />
            <div className="min-w-0">{children}</div>
        </div>
    );
}

export interface PickedMember {
    id: string;
    name: string | null;
}

/**
 * Search field for a club member (`GET /club-members?q=`), result is the club member id -- members without an account included.
 * Typing 2+ characters loads up to 8 matches; pick one to select it.
 */
export function MemberPicker({ clubId, label, onPick, excludeIds = [], disabled = false }: { clubId: string; label: string; onPick: (member: PickedMember) => void; excludeIds?: readonly string[]; disabled?: boolean }) {
    const { t } = useLanguage();
    const inputId = useId();
    const [q, setQ] = useState('');
    const [results, setResults] = useState<ClubMember[]>([]);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const term = q.trim();
        if (term.length < 2) return;
        let cancelled = false;
        const timer = setTimeout(() => {
            apiFetch<{ data: ClubMember[] }>(`/club-members?clubId=${clubId}&q=${encodeURIComponent(term)}&pageSize=8&sort=name`)
                .then((res) => {
                    if (cancelled) return;
                    setResults(res.data);
                    setFailed(false);
                })
                .catch(() => {
                    if (!cancelled) setFailed(true);
                });
        }, 250);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [q, clubId]);

    const visible = q.trim().length < 2 ? [] : results.filter((m) => !excludeIds.includes(m.id));

    return (
        <div>
            <label htmlFor={inputId} className={labelClass}>
                {label}
            </label>
            <input id={inputId} type="search" value={q} disabled={disabled} onChange={(e) => setQ(e.target.value)} placeholder={t('assembly.picker.placeholder')} className={inputClass} autoComplete="off" />
            {failed && <p className="mt-1 text-xs text-destructive">{t('common.error')}</p>}
            {q.trim().length >= 2 && !failed && visible.length === 0 && <p className="mt-1 text-xs text-muted-foreground">{t('assembly.picker.none')}</p>}
            {visible.length > 0 && (
                <ul className="mt-1 divide-y divide-border rounded-lg border border-border bg-background" aria-label={t('assembly.picker.results')}>
                    {visible.map((m) => (
                        <li key={m.id}>
                            <button
                                type="button"
                                onClick={() => {
                                    onPick({ id: m.id, name: m.name });
                                    setQ('');
                                    setResults([]);
                                }}
                                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                            >
                                <span className="truncate">{m.name ?? '—'}</span>
                                {!m.hasAccount && <span className="shrink-0 text-xs text-muted-foreground">{t('assembly.picker.noAccount')}</span>}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/** Date + time of an instant in the club time zone, or a dash. */
export function formatWhen(iso: string | null | undefined, language: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(language === 'de' ? 'de-DE' : 'en-GB', { timeZone: 'Europe/Berlin', dateStyle: 'short', timeStyle: 'short' });
}
