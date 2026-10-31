'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
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
    const { activeClub } = useActiveClub();
    // Keyed by club: switching the club drops query, results and errors of the previous one.
    return activeClub ? <SearchBox key={activeClub.clubId} clubId={activeClub.clubId} /> : null;
}

function SearchBox({ clubId }: { clubId: string }) {
    const { t, language } = useLanguage();
    const [q, setQ] = useState('');
    const [result, setResult] = useState<SearchResult | null>(null);
    const [error, setError] = useState<unknown>(null);
    const [open, setOpen] = useState(false);
    const [pending, setPending] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const router = useRouter();
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
        if (!searchable) return;
        const controller = new AbortController();
        let cancelled = false;
        const timer = setTimeout(() => {
            setPending(true);
            apiFetch<{ data: SearchResult }>(searchPath(clubId, q), { signal: controller.signal })
                .then((r) => {
                    if (cancelled) return;
                    setResult(r.data);
                    setError(null);
                    setActiveIndex(-1);
                })
                .catch((e: unknown) => {
                    if (!cancelled) setError(e);
                })
                .finally(() => {
                    if (!cancelled) setPending(false);
                });
        }, 250);
        return () => {
            // A superseded query must never leave the box "pending" or show its late answer.
            cancelled = true;
            clearTimeout(timer);
            controller.abort();
            setPending(false);
        };
    }, [clubId, q, searchable]);

    const hits = useMemo(() => (searchable && result ? flattenSearch(result) : []), [searchable, result]);
    const fmt = (iso: string) => new Date(iso).toLocaleString(dateLocale(language), { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const optionId = (i: number) => `${listId}-opt-${i}`;
    const expanded = open;

    function choose(i: number) {
        const hit = hits[i];
        if (!hit) return;
        setOpen(false);
        router.push(hit.href);
    }

    let status = '';
    let body: React.ReactNode;
    if (!searchable) {
        status = t('search.hint');
        body = <p className="px-3 py-2 text-sm text-muted-foreground">{status}</p>;
    } else if (error) {
        status = mapApiError(error, t);
        body = <p role="alert" className="px-3 py-2 text-sm text-destructive">{status}</p>;
    } else if (pending && !result) {
        status = t('search.loading');
        body = <p className="px-3 py-2 text-sm text-muted-foreground">{status}</p>;
    } else if (hits.length === 0) {
        status = t('search.empty', { q: q.trim() });
        body = <p className="px-3 py-2 text-sm text-muted-foreground">{status}</p>;
    } else {
        status = t('search.count', { count: hits.length });
        body = (
            <div className={pending ? 'opacity-50' : undefined} aria-busy={pending}>
                {GROUPS.map((g) => {
                    const items = hits.map((h, index) => ({ h, index })).filter(({ h }) => h.group === g);
                    if (items.length === 0) return null;
                    return (
                        <div key={g} role="group" aria-label={t(`search.group.${g}`)}>
                            <div aria-hidden="true" className="px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t(`search.group.${g}`)}</div>
                            {items.map(({ h, index }) => (
                                <div
                                    key={`${g}:${h.id}`}
                                    id={optionId(index)}
                                    role="option"
                                    aria-selected={index === activeIndex}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => choose(index)}
                                    className={`flex min-h-11 cursor-pointer flex-col justify-center px-3 py-1.5 text-sm hover:bg-muted ${index === activeIndex ? 'bg-muted' : ''}`}
                                >
                                    <span className="truncate font-medium text-foreground">{h.label}</span>
                                    {(h.startsAt || h.detail) && <span className="truncate text-xs text-muted-foreground">{h.startsAt ? fmt(h.startsAt) : h.detail}</span>}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        );
    }
    const showList = hits.length > 0 && !error && searchable;

    return (
        <div
            ref={boxRef}
            role="search"
            className="relative w-full max-w-sm"
            onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
            }}
        >
            <label htmlFor={`${listId}-input`} className="sr-only">
                {t('search.label')}
            </label>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
                ref={inputRef}
                id={`${listId}-input`}
                type="search"
                role="combobox"
                aria-expanded={expanded}
                aria-controls={`${listId}-panel`}
                aria-autocomplete="list"
                aria-haspopup="listbox"
                aria-activedescendant={expanded && showList && activeIndex >= 0 ? optionId(activeIndex) : undefined}
                value={q}
                autoComplete="off"
                placeholder={t('search.placeholder')}
                onChange={(e) => {
                    setQ(e.target.value);
                    setActiveIndex(-1);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        setOpen(false);
                        (e.target as HTMLInputElement).blur();
                    } else if (e.key === 'ArrowDown' && hits.length > 0) {
                        e.preventDefault();
                        setOpen(true);
                        setActiveIndex((i) => (i + 1) % hits.length);
                    } else if (e.key === 'ArrowUp' && hits.length > 0) {
                        e.preventDefault();
                        setOpen(true);
                        setActiveIndex((i) => (i <= 0 ? hits.length - 1 : i - 1));
                    } else if (e.key === 'Enter' && expanded && activeIndex >= 0) {
                        e.preventDefault();
                        choose(activeIndex);
                    }
                }}
                className="min-h-11 w-full rounded-lg border border-border bg-background py-1.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            />
            {/* Always mounted so assistive tech announces changes (a region that appears together with its content is often missed). */}
            <div role="status" aria-live="polite" className="sr-only">
                {expanded ? status : ''}
            </div>
            <div id={`${listId}-panel`} hidden={!expanded} className="absolute left-0 right-0 top-full z-40 mt-1 max-h-96 overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-lg">
                {showList ? (
                    <div role="listbox" aria-label={t('search.label')}>
                        {body}
                    </div>
                ) : (
                    body
                )}
            </div>
        </div>
    );
}
