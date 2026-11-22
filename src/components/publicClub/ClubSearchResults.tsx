'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CircleAlert, Compass, Flag, MapPin, SearchX, Sparkles, Type } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { type SearchViewState, MAX_HITS, initials } from '@/lib/clubSearch';
import { rememberClubSlug } from '@/lib/applicantStatus';
import { markJoinIntent } from '@/lib/joinIntent';
import { type ClubHit, MIN_CITY_LENGTH, MIN_SEARCH_LENGTH } from '@/lib/publicClub';
import { UI_BTN_PRIMARY, UI_BTN_SECONDARY } from '@/lib/uiClasses';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-text';

/** Logo exactly as the backend delivers it (unsigned `public_opt_in` URL); initials when there is none or it fails to load. */
function ClubLogo({ hit }: { hit: ClubHit }) {
    const [failed, setFailed] = useState(false);
    if (hit.logoUrl && !failed) {
        return (
            // eslint-disable-next-line @next/next/no-img-element -- URL delivered by the media layer, host varies per deployment
            <img src={hit.logoUrl} alt="" width={56} height={56} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-14 w-14 shrink-0 rounded-xl border border-hairline bg-card object-contain" />
        );
    }
    return (
        <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-lg font-semibold text-primary-soft-foreground">
            {initials(hit.name)}
        </span>
    );
}

function HitCard({ hit }: { hit: ClubHit }) {
    const { t } = useLanguage();
    return (
        <li className="rounded-2xl bg-card p-4 shadow-card sm:p-5">
            <div className="flex items-center gap-4">
                <ClubLogo hit={hit} />
                <div className="min-w-0 flex-1">
                    <h3 className="break-words text-base font-semibold leading-snug text-foreground sm:text-lg">{hit.name}</h3>
                    {hit.city && (
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin aria-hidden className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 break-words">{hit.city}</span>
                        </p>
                    )}
                </div>
            </div>
            <div className="mt-4 grid gap-2 sm:flex sm:justify-end">
                <Link href={`/v/${hit.slug}`} aria-label={t('cs.hit.page.aria', { name: hit.name })} className={`${UI_BTN_SECONDARY} ${FOCUS}`}>
                    {t('cs.hit.page')}
                </Link>
                {/* Joining only remembers the club code and opens the club page (sign-in first when logged out); nothing is submitted here. */}
                <Link
                    href="/verein"
                    aria-label={t('finder.hit.join.aria', { name: hit.name })}
                    onClick={() => {
                        rememberClubSlug(hit.slug);
                        markJoinIntent();
                    }}
                    className={`${UI_BTN_PRIMARY} ${FOCUS}`}
                >
                    {t('finder.hit.join')}
                </Link>
            </div>
        </li>
    );
}

function SkeletonCards() {
    return (
        <ul aria-hidden className="space-y-3">
            {[0, 1, 2].map((i) => (
                <li key={i} className="rounded-2xl bg-card p-4 shadow-card sm:p-5">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 shrink-0 animate-skeleton rounded-xl bg-muted" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-2/3 animate-skeleton rounded-md bg-muted" />
                            <div className="h-3 w-1/3 animate-skeleton rounded-md bg-muted" />
                        </div>
                    </div>
                    <div className="mt-4 flex gap-2 sm:justify-end">
                        <div className="h-11 flex-1 animate-skeleton rounded-lg bg-muted sm:w-44 sm:flex-none" />
                        <div className="h-11 flex-1 animate-skeleton rounded-lg bg-muted sm:w-32 sm:flex-none" />
                    </div>
                </li>
            ))}
        </ul>
    );
}

function Tips() {
    const { t } = useLanguage();
    const tips = [
        { icon: Type, title: t('cs.tip.name.title'), body: t('cs.tip.name.body', { min: MIN_SEARCH_LENGTH }) },
        { icon: MapPin, title: t('cs.tip.city.title'), body: t('cs.tip.city.body', { min: MIN_CITY_LENGTH }) },
        { icon: Sparkles, title: t('cs.tip.both.title'), body: t('cs.tip.both.body') },
    ];
    return (
        <section aria-labelledby="cs-tips-title">
            <h2 id="cs-tips-title" className="text-sm font-semibold text-foreground">
                {t('cs.idle.title')}
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                {tips.map(({ icon: Icon, title, body }) => (
                    <li key={title} className="rounded-2xl border border-hairline bg-card p-4">
                        <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                            <Icon className="h-[18px] w-[18px]" />
                        </span>
                        <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                    </li>
                ))}
            </ul>
        </section>
    );
}

function Empty() {
    const { t } = useLanguage();
    return (
        <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-8 text-center sm:px-8">
            <span aria-hidden className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <SearchX className="h-5 w-5" />
            </span>
            <h2 className="mt-3 text-base font-semibold text-foreground">{t('cs.empty.title')}</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{t('cs.empty.body')}</p>
            <div className="mx-auto mt-5 grid max-w-sm gap-2 sm:flex sm:max-w-none sm:justify-center">
                <Link href="/verein" onClick={() => markJoinIntent()} className={`${UI_BTN_SECONDARY} ${FOCUS}`}>
                    <Compass aria-hidden className="h-4 w-4" />
                    {t('cs.empty.code')}
                </Link>
                <Link href="/verein" className={`${UI_BTN_SECONDARY} ${FOCUS}`}>
                    <Flag aria-hidden className="h-4 w-4" />
                    {t('cs.empty.create')}
                </Link>
            </div>
        </div>
    );
}

/**
 * Results area of the club search page. Presentational: the page owns the request. Always renders one polite live region with the
 * result count (or the loading / error note), so screen readers hear every outcome once. "No result" and "failed" never say
 * whether a club exists but is not listed.
 */
export default function ClubSearchResults({ state, onRetry }: { state: SearchViewState; onRetry: () => void }) {
    const { t } = useLanguage();
    const hits = state.kind === 'ok' ? state.hits : [];
    const status =
        state.kind === 'loading'
            ? t('finder.searching')
            : state.kind === 'ok'
              ? hits.length === 0
                  ? t('cs.empty.title')
                  : hits.length === 1
                    ? t('cs.count.one')
                    : t('cs.count.other', { count: hits.length })
              : '';
    return (
        <div>
            <p aria-live="polite" aria-atomic className={state.kind === 'ok' && hits.length > 0 ? 'mb-3 text-sm font-medium text-foreground' : 'sr-only'}>
                {status}
            </p>
            {state.kind === 'idle' && <Tips />}
            {state.kind === 'tooShort' && <Tips />}
            {state.kind === 'loading' && <SkeletonCards />}
            {state.kind === 'ok' && hits.length === 0 && <Empty />}
            {state.kind === 'ok' && hits.length > 0 && (
                <>
                    <ul aria-label={t('finder.results')} className="space-y-3">
                        {hits.map((hit) => (
                            <HitCard key={hit.slug} hit={hit} />
                        ))}
                    </ul>
                    {hits.length >= MAX_HITS && <p className="mt-3 text-sm text-muted-foreground">{t('cs.count.max', { max: MAX_HITS })}</p>}
                </>
            )}
            {state.kind === 'error' && (
                <div role="alert" className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive-soft p-4 sm:p-5">
                    <CircleAlert aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-destructive" strokeWidth={1.5} />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-destructive">{t('cs.error.title')}</p>
                        <p className="mt-1 text-sm text-destructive">{state.rateLimited ? t('cs.error.rate') : t('cs.error.body')}</p>
                        <button type="button" onClick={onRetry} className={`mt-3 min-h-11 rounded-lg border border-control bg-card px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98] ${FOCUS}`}>
                            {t('cs.retry')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
