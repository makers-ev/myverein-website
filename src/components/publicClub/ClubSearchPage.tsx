'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { ExternalLink, MapPin, Search, Users } from 'lucide-react';

import ClubSearchResults from '@/components/publicClub/ClubSearchResults';
import { useLanguage } from '@/contexts/LanguageContext';
import { MAX_FIELD_LENGTH, type SearchQuery, type SearchViewState, missingCityChars, missingNameChars, parseQuery, queryToSearch, quietState, sameQuery } from '@/lib/clubSearch';
import { docsTopicUrl } from '@/lib/docs';
import { MIN_CITY_LENGTH, MIN_SEARCH_LENGTH, isSearchable, searchClubs } from '@/lib/publicClub';
import { UI_BTN_PRIMARY, UI_BTN_SECONDARY, UI_INPUT, UI_LABEL } from '@/lib/uiClasses';

const DEBOUNCE_MS = 350;
const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-text';

/**
 * Public club search `/vereinssuche`. The URL (`?q=&ort=`) is the shareable state: typing updates it with `replace` after a pause,
 * Enter / "Suchen" adds a history entry, and Back / Forward re-read it. Every change aborts the request still in flight.
 * Only clubs that released themselves as findable are returned (backend); the page never reveals whether a hidden club exists.
 */
