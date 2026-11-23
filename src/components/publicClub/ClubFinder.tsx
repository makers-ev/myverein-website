'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { Search } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { rememberClubSlug } from '@/lib/applicantStatus';
import { markJoinIntent } from '@/lib/joinIntent';
import { type ClubHit, isSearchable, MIN_SEARCH_LENGTH, searchClubs } from '@/lib/publicClub';
import { UI_BTN_PRIMARY, UI_BTN_SECONDARY, UI_INPUT, UI_LABEL } from '@/lib/uiClasses';

const DEBOUNCE_MS = 400;

type State = { kind: 'idle' } | { kind: 'loading' } | { kind: 'ok'; hits: ClubHit[] } | { kind: 'error' };

/**
 * "Verein finden" (Wave 15 W4): searches only clubs that opted in to being discoverable. Starts at a minimum length (typing is
 * debounced, an older request is aborted), shows name / place / logo only. "No result" and "failed" never say whether a club exists
 * but is hidden. A hit leads into the normal joining flow: with `onPick` (club page, no-club state) the code is handed over, without it
 * (home page) the code is remembered and the person goes to `/verein` (which asks for sign-in first).
 */
export default function ClubFinder({ onPick, heading = 'h2' }: { onPick?: (slug: string) => void; heading?: 'h2' | 'h3' }) {
    const { t } = useLanguage();
    const id = useId();
    const [q, setQ] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState<State>({ kind: 'idle' });
    const seq = useRef(0);

    useEffect(() => {
        const mySeq = ++seq.current;
        if (!isSearchable(q, city)) {
            // Below the minimum length nothing is sent; the pending request of the previous input is dropped.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setState({ kind: 'idle' });
            return;
        }
        const controller = new AbortController();
        const timer = setTimeout(() => {
            setState({ kind: 'loading' });
            void searchClubs(q, city, controller.signal).then((r) => {
                if (mySeq !== seq.current) return;
                setState(r.kind === 'ok' ? { kind: 'ok', hits: r.hits } : r.kind === 'tooShort' ? { kind: 'idle' } : { kind: 'error' });
            });
        }, DEBOUNCE_MS);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [q, city]);

    const Heading = heading;
    return (
        <section aria-labelledby={`${id}-title`} className="rounded-xl bg-card p-5 shadow-card">
            <Heading id={`${id}-title`} className="text-base font-semibold text-foreground">
                {t('finder.title')}
            </Heading>
            <p className="mt-1 text-sm text-muted-foreground">{t('finder.intro')}</p>
            <form role="search" onSubmit={(e) => e.preventDefault()} className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                    <label htmlFor={`${id}-q`} className={UI_LABEL}>
                        {t('finder.q')}
                    </label>
                    <div className="relative">
                        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input id={`${id}-q`} type="search" value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} autoComplete="off" aria-describedby={`${id}-hint`} className={`${UI_INPUT} pl-9`} />
                    </div>
                    <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">
                        {t('finder.q.hint', { min: MIN_SEARCH_LENGTH })}
                    </p>
                </div>
                <div>
                    <label htmlFor={`${id}-city`} className={UI_LABEL}>
                        {t('finder.city')}
                    </label>
                    <input id={`${id}-city`} type="text" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} autoComplete="off" className={UI_INPUT} />
                </div>
            </form>

            <div aria-live="polite" className="mt-4">
                {state.kind === 'loading' && <p className="text-sm text-muted-foreground">{t('finder.searching')}</p>}
                {state.kind === 'error' && (
                    <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive">
                        {t('finder.error')}
                    </p>
                )}
                {state.kind === 'ok' && state.hits.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border px-4 py-5 text-center">
                        <p className="font-medium text-foreground">{t('finder.empty.title')}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{t('finder.empty.body')}</p>
                    </div>
                )}
                {state.kind === 'ok' && state.hits.length > 0 && (
                    <ul aria-label={t('finder.results')} className="divide-y divide-hairline">
                        {state.hits.map((hit) => (
                            <li key={hit.slug} className="flex flex-wrap items-center gap-3 py-3">
                                {hit.logoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element -- URL delivered by the media layer, host varies per deployment
                                    <img src={hit.logoUrl} alt="" width={40} height={40} loading="lazy" referrerPolicy="no-referrer" className="h-10 w-10 shrink-0 rounded-lg border border-hairline bg-card object-contain" />
                                ) : (
                                    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-sm font-semibold text-primary-text">
                                        {hit.name.charAt(0).toUpperCase()}
                                    </span>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium text-foreground">{hit.name}</p>
                                    {hit.city && <p className="truncate text-sm text-muted-foreground">{t('finder.hit.city', { city: hit.city })}</p>}
                                </div>
                                <div className="flex gap-2">
                                    <Link href={`/v/${hit.slug}`} aria-label={t('finder.hit.page.aria', { name: hit.name })} className={UI_BTN_SECONDARY}>
                                        {t('finder.hit.page')}
                                    </Link>
                                    {onPick ? (
                                        <button type="button" aria-label={t('finder.hit.join.aria', { name: hit.name })} onClick={() => onPick(hit.slug)} className={UI_BTN_PRIMARY}>
                                            {t('finder.hit.join')}
                                        </button>
                                    ) : (
                                        <Link href="/verein" aria-label={t('finder.hit.join.aria', { name: hit.name })} onClick={() => {
                                                rememberClubSlug(hit.slug);
                                                markJoinIntent();
                                            }} className={UI_BTN_PRIMARY}>
                                            {t('finder.hit.join')}
                                        </Link>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
