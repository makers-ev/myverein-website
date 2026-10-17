'use client';

import { useEffect, useState } from 'react';
import { XCircle } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { decisionMessage, latestRejection } from '@/lib/applicantStatus';
import { formatDate } from '@/lib/clubMembers';
import type { MySubmission } from '@/lib/formSchema';

/**
 * Top of /verein for a person without a club: if the newest decided application was rejected, the board's message to the
 * applicant (`decisionNote`, plain text) is shown with the club and the date. Best effort and silent when nothing is found or
 * the request fails -- the application card below lists every decided application with its state. Nothing is stored.
 */
export default function RejectedApplicationNotice() {
    const { t, language } = useLanguage();
    const [rejected, setRejected] = useState<MySubmission | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data: MySubmission[] }>('/form-submissions/mine')
            .then((res) => {
                if (!cancelled) setRejected(latestRejection(res.data));
            })
            .catch(() => {
                // Hint only: the card below still shows the full state.
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (!rejected || dismissed) return null;
    const message = decisionMessage(rejected);
    return (
        <div role="status" className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="flex items-start gap-2 text-sm font-semibold text-foreground">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                <span className="min-w-0 break-words">{t('forms.apply.rejectedNotice.title', { club: rejected.club.name || rejected.club.slug })}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t('forms.apply.decided.on', { date: formatDate(rejected.decidedAt ?? rejected.createdAt, language) })}</p>
            <div className="mt-2 rounded-md bg-card px-3 py-2 text-sm">
                <p className="text-xs font-semibold text-muted-foreground">{t('forms.apply.decided.message')}</p>
                <p className={`mt-0.5 whitespace-pre-line break-words ${message ? 'text-foreground' : 'text-muted-foreground'}`}>{message ?? t('forms.apply.decided.noMessage')}</p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t('forms.apply.rejectedNotice.hint')}</p>
            <button type="button" onClick={() => setDismissed(true)} className="mt-2 text-xs font-semibold text-primary underline">
                {t('forms.apply.rejectedNotice.dismiss')}
            </button>
        </div>
    );
}