export default function ClubSearchPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const id = useId();

    const urlQuery = useMemo(() => parseQuery(params), [params]);
    const [q, setQ] = useState(urlQuery.q);
    const [city, setCity] = useState(urlQuery.city);
    const [committed, setCommitted] = useState<SearchQuery>(urlQuery);
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState<SearchViewState>(() => quietState(urlQuery));
    const written = useRef<SearchQuery>(urlQuery);

    function commit(next: SearchQuery, mode: 'push' | 'replace') {
        if (sameQuery(next, committed)) return false;
        written.current = next;
        setCommitted(next);
        const url = `${pathname}${queryToSearch(next)}`;
        if (mode === 'push') router.push(url, { scroll: false });
        else router.replace(url, { scroll: false });
        return true;
    }

    // Back / Forward (or a link with other parameters): the URL changed by something other than this page, so adopt it.
    useEffect(() => {
        if (sameQuery(urlQuery, written.current)) return;
        written.current = urlQuery;
        setQ(urlQuery.q);
        setCity(urlQuery.city);
        setCommitted(urlQuery);
    }, [urlQuery]);

    // Debounced typing: commit (replace) once the person pauses.
    useEffect(() => {
        const timer = setTimeout(() => {
            const next = { q, city };
            if (!sameQuery(next, committed)) {
                written.current = next;
                setCommitted(next);
                router.replace(`${pathname}${queryToSearch(next)}`, { scroll: false });
            }
        }, DEBOUNCE_MS);
        return () => clearTimeout(timer);
        // `committed`, `pathname` and `router` are deliberately read at fire time; only typing restarts the timer.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, city]);

    // The request for the committed query; a newer query or unmount aborts the one in flight.
    useEffect(() => {
        if (!isSearchable(committed.q, committed.city)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setResult(quietState(committed));
            return;
        }
        const controller = new AbortController();
        setResult({ kind: 'loading' });
        void searchClubs(committed.q, committed.city, controller.signal).then((r) => {
            if (controller.signal.aborted) return;
            setResult(r.kind === 'ok' ? { kind: 'ok', hits: r.hits } : r.kind === 'tooShort' ? quietState({ q: '', city: '' }) : { kind: 'error', rateLimited: r.kind === 'rateLimited' });
        });
        return () => controller.abort();
    }, [committed, attempt]);

    function onSubmit(e: FormEvent) {
        e.preventDefault();
        const next = { q, city };
        // Same query again (e.g. after an error): run it once more instead of ignoring the Enter key.
        if (!commit(next, 'push')) setAttempt((n) => n + 1);
    }

    const nameMissing = missingNameChars(q);
    const cityMissing = missingCityChars(city);

    return (
        <>
            <section className="border-b border-hairline bg-primary-soft/60">
                <div className="mx-auto max-w-3xl px-4 pb-10 pt-12 sm:px-6 sm:pb-14 sm:pt-16">
                    <p className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-semibold text-primary-text shadow-card">
                        <Users aria-hidden className="h-3.5 w-3.5" />
                        {t('cs.eyebrow')}
                    </p>
                    <h1 className="mt-4 font-display text-4xl leading-[1.08] text-foreground sm:text-5xl">{t('cs.title')}</h1>
                    <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">{t('cs.intro')}</p>

                    <form role="search" aria-label={t('cs.form.label')} onSubmit={onSubmit} className="mt-8 rounded-2xl bg-card p-4 shadow-card sm:p-5">
                        <div className="grid gap-4 sm:grid-cols-[3fr_2fr]">
                            <div>
                                <label htmlFor={`${id}-q`} className={UI_LABEL}>
                                    {t('cs.q.label')}
                                </label>
                                <div className="relative">
                                    <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input id={`${id}-q`} type="search" enterKeyHint="search" value={q} onChange={(e) => setQ(e.target.value)} maxLength={MAX_FIELD_LENGTH} autoComplete="off" autoCapitalize="words" spellCheck={false} placeholder={t('cs.q.placeholder')} aria-describedby={`${id}-hint`} className={`${UI_INPUT} pl-9`} />
                                </div>
                            </div>
                            <div>
                                <label htmlFor={`${id}-city`} className={UI_LABEL}>
                                    {t('cs.city.label')}
                                </label>
                                <div className="relative">
                                    <MapPin aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input id={`${id}-city`} type="search" enterKeyHint="search" value={city} onChange={(e) => setCity(e.target.value)} maxLength={MAX_FIELD_LENGTH} autoComplete="off" autoCapitalize="words" spellCheck={false} placeholder={t('cs.city.placeholder')} aria-describedby={`${id}-hint`} className={`${UI_INPUT} pl-9`} />
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p id={`${id}-hint`} className="text-xs text-muted-foreground">
                                {nameMissing > 0 ? t('cs.q.short', { n: nameMissing }) : cityMissing > 0 ? t('cs.city.short', { n: cityMissing }) : t('cs.form.hint', { minName: MIN_SEARCH_LENGTH, minCity: MIN_CITY_LENGTH })}
                            </p>
                            <button type="submit" className={`${UI_BTN_PRIMARY} ${FOCUS} sm:min-w-32`}>
                                <Search aria-hidden className="h-4 w-4" />
                                {t('cs.submit')}
                            </button>
                        </div>
                    </form>
                </div>
            </section>

            <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
                <ClubSearchResults state={result} onRetry={() => setAttempt((n) => n + 1)} />

                <div className="mt-12 grid gap-4 border-t border-hairline pt-8 sm:grid-cols-2">
                    <section aria-labelledby={`${id}-board`} className="rounded-2xl bg-card p-5 shadow-card">
                        <h2 id={`${id}-board`} className="text-base font-semibold text-foreground">
                            {t('cs.board.title')}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">{t('cs.board.body')}</p>
                        <a href={docsTopicUrl('setup')} target="_blank" rel="noopener noreferrer" className={`${UI_BTN_SECONDARY} ${FOCUS} mt-4 w-full sm:w-auto`}>
                            {t('cs.board.link')}
                            <ExternalLink aria-hidden className="h-4 w-4" />
                            <span className="sr-only">{t('cs.newtab')}</span>
                        </a>
                    </section>
                    <section aria-labelledby={`${id}-create`} className="rounded-2xl bg-card p-5 shadow-card">
                        <h2 id={`${id}-create`} className="text-base font-semibold text-foreground">
                            {t('cs.create.title')}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">{t('cs.create.body')}</p>
                        <Link href="/verein" className={`${UI_BTN_SECONDARY} ${FOCUS} mt-4 w-full sm:w-auto`}>
                            {t('cs.create.link')}
                        </Link>
                    </section>
                </div>
            </div>
        </>
    );
}
