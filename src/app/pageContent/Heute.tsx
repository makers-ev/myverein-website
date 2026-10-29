'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { apiFetch } from '@/lib/api-client';
import { dateLocale } from '@/lib/clubMembers';
import { boardTodos, hasOpenItems, isOverdue, SETUP_STEPS, todayPath, type TodayData } from '@/lib/today';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActiveClub } from '@/components/shell/ActiveClubProvider';
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui';

const linkCls = 'inline-flex min-h-11 items-center rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary';

function Card({ title, badge, href, linkLabel, children }: { title: string; badge?: ReactNode; href: string; linkLabel: string; children?: ReactNode }) {
    return (
        <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-foreground">{title}</h2>
                {badge}
            </div>
            {children && <div className="mt-2 text-sm text-foreground">{children}</div>}
            <Link href={href} className={`${linkCls} mt-3`}>
                {linkLabel}
            </Link>
        </section>
    );
}

/** `/heute`: what needs the member today (open RSVPs, cancellations, unread notices, due returns, votes); board to-dos and the founder's setup list only when the backend sends them. */
export default function HeutePageContent() {
    const { t, language } = useLanguage();
    const router = useRouter();
    const { clubs, failed, hasWards, activeClub, reload } = useActiveClub();
    const [data, setData] = useState<TodayData | null>(null);
    const [error, setError] = useState<unknown>(null);
    const clubId = activeClub?.clubId ?? null;

    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!clubId) return;
        let cancelled = false;
        apiFetch<{ data: TodayData }>(todayPath(clubId))
            .then((r) => {
                if (cancelled) return;
                setData(r.data);
                setError(null);
            })
            .catch((e: unknown) => {
                if (!cancelled) setError(e);
            });
        return () => {
            cancelled = true;
        };
    }, [clubId, attempt]);

    const retry = () => {
        setError(null);
        setAttempt((n) => n + 1);
    };

    // A guardian-only account has no club overview: its area is /familie.
    useEffect(() => {
        if (clubs && clubs.length === 0 && hasWards) router.replace('/familie');
    }, [clubs, hasWards, router]);

    const when = (iso: string) => new Date(iso).toLocaleString(dateLocale(language), { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const day = (iso: string) => new Date(iso).toLocaleDateString(dateLocale(language), { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit' });

    let body: ReactNode;
    if (failed) body = <ErrorState onRetry={reload} />;
    else if (clubs === null) body = <Skeleton lines={5} />;
    // A guardian-only account is on its way to /familie: no "no club" flash.
    else if (clubs.length === 0 && hasWards) body = <Skeleton lines={5} />;
    else if (clubs.length === 0) {
        body = <EmptyState title={t('today.noClub.title')} hint={t('today.noClub.hint')} action={<Link href="/verein" className={linkCls}>{t('today.noClub.action')}</Link>} />;
    } else if (error) body = <ErrorState error={error} onRetry={retry} />;
    else if (!data) body = <Skeleton lines={5} />;
    else {
        const todos = boardTodos(data);
        const setup = data.setup;
        const setupTotal = setup ? setup.done.length + setup.open.length : 0;
        body = (
            <div className="space-y-4">
                {setup && setup.open.length > 0 && (
                    <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                        <h2 className="text-sm font-bold text-foreground">{t('today.setup.title')}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{t('today.setup.progress', { done: setup.done.length, total: setupTotal })}</p>
                        <ul className="mt-3 space-y-1">
                            {SETUP_STEPS.filter((s) => setup.open.includes(s.key) || setup.done.includes(s.key)).map((s) => {
                                const done = setup.done.includes(s.key);
                                return (
                                    <li key={s.key} className="flex min-h-11 items-center justify-between gap-2 text-sm">
                                        <span className={done ? 'text-muted-foreground line-through' : 'font-medium text-foreground'}>
                                            <span aria-hidden="true">{done ? '✓ ' : '○ '}</span>
                                            {t(`today.setup.${s.key}`)}
                                            <span className="sr-only">{t(done ? 'today.setup.doneSr' : 'today.setup.openSr')}</span>
                                        </span>
                                        {!done && (
                                            <Link href={s.href} className={linkCls}>
                                                {t('today.setup.go')}
                                            </Link>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                )}

                {!hasOpenItems(data) && <EmptyState title={t('today.empty.title')} hint={t('today.empty.hint')} action={<Link href="/kalender" className={linkCls}>{t('today.empty.action')}</Link>} />}

                <div className="grid gap-4 md:grid-cols-2">
                    {data.openRsvps.length > 0 && (
                        <Card title={t('today.rsvps.title')} badge={<Badge tone="primary">{data.openRsvps.length}</Badge>} href="/kalender" linkLabel={t('today.rsvps.action')}>
                            <ul className="space-y-1">
                                {data.openRsvps.slice(0, 5).map((e) => (
                                    <li key={e.eventId}>
                                        <span className="font-medium">{e.title}</span> <span className="text-muted-foreground">{when(e.startsAt)}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                    {data.cancelled.length > 0 && (
                        <Card title={t('today.cancelled.title')} badge={<Badge tone="danger">{data.cancelled.length}</Badge>} href="/kalender" linkLabel={t('today.cancelled.action')}>
                            <ul className="space-y-1">
                                {data.cancelled.slice(0, 5).map((e) => (
                                    <li key={e.eventId}>
                                        <span className="font-medium line-through">{e.title}</span> <span className="text-muted-foreground">{when(e.startsAt)}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                    {data.unreadAnnouncements > 0 && <Card title={t('today.announcements.title')} badge={<Badge tone="primary">{data.unreadAnnouncements}</Badge>} href="/mitteilungen" linkLabel={t('today.announcements.action')} />}
                    {data.dueReturns.length > 0 && (
                        <Card title={t('today.returns.title')} badge={<Badge tone={data.dueReturns.some((r) => isOverdue(r.dueAt)) ? 'danger' : 'primary'}>{data.dueReturns.length}</Badge>} href="/standorte" linkLabel={t('today.returns.action')}>
                            <ul className="space-y-1">
                                {data.dueReturns.slice(0, 5).map((r) => (
                                    <li key={r.loanId}>
                                        <span className="font-medium">{r.itemName}</span>{' '}
                                        <span className={isOverdue(r.dueAt) ? 'font-semibold text-destructive' : 'text-muted-foreground'}>{isOverdue(r.dueAt) ? t('today.returns.overdue', { date: day(r.dueAt) }) : t('today.returns.due', { date: day(r.dueAt) })}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                    {data.openBallots > 0 && <Card title={t('today.ballots.title')} badge={<Badge tone="primary">{data.openBallots}</Badge>} href="/abstimmungen" linkLabel={t('today.ballots.action')} />}
                </div>

                {data.board && (todos.length > 0 || data.board.memberCount !== undefined) && (
                    <section aria-label={t('today.board.title')}>
                        <h2 className="mb-2 text-sm font-bold text-foreground">{t('today.board.title')}</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            {todos.map((todo) => (
                                <Card key={todo.key} title={t(`today.board.${todo.key}`)} badge={<Badge tone="primary">{todo.count}</Badge>} href={todo.key === 'maintenanceDue' ? '/standorte' : todo.key === 'openExits' ? '/verein?tab=austritte' : '/verein?tab=mitglieder'} linkLabel={t('today.board.action')} />
                            ))}
                            {data.board.memberCount !== undefined && (
                                <section className="rounded-xl border border-border bg-card p-4">
                                    <h3 className="text-sm font-bold text-foreground">{t('today.board.memberCount')}</h3>
                                    <p className="mt-1 text-3xl font-bold text-foreground">{data.board.memberCount.toLocaleString(dateLocale(language))}</p>
                                </section>
                            )}
                        </div>
                    </section>
                )}
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-foreground">{t('nav.heute')}</h1>
            {activeClub?.clubName && <p className="mt-1 text-sm text-muted-foreground">{activeClub.clubName}</p>}
            <div className="mt-6">{body}</div>
        </div>
    );
}
