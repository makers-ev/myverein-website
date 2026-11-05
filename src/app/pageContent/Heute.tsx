'use client';

import Link from 'next/link';
import { Circle, CircleCheck } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { apiFetch } from '@/lib/api-client';
import { dateLocale } from '@/lib/clubMembers';
import { boardTodos, hasOpenItems, isOverdue, SETUP_STEPS, todayPath, type TodayData } from '@/lib/today';
import { useLanguage } from '@/contexts/LanguageContext';
import { docsTopicUrl } from '@/lib/docs';
import HelpLink from '@/components/HelpLink';
import { useActiveClub } from '@/components/shell/ActiveClubProvider';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui';

const linkCls = 'inline-flex min-h-11 items-center whitespace-nowrap rounded-lg border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary';

/** Open-item count of a card: a quiet figure, red only when something is overdue. */
function Count({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
    return <span className={`text-2xl font-medium leading-none tabular-nums ${danger ? 'text-destructive' : 'text-foreground'}`}>{children}</span>;
}

function Card({ title, badge, href, linkLabel, children }: { title: string; badge?: ReactNode; href: string; linkLabel: string; children?: ReactNode }) {
    return (
        <section className="flex flex-col items-start rounded-xl border border-border bg-card p-5">
            <div className="flex w-full items-start justify-between gap-3">
                <h2 className="text-base font-medium text-foreground">{title}</h2>
                {badge}
            </div>
            {children && <div className="mt-3 w-full text-sm text-foreground">{children}</div>}
            <Link href={href} className={`${linkCls} mt-4`}>
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
                    <section className="rounded-xl border border-border bg-card p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-base font-medium text-foreground">{t('today.setup.title')}</h2>
                            <a href={docsTopicUrl('setup')} target="_blank" rel="noopener noreferrer" className={linkCls}>
                                {t('help.setup.link')}
                                <span className="sr-only"> {t('help.nav.label')}</span>
                            </a>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{t('today.setup.progress', { done: setup.done.length, total: setupTotal })}</p>
                        <ul className="mt-3">
                            {SETUP_STEPS.filter((s) => setup.open.includes(s.key) || setup.done.includes(s.key)).map((s) => {
                                const done = setup.done.includes(s.key);
                                return (
                                    <li key={s.key} className="flex min-h-11 items-center justify-between gap-3 border-t border-border py-1 text-sm first:border-t-0">
                                        <span className={`flex items-center gap-2.5 ${done ? 'text-muted-foreground' : 'text-foreground'}`}>
                                            {done ? <CircleCheck aria-hidden="true" strokeWidth={1.5} className="h-[18px] w-[18px] shrink-0 text-success" /> : <Circle aria-hidden="true" strokeWidth={1.5} className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />}
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
                        <Card title={t('today.rsvps.title')} badge={<Count>{data.openRsvps.length}</Count>} href="/kalender" linkLabel={t('today.rsvps.action')}>
                            <ul className="space-y-1">
                                {data.openRsvps.slice(0, 5).map((e) => (
                                    <li key={e.eventId}>
                                        <span className="font-medium">{e.title}</span> <span className="text-muted-foreground tabular-nums">{when(e.startsAt)}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                    {data.cancelled.length > 0 && (
                        <Card title={t('today.cancelled.title')} badge={<Count>{data.cancelled.length}</Count>} href="/kalender" linkLabel={t('today.cancelled.action')}>
                            <ul className="space-y-1">
                                {data.cancelled.slice(0, 5).map((e) => (
                                    <li key={e.eventId}>
                                        <span className="font-medium line-through">{e.title}</span> <span className="text-muted-foreground">{when(e.startsAt)}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}
                    {data.unreadAnnouncements > 0 && <Card title={t('today.announcements.title')} badge={<Count>{data.unreadAnnouncements}</Count>} href="/mitteilungen" linkLabel={t('today.announcements.action')} />}
                    {data.dueReturns.length > 0 && (
                        <Card title={t('today.returns.title')} badge={<Count danger={data.dueReturns.some((r) => isOverdue(r.dueAt))}>{data.dueReturns.length}</Count>} href="/standorte" linkLabel={t('today.returns.action')}>
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
                    {data.openBallots > 0 && <Card title={t('today.ballots.title')} badge={<Count>{data.openBallots}</Count>} href="/abstimmungen" linkLabel={t('today.ballots.action')} />}
                </div>

                {data.board && (todos.length > 0 || data.board.memberCount !== undefined) && (
                    <section aria-label={t('today.board.title')}>
                        <h2 className="mb-3 text-base font-medium text-foreground">{t('today.board.title')}</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            {todos.map((todo) => (
                                <Card key={todo.key} title={t(`today.board.${todo.key}`)} badge={<Count>{todo.count}</Count>} href={todo.key === 'maintenanceDue' ? '/standorte' : todo.key === 'openExits' ? '/verein?tab=austritte' : '/verein?tab=mitglieder'} linkLabel={t('today.board.action')} />
                            ))}
                            {data.board.memberCount !== undefined && (
                                <section className="rounded-xl border border-border bg-card p-5">
                                    <h3 className="text-base font-medium text-foreground">{t('today.board.memberCount')}</h3>
                                    <p className="mt-2 text-[2rem] font-medium leading-none tabular-nums text-foreground">{data.board.memberCount.toLocaleString(dateLocale(language))}</p>
                                </section>
                            )}
                        </div>
                    </section>
                )}
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1">
                <h1 className="text-[1.75rem] font-medium leading-9 text-foreground">{t('nav.heute')}</h1>
                <HelpLink topic="today" />
            </div>
            {activeClub?.clubName && <p className="mt-1 text-sm text-muted-foreground">{activeClub.clubName}</p>}
            <div className="mt-8">{body}</div>
        </div>
    );
}
