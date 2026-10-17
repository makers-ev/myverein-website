'use client';

import { CheckCircle2, Clock, MinusCircle, UserCheck, UserRound, XCircle } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate } from '@/lib/clubMembers';
import type { EnteredBy } from '@/lib/customFields';
import { type CredentialExpiry, type ExpiryIcon, type ExpiryTone, expiryView } from '@/lib/credentials';

const TONE_CLASS: Record<ExpiryTone, string> = {
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
    muted: 'bg-muted text-muted-foreground',
};

const ICONS: Record<ExpiryIcon, typeof Clock> = { ok: CheckCircle2, soon: Clock, expired: XCircle, none: MinusCircle };

/**
 * Expiry status of a credential as a chip: the text always says it ("läuft ab in 12 Tagen", "abgelaufen seit 3 Tagen"), the
 * icon and colour only support it -- never colour alone. Renders nothing without an expiry. Plain text only.
 */
export default function ExpiryBadge({ expiry }: { expiry: CredentialExpiry | null | undefined }) {
    const { t, language } = useLanguage();
    const view = expiryView(expiry, expiry?.validUntil ? formatDate(expiry.validUntil, language) : undefined);
    if (!view) return null;
    const Icon = ICONS[view.icon];
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE_CLASS[view.tone]}`} data-expiry={view.status}>
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t(view.key, view.params)}
        </span>
    );
}

/**
 * Who recorded a value: the person itself is a declaration the club has not checked, the board entry is the club's own record.
 * Text plus icon; renders nothing without a value.
 */
export function EnteredByNote({ enteredBy }: { enteredBy: EnteredBy | null | undefined }) {
    const { t } = useLanguage();
    if (enteredBy !== 'self' && enteredBy !== 'board') return null;
    const Icon = enteredBy === 'self' ? UserRound : UserCheck;
    return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t(`forms.cred.enteredBy.${enteredBy}`)}
        </span>
    );
}
