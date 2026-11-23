'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarClock, Handshake, Plus, Search } from 'lucide-react';

import LoadError from '@/components/LoadError';
import { EmptyState, Skeleton } from '@/components/ui';
import { Chip, formatDate, type Tone } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { inputClass, primaryButtonClass } from '@/lib/clubMembers';
import { UI_LABEL } from '@/lib/uiClasses';
import { SPONSOR_FILTERS, expiringSponsors, filterCounts, filterSponsors, type Sponsor, type SponsorFilter, type SponsorStatus } from '@/lib/sponsors';
import SponsorFormDialog, { type SponsorSaveResult } from './SponsorFormDialog';

const STATUS_TONE: Record<SponsorStatus, Tone> = { aktiv: 'success', geplant: 'primary', abgelaufen: 'muted' };

/** Logo or a neutral initial: the logo URL is a short-lived signed URL; a failed load asks for a fresh list once. */
function SponsorLogo({ sponsor, onExpired }: { sponsor: Sponsor; onExpired: () => void }) {
    const { t } = useLanguage();
    return (
        <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white p-1.5">
            {sponsor.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL from the media layer
                <img src={sponsor.logoUrl} alt={t('sponsors.logo.alt', { name: sponsor.name })} loading="lazy" onError={onExpired} className="max-h-full max-w-full object-contain" />
            ) : (
                <span aria-hidden="true" className="text-2xl font-bold text-neutral-400">
                    {sponsor.name.trim().charAt(0).toUpperCase()}
                </span>
            )}
        </div>
    );
}

function daysLeftText(s: Sponsor, t: (key: string, p?: Record<string, string | number>) => string): string | null {
    if (s.daysLeft === null) return null;
    if (s.daysLeft <= 0) return t('sponsors.daysLeft.today');
    return s.daysLeft === 1 ? t('sponsors.daysLeft.one') : t('sponsors.daysLeft.many', { count: s.daysLeft });
}

/**
 * Sponsors and partners of the club (Wave 15 W1). The tab is shown with `sponsors:read`; creating, editing, the logo and
 * deleting need `sponsors:write` (the backend enforces both again). Overview "runs out soon" on top, then the filterable list.
 */
