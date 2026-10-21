'use client';

import { AlertTriangle, FileSignature } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate } from '@/lib/clubMembers';
import { type DpaCurrent, dpaBannerKind } from '@/lib/privacyAdmin';

/**
 * Notice on top of the club page while the current processor agreement (AV-Vertrag) is not accepted: "open" (a version waits
 * for the owner), "grace" (a deadline is running, with the days left) or "blocked" (writing is locked until it is accepted;
 * reading, exports, erasure requests and withdrawing consents keep working). The owner gets the way to the signing page.
 */
export default function DpaBanner({ current, onOpen }: { current: DpaCurrent | null; onOpen: () => void }) {
    const { t, language } = useLanguage();
    const kind = dpaBannerKind(current);
    if (!current || !kind) return null;
    const blocked = kind === 'blocked';
    const text =
        kind === 'blocked'
            ? t('privacy.dpa.banner.blocked')
            : kind === 'grace'
              ? t('privacy.dpa.banner.grace', { count: Math.max(current.status.daysLeft ?? 0, 0), date: formatDate(current.status.deadline, language) })
              : t('privacy.dpa.banner.open');
    return (
        <div role={blocked ? 'alert' : 'status'} className={`mt-4 flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm ${blocked ? 'border-destructive/40 bg-destructive/5' : 'border-warning/40 bg-warning/10'}`}>
            {blocked ? <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" /> : <FileSignature className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />}
            <p className="min-w-0 flex-1 text-foreground">
                <span className="font-semibold">{t('privacy.dpa.banner.title', { version: current.version?.version ?? '' })}</span> {text}{' '}
                {!current.canAccept && <span className="text-muted-foreground">{t('privacy.dpa.banner.ownerOnly')}</span>}
            </p>
            <button type="button" onClick={onOpen} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted">
                {t(current.canAccept ? 'privacy.dpa.banner.sign' : 'privacy.dpa.banner.view')}
            </button>
        </div>
    );
}
