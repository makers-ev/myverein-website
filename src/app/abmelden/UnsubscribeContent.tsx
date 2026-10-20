'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { useLanguage } from '@/contexts/LanguageContext';
import { confirmUnsubscribe, isPlausibleToken, previewUnsubscribe, type UnsubscribePreview } from '@/lib/notificationPreferences';

type View =
    | { kind: 'init' }
    | { kind: 'loading' }
    | { kind: 'preview'; preview: UnsubscribePreview }
    | { kind: 'busy'; preview: UnsubscribePreview }
    | { kind: 'done'; preview: UnsubscribePreview }
    | { kind: 'invalid' }
    | { kind: 'rateLimited' }
    | { kind: 'error' };

const buttonClass =
    'block w-full rounded-lg bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:brightness-110 active:scale-95 disabled:opacity-50';

function Shell({ children, status }: { children: React.ReactNode; status?: 'ok' | 'warn' }) {
    return (
        <div className="flex flex-col items-center justify-center bg-background p-4 py-16">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-card p-8 shadow-xl">
                <div className="flex flex-col items-center text-center">
                    {status === 'ok' && (
                        <div className="mb-6 rounded-full bg-green-100 p-4 dark:bg-green-950">
                            <CheckCircleIcon className="h-10 w-10 text-green-600 dark:text-green-400" aria-hidden />
                        </div>
                    )}
                    {status === 'warn' && (
                        <div className="mb-6 rounded-full bg-amber-100 p-4 dark:bg-amber-950">
                            <ExclamationTriangleIcon className="h-10 w-10 text-amber-600 dark:text-amber-400" aria-hidden />
                        </div>
                    )}
                    {children}
                </div>
            </div>
        </div>
    );
}

// StrictMode runs the mount effect twice in dev; the first run strips the token from the URL, so it is kept here.
let capturedToken: string | null = null;

export default function UnsubscribeContent() {
    const { t } = useLanguage();
    const [view, setView] = useState<View>({ kind: 'init' });
    const [token, setToken] = useState<string | null>(null);

    // The token is read once from the URL and removed from the address bar right away (history, screenshots).
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const found = params.get('token') ?? capturedToken;
        capturedToken = found;
        window.history.replaceState(null, '', window.location.pathname);
        if (!isPlausibleToken(found)) {
            // Reading browser state after mount, not derivable during render.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setView({ kind: 'invalid' });
            return;
        }
        setToken(found);
        setView({ kind: 'loading' });
        let cancelled = false;
        previewUnsubscribe(found).then((r) => {
            if (cancelled) return;
            if (r.kind === 'ok') setView({ kind: 'preview', preview: r.data });
            else setView({ kind: r.kind });
        });
        return () => {
            cancelled = true;
        };
    }, []);

    async function unsubscribe(preview: UnsubscribePreview) {
        if (!token) return;
        setView({ kind: 'busy', preview });
        const r = await confirmUnsubscribe(token);
        if (r.kind === 'ok') setView({ kind: 'done', preview });
        else setView({ kind: r.kind });
    }

    if (view.kind === 'init' || view.kind === 'loading') {
        return (
            <Shell>
                <p role="status" className="text-sm text-muted-foreground">
                    {t('common.loading')}
                </p>
            </Shell>
        );
    }

    if (view.kind === 'invalid' || view.kind === 'rateLimited' || view.kind === 'error') {
        return (
            <Shell status="warn">
                <h1 className="text-xl font-bold text-foreground">{t(`unsubscribe.${view.kind}.title`)}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{t(`unsubscribe.${view.kind}.body`)}</p>
                <Link href="/" className="mt-6 text-sm font-medium text-primary hover:underline">
                    {t('unsubscribe.home')}
                </Link>
            </Shell>
        );
    }

    const club = view.preview.clubName ?? t('unsubscribe.club.fallback');
    const category = t(`prefs.category.${view.preview.category}`);

    if (view.kind === 'done') {
        return (
            <Shell status="ok">
                <h1 className="text-xl font-bold text-foreground">{t('unsubscribe.done.title')}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{t('unsubscribe.done.body', { club, category })}</p>
                <p className="mt-3 text-xs text-muted-foreground">{t('unsubscribe.done.hint')}</p>
                <Link href="/settings" className="mt-6 text-sm font-medium text-primary hover:underline">
                    {t('unsubscribe.settings')}
                </Link>
            </Shell>
        );
    }

    return (
        <Shell>
            <h1 className="text-xl font-bold text-foreground">{t('unsubscribe.title')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t(view.preview.unsubscribed ? 'unsubscribe.already' : 'unsubscribe.body', { club, category })}</p>
            <p className="mt-2 text-xs text-muted-foreground">{t('unsubscribe.mandatory')}</p>
            <button type="button" disabled={view.kind === 'busy'} onClick={() => void unsubscribe(view.preview)} className={`${buttonClass} mt-6`}>
                {t('unsubscribe.button')}
            </button>
            <Link href="/" className="mt-4 text-sm text-muted-foreground hover:underline">
                {t('unsubscribe.keep')}
            </Link>
        </Shell>
    );
}