export default function SponsorsPanel({ clubId, canWrite }: { clubId: string; canWrite: boolean }) {
    const { t, language } = useLanguage();
    const [sponsors, setSponsors] = useState<Sponsor[] | null>(null);
    const [loadError, setLoadError] = useState<unknown>(null);
    const [filter, setFilter] = useState<SponsorFilter>('all');
    const [query, setQuery] = useState('');
    const [dialog, setDialog] = useState<{ sponsor: Sponsor | null } | null>(null);
    const [notice, setNotice] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
    const retriedLogos = useRef(false);

    const load = useCallback(async () => {
        try {
            const res = await apiFetch<{ data: Sponsor[] }>(`/sponsors?clubId=${encodeURIComponent(clubId)}`);
            setSponsors(res.data);
            setLoadError(null);
            retriedLogos.current = false;
        } catch (err) {
            setLoadError(err);
        }
    }, [clubId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    // A signed logo URL may have expired while the page was open: refetch once, then stop (no loop on a broken image).
    const onLogoExpired = useCallback(() => {
        if (retriedLogos.current) return;
        retriedLogos.current = true;
        void load();
    }, [load]);

    function onDone(result: SponsorSaveResult) {
        setDialog(null);
        if (result.kind === 'partial') setNotice({ tone: 'warn', text: t('sponsors.done.partial', { error: t(result.errorKey) }) });
        else setNotice({ tone: 'ok', text: t(`sponsors.done.${result.kind}`) });
        void load();
    }

    if (loadError && !sponsors) return <LoadError error={loadError} onRetry={() => void load()} />;
    if (!sponsors) return <Skeleton lines={4} />;

    const expiring = expiringSponsors(sponsors);
    const counts = filterCounts(sponsors);
    const shown = filterSponsors(sponsors, filter, query);

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-primary-soft p-5 sm:p-6">
                <div className="flex min-w-0 max-w-2xl items-start gap-3">
                    <span aria-hidden="true" className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-primary-text">
                        <Handshake className="h-5 w-5" strokeWidth={1.5} />
                    </span>
                    <div>
                        <h2 className="text-xl font-bold text-primary-soft-foreground">{t('sponsors.title')}</h2>
                        <p className="mt-1 text-sm text-primary-soft-foreground">{t('sponsors.intro')}</p>
                        {!canWrite && <p className="mt-2 text-sm font-medium text-primary-soft-foreground">{t('sponsors.readOnly')}</p>}
                    </div>
                </div>
                {canWrite && (
                    <button type="button" onClick={() => setDialog({ sponsor: null })} className={primaryButtonClass}>
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        {t('sponsors.add')}
                    </button>
                )}
            </header>

            {notice && (
                <p role={notice.tone === 'warn' ? 'alert' : 'status'} className={`rounded-xl p-3 text-sm ${notice.tone === 'warn' ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'}`}>
                    {notice.text}
                </p>
            )}
            {loadError !== null && <LoadError error={loadError} onRetry={() => void load()} />}

            {sponsors.length === 0 ? (
                <EmptyState
                    title={t('sponsors.empty.title')}
                    hint={t('sponsors.empty.hint')}
                    action={
                        canWrite ? (
                            <button type="button" onClick={() => setDialog({ sponsor: null })} className={primaryButtonClass}>
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                {t('sponsors.add')}
                            </button>
                        ) : undefined
                    }
                />
            ) : (
                <>
                    <section aria-labelledby="sponsors-expiring" className="rounded-2xl bg-card p-4 shadow-card sm:p-5">
                        <div className="flex items-center gap-2">
                            <CalendarClock className="h-5 w-5 text-warning" aria-hidden="true" strokeWidth={1.5} />
                            <h3 id="sponsors-expiring" className="text-base font-bold text-foreground">
                                {t('sponsors.expiring.title')}
                            </h3>
                        </div>
                        {expiring.length === 0 ? (
                            <p className="mt-2 text-sm text-muted-foreground">{t('sponsors.expiring.none')}</p>
                        ) : (
                            <>
                                <p className="mt-1 text-sm text-muted-foreground">{t('sponsors.expiring.hint')}</p>
                                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {expiring.map((s) => (
                                        <li key={s.id}>
                                            <button type="button" onClick={() => setDialog({ sponsor: s })} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-warning-soft px-3 py-2 text-left text-sm transition-colors hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-text">
                                                <span className="min-w-0 truncate font-medium text-foreground">{s.name}</span>
                                                <span className="shrink-0 text-xs font-semibold text-warning">{daysLeftText(s, t)}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </section>

                    <section aria-label={t('sponsors.filter.label')} className="space-y-3">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="min-w-48 flex-1 sm:max-w-xs">
                                <label htmlFor="sponsors-search" className={UI_LABEL}>
                                    {t('sponsors.search')}
                                </label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                    <input id="sponsors-search" type="search" value={query} placeholder={t('sponsors.search.placeholder')} onChange={(e) => setQuery(e.target.value)} className={`${inputClass} pl-9`} />
                                </div>
                            </div>
                            <div role="group" aria-label={t('sponsors.filter.label')} className="flex flex-wrap gap-2">
                                {SPONSOR_FILTERS.map((f) => (
                                    <button
                                        key={f}
                                        type="button"
                                        aria-pressed={filter === f}
                                        onClick={() => setFilter(f)}
                                        className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-text ${filter === f ? 'bg-primary text-primary-foreground' : 'border border-control bg-card text-foreground hover:bg-muted'}`}
                                    >
                                        {t(`sponsors.filter.${f}`)}
                                        <span className="text-xs opacity-80">{counts[f]}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground" role="status">
                            {t('sponsors.count', { count: shown.length, total: sponsors.length })}
                        </p>

                        {shown.length === 0 ? (
                            <EmptyState title={t('sponsors.empty.filtered')} />
                        ) : (
                            <ul className="grid gap-3 md:grid-cols-2">
                                {shown.map((s) => {
                                    const primary = s.contacts.find((c) => c.isPrimary) ?? s.contacts[0];
                                    const left = s.expiringSoon ? daysLeftText(s, t) : null;
                                    const period = s.startsOn && s.endsOn ? t('sponsors.period', { from: formatDate(s.startsOn, language), to: formatDate(s.endsOn, language) }) : s.startsOn ? t('sponsors.period.from', { from: formatDate(s.startsOn, language) }) : s.endsOn ? t('sponsors.period.until', { to: formatDate(s.endsOn, language) }) : t('sponsors.period.open');
                                    return (
                                        <li key={s.id}>
                                            <article className="flex h-full flex-col gap-3 rounded-2xl bg-card p-4 shadow-card">
                                                <div className="flex items-start gap-3">
                                                    <SponsorLogo sponsor={s} onExpired={onLogoExpired} />
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="break-words text-base font-bold text-foreground">{s.name}</h4>
                                                        <div className="mt-1 flex flex-wrap gap-1.5">
                                                            <Chip tone={STATUS_TONE[s.status]}>{t(`sponsors.status.${s.status}`)}</Chip>
                                                            {left && <Chip tone="warning">{left}</Chip>}
                                                            <Chip tone="muted">{t(`sponsors.visibility.${s.visibility}`)}</Chip>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-muted-foreground">{period}</p>
                                                {s.consideration && (
                                                    <p className="line-clamp-3 text-sm text-foreground">
                                                        <span className="font-medium">{t('sponsors.consideration')}: </span>
                                                        {s.consideration}
                                                    </p>
                                                )}
                                                {primary && (
                                                    <p className="text-sm text-muted-foreground">
                                                        <span className="sr-only">{t('sponsors.contact.primary')}: </span>
                                                        {primary.name}
                                                        {primary.role ? `, ${primary.role}` : ''}
                                                    </p>
                                                )}
                                                {s.linkedAccount && <p className="text-xs text-muted-foreground">{t('sponsors.linked', { name: s.linkedAccount.name })}</p>}
                                                <div className="mt-auto pt-1">
                                                    <button type="button" onClick={() => setDialog({ sponsor: s })} aria-label={`${t(canWrite ? 'sponsors.form.title.edit' : 'sponsors.open')}: ${s.name}`} className="inline-flex min-h-11 items-center rounded-lg border border-control bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-text">
                                                        {t(canWrite ? 'sponsors.form.title.edit' : 'sponsors.open')}
                                                    </button>
                                                </div>
                                            </article>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                </>
            )}

            {dialog && <SponsorFormDialog key={dialog.sponsor?.id ?? 'new'} clubId={clubId} sponsor={dialog.sponsor} canWrite={canWrite} onClose={() => setDialog(null)} onDone={onDone} />}
        </div>
    );
}
