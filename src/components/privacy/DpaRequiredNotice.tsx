'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { DPA_REQUIRED_EVENT } from '@/lib/api-client';
import { loadAccountScope } from '@/lib/familie';

/**
 * Global handling of `403 DPA_REQUIRED`: `apiFetch` announces the refusal on `window`, this notice (mounted once in the
 * protected layout) explains in plain words why saving did not work and where the owner signs the agreement. Without it every
 * form would show a raw "forbidden". Reading and the person's own privacy rights are never locked by the gate.
 */
export default function DpaRequiredNotice() {
    const { t } = useLanguage();
    const pathname = usePathname();
    const [visible, setVisible] = useState(false);
    // Guardian-only accounts (and the /familie area) have no club page to go to: neutral text without the link.
    const [guardianOnly, setGuardianOnly] = useState(false);
    const inFamily = pathname.startsWith('/familie');

    useEffect(() => {
        const show = () => {
            setVisible(true);
            loadAccountScope()
                .then((s) => setGuardianOnly(!s.hasClub && s.hasWards))
                .catch(() => undefined);
        };
        window.addEventListener(DPA_REQUIRED_EVENT, show);
        return () => window.removeEventListener(DPA_REQUIRED_EVENT, show);
    }, []);

    if (!visible) return null;
    const neutral = guardianOnly || inFamily;
    return (
        <div role="alert" className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl items-start gap-3 rounded-xl border border-destructive/40 bg-card p-4 text-sm shadow-lg">
            <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{t('privacy.err.dpaRequired.title')}</p>
                {neutral ? (
                    <p className="mt-1 text-foreground">{t('privacy.err.dpaRequired.guardian')}</p>
                ) : (
                    <>
                        <p className="mt-1 text-foreground">{t('privacy.err.dpaRequired')}</p>
                        <Link href="/verein" className="mt-2 inline-block font-semibold text-primary underline" onClick={() => setVisible(false)}>
                            {t('privacy.err.dpaRequired.link')}
                        </Link>
                    </>
                )}
            </div>
            <button type="button" onClick={() => setVisible(false)} aria-label={t('common.close')} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" aria-hidden="true" />
            </button>
        </div>
    );
}
