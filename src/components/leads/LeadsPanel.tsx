'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Inbox, Plus, Search } from 'lucide-react';

import LoadError from '@/components/LoadError';
import { Chip, formatDate } from '@/components/standorte/ui';
import { EmptyState, Skeleton } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { inputClass, primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import { UI_LABEL } from '@/lib/uiClasses';
import { LEAD_STATUSES, emptyFilters, leadErrorKey, leadsQuery, pageCount, statusTone, type Lead, type LeadFilters, type LeadPage, type WaitlistGroup } from '@/lib/leads';
import LeadDialog, { type LeadDialogResult } from './LeadDialog';

type View = 'requests' | 'waitlist';

/** One request as a card row; the whole row opens the dialog. */
function LeadRow({ lead, onOpen, extra }: { lead: Lead; onOpen: () => void; extra?: React.ReactNode }) {
    const { t, language } = useLanguage();
    return (
        <li>
            <article className="flex flex-wrap items-center gap-3 rounded-2xl bg-card p-4 shadow-card">
                <div className="min-w-0 flex-1">
                    <h4 className="break-words text-base font-bold text-foreground">{lead.name}</h4>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Chip tone={statusTone(lead.status)}>{t(`leads.status.${lead.status}`)}</Chip>
                        {lead.waitlisted && <Chip tone="muted">{t('leads.waitlisted')}</Chip>}
                        {lead.trialRequested && <Chip tone="primary">{t('leads.trialRequested')}</Chip>}
                        {lead.requestCount > 1 && <Chip tone="warning">{t('leads.requestCount', { count: lead.requestCount })}</Chip>}
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                        {[lead.department?.name, lead.trialOn ? t('leads.trialOn', { date: formatDate(lead.trialOn, language) }) : null, t('leads.received', { date: formatDate(lead.lastRequestAt ?? lead.createdAt, language) })].filter(Boolean).join(' · ')}
                    </p>
                    {lead.message && <p className="mt-1 line-clamp-2 break-words text-sm text-foreground">{lead.message}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                    {extra}
                    <button type="button" onClick={onOpen} aria-label={`${t('leads.open')}: ${lead.name}`} className={secondaryButtonClass}>
                        {t('leads.open')}
                    </button>
                </div>
            </article>
        </li>
    );
}

/**
 * Prospect pipeline (Wave 15 W3), tab `interessenten` with `leads:write`: requests from the public club page and manual entries,
 * status, notes, conversion to a member record, and waitlists per department.
 */
export default function LeadsPanel({ clubId, departments }: { clubId: string; departments: { id: string; name: string }[] }) {
    const { t } = useLanguage();
    const [view, setView] = useState<View>('requests');
    const [filters, setFilters] = useState<LeadFilters>(emptyFilters);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState<LeadPage | null>(null);
    const [waitlist, setWaitlist] = useState<WaitlistGroup[] | null>(null);
    const [error, setError] = useState<unknown>(null);
    const [dialog, setDialog] = useState<{ lead: Lead | null } | null>(null);
    const [notice, setNotice] = useState<{ tone: 'ok' | 'warn'; text: string; link?: boolean } | null>(null);
    const seq = useRef(0);

    // Search is applied after a short pause, not per keystroke.
    useEffect(() => {
        const id = setTimeout(() => setFilters((f) => (f.q === search ? f : { ...f, q: search, page: 1 })), 300);
        return () => clearTimeout(id);
    }, [search]);

    const load = useCallback(async () => {
        const mine = ++seq.current;
        try {
            if (view === 'requests') {
                const res = await apiFetch<LeadPage>(`/club-leads?${leadsQuery(clubId, filters)}`);
                if (mine !== seq.current) return;
                // The last request of a later page was handled: step back instead of showing an empty page.
                if (res.data.length === 0 && filters.page > 1) {
                    setFilters((f) => ({ ...f, page: Math.max(1, Math.min(f.page - 1, pageCount(res.total))) }));
                    return;
                }
                setPage(res);
            } else {
                const res = await apiFetch<{ data: WaitlistGroup[] }>(`/club-leads/waitlist?clubId=${encodeURIComponent(clubId)}`);
                if (mine !== seq.current) return;
                setWaitlist(res.data);
            }
            setError(null);
        } catch (err) {
            if (mine === seq.current) setError(err);
        }
    }, [clubId, filters, view]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    function onDone(result: LeadDialogResult) {
        setDialog(null);
        if (result.kind === 'converted') setNotice({ tone: 'ok', text: t('leads.done.converted'), link: true });
        else setNotice({ tone: 'ok', text: t(`leads.done.${result.kind}`) });
        void load();
    }

    async function leaveWaitlist(lead: Lead) {
        try {
            await apiFetch(`/club-leads/${lead.id}?clubId=${encodeURIComponent(clubId)}`, { method: 'PATCH', body: { waitlisted: false } });
            setNotice({ tone: 'ok', text: t('leads.done.saved') });
            void load();
        } catch (err) {
            setNotice({ tone: 'warn', text: t(leadErrorKey(err)) });
        }
    }

    const filtered = filters.status !== '' || filters.departmentId !== '' || filters.q !== '';
    const loaded = view === 'requests' ? page : waitlist;

    return (
        <div className="space-y-6">
            <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-primary-soft p-5 sm:p-6">
                <div className="flex min-w-0 max-w-2xl items-start gap-3">
                    <span aria-hidden="true" className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-primary-text">
                        <Inbox className="h-5 w-5" strokeWidth={1.5} />
                    </span>
                    <div>
                        <h2 className="text-xl font-bold text-primary-soft-foreground">{t('leads.title')}</h2>
                        <p className="mt-1 text-sm text-primary-soft-foreground">{t('leads.intro')}</p>
                    </div>
                </div>
                <button type="button" onClick={() => setDialog({ lead: null })} className={primaryButtonClass}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {t('leads.add')}
                </button>
            </header>

            {notice && (
                <p role={notice.tone === 'warn' ? 'alert' : 'status'} className={`rounded-xl p-3 text-sm ${notice.tone === 'warn' ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'}`}>
                    {notice.text}{' '}
                    {notice.link && (
                        <Link href="/verein?tab=mitglieder" className="font-medium underline">
                            {t('leads.converted.link')}
                        </Link>
                    )}
                </p>
            )}

            <div role="group" aria-label={t('leads.view.label')} className="flex flex-wrap gap-2">
                {(['requests', 'waitlist'] as const).map((v) => (
                    <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-text ${view === v ? 'bg-primary text-primary-foreground' : 'border border-control bg-card text-foreground hover:bg-muted'}`}>
                        {t(`leads.view.${v}`)}
                    </button>
                ))}
            </div>

            {view === 'requests' && (
                <section aria-label={t('leads.filter.label')} className="space-y-3">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-48 flex-1 sm:max-w-xs">
                            <label htmlFor="leads-search" className={UI_LABEL}>
                                {t('leads.search')}
                            </label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                <input id="leads-search" type="search" value={search} placeholder={t('leads.search.placeholder')} onChange={(e) => setSearch(e.target.value)} className={`${inputClass} pl-9`} />
                            </div>
                        </div>
                        {departments.length > 0 && (
                            <div className="min-w-44">
                                <label htmlFor="leads-dept" className={UI_LABEL}>
                                    {t('leads.form.department')}
                                </label>
                                <select id="leads-dept" value={filters.departmentId} onChange={(e) => setFilters((f) => ({ ...f, departmentId: e.target.value, page: 1 }))} className={inputClass}>
                                    <option value="">{t('leads.filter.department.all')}</option>
                                    {departments.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                    <div role="group" aria-label={t('leads.filter.status')} className="flex flex-wrap gap-2">
                        {(['', ...LEAD_STATUSES] as const).map((s) => (
                            <button
                                key={s || 'all'}
                                type="button"
                                aria-pressed={filters.status === s}
                                onClick={() => setFilters((f) => ({ ...f, status: s, page: 1 }))}
                                className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-text ${filters.status === s ? 'bg-primary text-primary-foreground' : 'border border-control bg-card text-foreground hover:bg-muted'}`}
                            >
                                {s === '' ? t('leads.filter.all') : t(`leads.status.${s}`)}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {error !== null && !loaded ? (
                <LoadError error={error} onRetry={() => void load()} />
            ) : !loaded ? (
                <Skeleton lines={4} />
            ) : view === 'requests' && page ? (
                <>
                    {error !== null && <LoadError error={error} onRetry={() => void load()} />}
                    {page.data.length === 0 ? (
                        <EmptyState
                            title={t(filtered ? 'leads.empty.filtered' : 'leads.empty.title')}
                            hint={filtered ? undefined : t('leads.empty.hint')}
                            action={
                                filtered ? (
                                    <button type="button" onClick={() => { setSearch(''); setFilters(emptyFilters()); }} className={secondaryButtonClass}>
                                        {t('leads.filter.reset')}
                                    </button>
                                ) : (
                                    <button type="button" onClick={() => setDialog({ lead: null })} className={primaryButtonClass}>
                                        <Plus className="h-4 w-4" aria-hidden="true" />
                                        {t('leads.add')}
                                    </button>
                                )
                            }
                        />
                    ) : (
                        <>
                            <p role="status" className="text-xs text-muted-foreground">
                                {t('leads.count', { count: page.total })}
                            </p>
                            <ul className="space-y-3">
                                {page.data.map((l) => (
                                    <LeadRow key={l.id} lead={l} onOpen={() => setDialog({ lead: l })} />
                                ))}
                            </ul>
                            {page.total > page.pageSize && (
                                <nav aria-label={t('leads.pagination')} className="flex items-center justify-between gap-3">
                                    <button type="button" disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))} className={secondaryButtonClass}>
                                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                        {t('leads.pagination.prev')}
                                    </button>
                                    <span className="text-sm text-muted-foreground">{t('leads.pagination.of', { page: filters.page, pages: pageCount(page.total) })}</span>
                                    <button type="button" disabled={filters.page >= pageCount(page.total)} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))} className={secondaryButtonClass}>
                                        {t('leads.pagination.next')}
                                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                </nav>
                            )}
                        </>
                    )}
                </>
            ) : waitlist ? (
                <>
                    {error !== null && <LoadError error={error} onRetry={() => void load()} />}
                    <p className="text-sm text-muted-foreground">{t('leads.waitlist.intro')}</p>
                    {waitlist.length === 0 ? (
                        <EmptyState title={t('leads.waitlist.empty.title')} hint={t('leads.waitlist.empty.hint')} />
                    ) : (
                        waitlist.map((g) => (
                            <section key={g.department?.id ?? 'none'} aria-labelledby={`wl-${g.department?.id ?? 'none'}`} className="space-y-3">
                                <h3 id={`wl-${g.department?.id ?? 'none'}`} className="text-base font-bold text-foreground">
                                    {g.department?.name ?? t('leads.waitlist.noDepartment')} <span className="text-sm font-normal text-muted-foreground">({g.leads.length})</span>
                                </h3>
                                <ol className="space-y-3">
                                    {g.leads.map((l) => (
                                        <LeadRow
                                            key={l.id}
                                            lead={l}
                                            onOpen={() => setDialog({ lead: l })}
                                            extra={
                                                <>
                                                    <span className="inline-flex min-h-11 items-center rounded-lg bg-muted px-3 text-sm font-bold text-foreground">{t('leads.waitlist.position', { n: l.position })}</span>
                                                    <button type="button" onClick={() => void leaveWaitlist(l)} aria-label={`${t('leads.waitlist.leave')}: ${l.name}`} className={secondaryButtonClass}>
                                                        {t('leads.waitlist.leave')}
                                                    </button>
                                                </>
                                            }
                                        />
                                    ))}
                                </ol>
                            </section>
                        ))
                    )}
                </>
            ) : null}

            {dialog && <LeadDialog key={dialog.lead?.id ?? 'new'} clubId={clubId} lead={dialog.lead} departments={departments} onClose={() => setDialog(null)} onDone={onDone} />}
        </div>
    );
}
