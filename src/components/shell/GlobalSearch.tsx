'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { Search } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { dateLocale } from '@/lib/clubMembers';
import { flattenSearch, isSearchable, searchPath, type SearchGroupId, type SearchResult } from '@/lib/globalSearch';
import { mapApiError } from '@/lib/mapApiError';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActiveClub } from '@/components/shell/ActiveClubProvider';

const GROUPS: SearchGroupId[] = ['members', 'events', 'documents', 'locations'];

/** Club-wide search (members, events, documents, locations); the backend filters every group by the caller's rights. Ctrl/Cmd+K focuses it. */
export default function GlobalSearch() {
    const { t, language } = useLanguage();
    const { activeClub } = useActiveClub();
    const clubId = activeClub?.clubId ?? null;
    const [q, setQ] = useState('');
    const [result, setResult] = useState<SearchResult | null>(null);
    const [error, setError] = useState<unknown>(null);
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const boxRef = useRef<HTMLDivElement>(null);
    const listId = useId();
    const searchable = isSearchable(q);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
                setOpen(true);
            }
        };
        const onDown = (e: MouseEvent) => {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onDown);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onDown);
        };
    }, []);

    useEffect(() => {
        if (!clubId || !searchable) return;
        let cancelled = false;
        const timer = setTimeout(() => {
            setPending(true);
            apiFetch<{ data: SearchResult }>(searchPath(clubId, q))
                .then((r) => {
                    if (cancelled) return;
                    setResult(r.data);
                    setError(null);
                })
                .catch((e: unknown) => !cancelled && setError(e))
                .finally(() => !cancelled && setPending(false));
        }, 250);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [clubId, q, searchable]);

    if (!clubId) return null;
    const hits = searchable && result ? flattenSearch(result) : [];
    const fmt = (iso: string) => new Date(iso).toLocaleString(dateLocale(language), { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    let body: React.ReactNode;
    if (!searchable) body = <p className="px-3 py-2 text-sm text-muted-foreground">{t('search.hint')}</p>;
    else if (error) body = <p role="alert" className="px-3 py-2 text-sm text-destructive">{mapApiError(error, t)}</p>;
    else if (pending && !result) body = <p className="px-3 py-2 text-sm text-muted-foreground">{t('search.loading')}</p>;
    else if (hits.length === 0) body = <p className="px-3 py-2 text-sm text-muted-foreground">{t('search.empty', { q: q.trim() })}</p>;
    else
        body = (
            <div>
                {GROUPS.map((g) => {
                    const items = hits.filter((h) => h.group === g);
                    if (items.length === 0) return null;
                    return (
                        <section key={g} aria-label={t(`search.group.${g}`)}>
                            <h3 className="px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t(`search.group.${g}`)}</h3>
                            <ul>
                                {items.map((h) => (
                                    <li key={`${g}:${h.id}`}>
                                        <Link href={h.href} onClick={() => setOpen(false)} className="flex min-h-11 flex-col justify-center px-3 py-1.5 text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
                                            <span className="truncate font-medium text-foreground">{h.label}</span>
                                            {(h.startsAt || h.detail) && <span className="truncate text-xs text-muted-foreground">{h.startsAt ? fmt(h.startsAt) : h.detail}</span>}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                })}
            </div>
        );

    return (
        <div ref={boxRef} role="search" className="relative w-full max-w-sm">
            <label htmlFor={`${listId}-input`} className="sr-only">
                {t('search.label')}
            </label>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
                ref={inputRef}
                id={`${listId}-input`}
                type="search"
                value={q}
                autoComplete="off"
                placeholder={t('search.placeholder')}
                aria-controls={listId}
                onChange={(e) => {
                    setQ(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        setOpen(false);
                        (e.target as HTMLInputElement).blur();
                    }
                }}
                className="min-h-11 w-full rounded-lg border border-border bg-background py-1.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            />
            <div id={listId} hidden={!open} aria-live="polite" className="absolute left-0 right-0 top-full z-40 mt-1 max-h-96 overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-lg">
                {body}
            </div>
        </div>
    );
}
