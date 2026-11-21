'use client';

import { useEffect, useState } from 'react';
import { PauseCircle, X } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { CLUB_SUSPENDED_EVENT } from '@/lib/api-client';

/**
 * Global, calm handling of `403 CLUB_SUSPENDED`: `apiFetch` announces the refusal on `window`; this notice (mounted once in the protected
 * layout) says in plain words that the club is paused for now, with the platform's note if there is one. The internal reason is never
 * delivered to clients. Pages that map the error themselves show the same sentence instead of a raw "forbidden".
 */
export default function ClubSuspendedNotice() {
    const { t } = useLanguage();
    const [state, setState] = useState<{ note: string | null } | null>(null);

    useEffect(() => {
        const show = (e: Event) => setState({ note: (e as CustomEvent<{ note: string | null }>).detail?.note ?? null });
        window.addEventListener(CLUB_SUSPENDED_EVENT, show);
        return () => window.removeEventListener(CLUB_SUSPENDED_EVENT, show);
    }, []);

    if (!state) return null;
    return (
        <div role="status" className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl items-start gap-3 rounded-xl border border-control bg-card p-4 text-sm shadow-lg">
            <PauseCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{t('clubSuspended.title')}</p>
                <p className="mt-1 text-foreground">{t('clubSuspended.body')}</p>
                {state.note && <p className="mt-2 whitespace-pre-line rounded-lg bg-muted px-3 py-2 text-foreground">{state.note}</p>}
            </div>
            <button type="button" onClick={() => setState(null)} aria-label={t('common.close')} className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" aria-hidden="true" />
            </button>
        </div>
    );
}
