'use client';

import Link from 'next/link';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { useLanguage } from '@/contexts/LanguageContext';
import { type PublicEvent } from '@/lib/publicEvents';
import { formatCost } from '@/lib/eventRegistration';

export const publicButton =
    'block w-full rounded-lg bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:brightness-110 active:scale-95 disabled:opacity-50';
export const publicSecondaryButton =
    'block w-full rounded-lg border border-border bg-background px-5 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50';

/** Card on an otherwise empty page, like the unsubscribe page; `status` adds a green or amber icon. */
export function PublicShell({ children, status, wide = false }: { children: React.ReactNode; status?: 'ok' | 'warn'; wide?: boolean }) {
    return (
        <div className="flex flex-col items-center justify-center bg-background p-4 py-12">
            <div className={`w-full ${wide ? 'max-w-xl' : 'max-w-md'} overflow-hidden rounded-2xl bg-card p-6 shadow-xl sm:p-8`}>
                {status === 'ok' && (
                    <div className="mx-auto mb-6 w-fit rounded-full bg-green-100 p-4 dark:bg-green-950">
                        <CheckCircleIcon className="h-10 w-10 text-green-600 dark:text-green-400" aria-hidden />
                    </div>
                )}
                {status === 'warn' && (
                    <div className="mx-auto mb-6 w-fit rounded-full bg-amber-100 p-4 dark:bg-amber-950">
                        <ExclamationTriangleIcon className="h-10 w-10 text-amber-600 dark:text-amber-400" aria-hidden />
                    </div>
                )}
                {children}
            </div>
        </div>
    );
}

/** Neutral message page for invalid/expired links, rate limits and errors. */
export function PublicMessage({ title, body }: { title: string; body: string }) {
    const { t } = useLanguage();
    return (
        <PublicShell status="warn">
            <div className="text-center">
                <h1 className="text-xl font-bold text-foreground">{title}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
                <Link href="/" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
                    {t('guest.home')}
                </Link>
            </div>
        </PublicShell>
    );
}

export function PublicLoading() {
    const { t } = useLanguage();
    return (
        <PublicShell>
            <p role="status" className="text-center text-sm text-muted-foreground">
                {t('common.loading')}
            </p>
        </PublicShell>
    );
}

/** Title, club, date, place and cost hint of the event (what a guest may see; nothing about other people). */
export function PublicEventSummary({ event }: { event: PublicEvent }) {
    const { t, language } = useLanguage();
    const start = new Date(event.startsAt);
    const end = event.endsAt ? new Date(event.endsAt) : null;
    const dateOpts: Intl.DateTimeFormatOptions = { dateStyle: 'full' };
    const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    const sameDay = end ? start.toDateString() === end.toDateString() : true;
    const cost = formatCost(event.costCents, language);
    return (
        <div className="space-y-1 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{event.clubName}</p>
            <h1 className="text-xl font-bold text-foreground">{event.title}</h1>
            {event.cancelled && <p className="rounded-lg bg-destructive/10 px-3 py-2 font-semibold text-destructive">{t('guest.cancelled')}</p>}
            <p className="text-foreground">
                {start.toLocaleDateString(language, dateOpts)}
                {end && !sameDay ? ` – ${end.toLocaleDateString(language, dateOpts)}` : ''}
                {!event.allDay && (
                    <>
                        <br />
                        {start.toLocaleTimeString(language, timeOpts)}
                        {end ? ` – ${end.toLocaleTimeString(language, timeOpts)}` : ''}
                    </>
                )}
                {event.allDay && (
                    <>
                        <br />
                        {t('kalender.events.allDay')}
                    </>
                )}
            </p>
            {event.location && (
                <p className="text-foreground">
                    {event.location.name}
                    {event.location.address ? `, ${event.location.address}` : ''}
                </p>
            )}
            {event.description && <p className="whitespace-pre-line pt-1 text-muted-foreground">{event.description}</p>}
            {(cost || event.costNote) && (
                <p className="rounded-lg bg-muted/50 px-3 py-2 text-foreground">
                    {cost ? t('registration.cost', { amount: cost }) : ''}
                    {cost && event.costNote ? ' · ' : ''}
                    {event.costNote ?? ''}
                    <span className="mt-0.5 block text-xs text-muted-foreground">{t('registration.cost.hint.guest')}</span>
                </p>
            )}
        </div>
    );
}
