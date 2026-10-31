'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import Link from 'next/link';

import { apiFetch } from '@/lib/api-client';
import { type ExpiringRole, type TermStatus, termDaysLeft, termStatusOf } from '@/lib/assembly';
import { formatDate } from '@/lib/clubMembers';
import { useLanguage } from '@/contexts/LanguageContext';

/** Today in the club time zone as YYYY-MM-DD. */
export function todayBerlin(): string {
    return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
}

const TONE: Record<TermStatus, string> = {
    aktiv: 'bg-success/10 text-success',
    laeuft_bald_ab: 'bg-warning/15 text-warning',
    abgelaufen: 'bg-destructive/10 text-destructive',
};
const ICON: Record<TermStatus, typeof Clock> = { aktiv: CheckCircle2, laeuft_bald_ab: Clock, abgelaufen: AlertTriangle };

/** Term of office as a chip: "Amtszeit bis 31.12.2026" plus, when it runs out soon or is over, the status in words (text and icon, not colour alone). */
export function TermBadge({ termEndsAt, status, daysLeft }: { termEndsAt: string | null; status?: TermStatus; daysLeft?: number | null }) {
    const { t, language } = useLanguage();
    if (!termEndsAt) return null;
    const today = todayBerlin();
    const s = status ?? termStatusOf(termEndsAt, today);
    const days = daysLeft ?? termDaysLeft(termEndsAt, today);
    const Icon = ICON[s];
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[s]}`} data-term={s}>
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {t('assembly.term.until', { date: formatDate(termEndsAt, language) })}
            {s === 'laeuft_bald_ab' && days !== null && ` · ${t('assembly.term.soon', { days })}`}
            {s === 'abgelaufen' && ` · ${t('assembly.term.expired')}`}
        </span>
    );
}

/** Note card for the board: roles whose term is running out or over, each with a link that opens the election form ("Neuwahl planen"). */
export function ExpiringRolesCard({ clubId }: { clubId: string }) {
    const { t } = useLanguage();
    const [rows, setRows] = useState<ExpiringRole[] | null>(null);
    const [effect, setEffect] = useState<string>('none');

    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data: ExpiringRole[]; termExpiryEffect: string }>(`/club-roles/expiring?clubId=${clubId}`)
            .then((res) => {
                if (cancelled) return;
                setRows(res.data);
                setEffect(res.termExpiryEffect);
            })
            .catch(() => {
                if (!cancelled) setRows([]);
            });
        return () => {
            cancelled = true;
        };
    }, [clubId]);

    if (!rows || rows.length === 0) return null;
    return (
        <div role="note" className="rounded-xl border border-warning/40 bg-warning/10 p-4">
            <h2 className="text-sm font-bold text-foreground">{t('assembly.term.card.title')}</h2>
            <ul className="mt-2 space-y-2">
                {rows.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-foreground">
                        <span className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{r.name ?? '—'}</span>
                            <span className="text-muted-foreground">{t(`verein.role.${r.roleType}`)}</span>
                            <TermBadge termEndsAt={r.termEndsAt} status={r.termStatus} daysLeft={r.termDaysLeft} />
                        </span>
                        <Link href={`/abstimmungen?tab=wahlen&role=${encodeURIComponent(r.roleType)}${r.departmentId ? `&department=${encodeURIComponent(r.departmentId)}` : ''}`} className="text-sm font-medium text-primary underline">
                            {t('assembly.term.plan')}
                        </Link>
                    </li>
                ))}
            </ul>
            {effect === 'suspend_permissions' && <p className="mt-2 text-xs text-muted-foreground">{t('assembly.term.suspend')}</p>}
        </div>
    );
}
