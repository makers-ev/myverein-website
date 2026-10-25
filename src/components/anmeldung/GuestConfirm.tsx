'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { useLanguage } from '@/contexts/LanguageContext';
import { type ConfirmData, confirmGuest, guestLanguage, isPlausibleSecret } from '@/lib/publicEvents';

import { PublicEventSummary, PublicMessage, PublicShell, publicButton } from './PublicShell';

type View = { kind: 'ready' } | { kind: 'busy' } | { kind: 'done'; data: ConfirmData } | { kind: 'notFound' | 'rateLimited' | 'error' };

/**
 * `/anmeldung/bestaetigen/<code>`: the link of the confirmation mail. The code is only used after a click, so mail scanners
 * that open links do not confirm for the guest. The manage link is shown once (and was mailed).
 */
export default function GuestConfirm({ code }: { code: string }) {
    const { t, language } = useLanguage();
    const [view, setView] = useState<View>({ kind: 'ready' });
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (!isPlausibleSecret(code)) setView({ kind: 'notFound' });
    }, [code]);

    async function confirm() {
        setView({ kind: 'busy' });
        const r = await confirmGuest(code, guestLanguage(language));
        if (r.kind === 'ok') setView({ kind: 'done', data: r.data });
        else if (r.kind === 'notFound' || r.kind === 'rateLimited') setView({ kind: r.kind });
        else setView({ kind: 'error' });
    }

    if (view.kind === 'notFound' || view.kind === 'rateLimited' || view.kind === 'error') {
        const key = view.kind === 'notFound' ? 'guest.err.confirmInvalid' : view.kind === 'rateLimited' ? 'guest.err.rateLimited' : 'guest.err.generic';
        return <PublicMessage title={t(`${key}.title`)} body={t(`${key}.body`)} />;
    }

    if (view.kind === 'done') {
        const d = view.data;
        const manageUrl = d.manageToken ? `${window.location.origin}/anmeldung/verwalten/${d.manageToken}` : null;
        return (
            <PublicShell status="ok" wide>
                <div role="status" className="text-center">
                    <h1 className="text-xl font-bold text-foreground">{t(d.status === 'angemeldet' ? 'guest.done.confirmed' : 'guest.done.waitlist')}</h1>
                    <p className="mt-2 text-sm text-muted-foreground">{t(d.alreadyConfirmed ? 'guest.done.already' : d.status === 'angemeldet' ? 'guest.done.confirmed.body' : 'guest.done.waitlist.body', { count: d.partySize })}</p>
                </div>
                <div className="mt-6 border-t border-border pt-4">
                    <PublicEventSummary event={d.event} />
                </div>
                {manageUrl && (
                    <div className="mt-6 space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
                        <p className="font-semibold text-foreground">{t('guest.manage.title')}</p>
                        <p className="text-xs text-muted-foreground">{t('guest.manage.hint')}</p>
                        <Link href={`/anmeldung/verwalten/${d.manageToken}`} className="block break-all text-primary hover:underline">
                            {manageUrl}
                        </Link>
                        <button
                            type="button"
                            onClick={() => void navigator.clipboard.writeText(manageUrl).then(() => setCopied(true), () => setCopied(false))}
                            className="text-xs font-semibold text-primary underline"
                        >
                            {t(copied ? 'registration.link.copied' : 'registration.link.copy')}
                        </button>
                    </div>
                )}
            </PublicShell>
        );
    }

    return (
        <PublicShell>
            <div className="text-center">
                <h1 className="text-xl font-bold text-foreground">{t('guest.confirm.title')}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{t('guest.confirm.body')}</p>
                <button type="button" disabled={view.kind === 'busy'} onClick={() => void confirm()} className={`${publicButton} mt-6`}>
                    {t(view.kind === 'busy' ? 'guest.confirm.busy' : 'guest.confirm.button')}
                </button>
            </div>
        </PublicShell>
    );
}
