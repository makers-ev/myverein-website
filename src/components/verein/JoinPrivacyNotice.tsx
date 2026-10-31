'use client';

import { useEffect, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { formatDate } from '@/lib/clubMembers';
import type { PrivacyNotice } from '@/lib/privacyAdmin';

/**
 * The club's privacy notice on the join page (Wave 10 W7): version and date, the text to read, and a tick "zur Kenntnis genommen".
 * This is information (Art. 13 GDPR), never a consent: nothing here is required, the application can be sent without the tick,
 * and the tick is only recorded with the application as proof that the notice was available. Silent while the club has not
 * published a notice (or the request fails -- the application must never depend on it).
 */
export default function JoinPrivacyNotice({ slug, onAcknowledgedChange }: { slug: string; onAcknowledgedChange: (acknowledged: boolean) => void }) {
    const { t, language } = useLanguage();
    const [notice, setNotice] = useState<(PrivacyNotice & { clubName?: string }) | null>(null);
    const [acknowledged, setAcknowledged] = useState(false);

    // The tick starts unchecked on every mount, so tell the parent (its ref may still hold a value from a previous mount).
    useEffect(() => {
        onAcknowledgedChange(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);

    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data: (PrivacyNotice & { clubName?: string }) | null }>(`/clubs/${encodeURIComponent(slug)}/privacy-notice`)
            .then((res) => {
                if (!cancelled) setNotice(res.data);
            })
            .catch(() => {
                if (!cancelled) setNotice(null);
            });
        return () => {
            cancelled = true;
        };
    }, [slug]);

    if (!notice) return null;
    return (
        <section aria-label={t('privacy.join.title')} className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
            <h4 className="text-sm font-semibold text-foreground">{t('privacy.join.title')}</h4>
            <p className="mt-1 text-xs text-muted-foreground">{t('privacy.join.version', { version: notice.version, date: formatDate(notice.publishedAt, language) })}</p>
            <details className="mt-2 text-sm">
                <summary className="cursor-pointer font-medium text-primary">{t('privacy.join.read')}</summary>
                <p className="mt-2 max-h-72 overflow-y-auto whitespace-pre-line rounded-lg bg-background p-3 text-foreground">{notice.body}</p>
            </details>
            <label className="mt-3 flex items-start gap-2 text-sm text-foreground">
                <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => {
                        setAcknowledged(e.target.checked);
                        onAcknowledgedChange(e.target.checked);
                    }}
                    className="mt-1"
                />
                {t('privacy.join.acknowledge')}
            </label>
            <p className="mt-1 text-xs text-muted-foreground">{t('privacy.join.notAConsent')}</p>
        </section>
    );
}
