'use client';

import { useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { formatDate, secondaryButtonClass } from '@/lib/clubMembers';
import { REQUEST_KINDS, type RequestKind, privacyErrorKey } from '@/lib/privacyAdmin';

/**
 * Records a request that reached the club by letter, mail or phone (`POST /data-subject-requests`, `privacy:manage`): the
 * one-month deadline starts at the day of receipt and shows up in the request list with its traffic light.
 */
export default function MemberRequestRecorder({ clubId, clubMemberId, onRecorded }: { clubId: string; clubMemberId: string; onRecorded?: () => void }) {
    const { t, language } = useLanguage();
    const [kind, setKind] = useState<RequestKind>('access');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [note, setNote] = useState<string | null>(null);

    async function record() {
        setBusy(true);
        setError(null);
        setNote(null);
        try {
            const res = await apiFetch<{ data: { dueAt?: string } }>(`/data-subject-requests?clubId=${encodeURIComponent(clubId)}`, { method: 'POST', body: { clubMemberId, kind } });
            setNote(t('privacy.record.done', { date: formatDate(res.data?.dueAt, language) }));
            onRecorded?.();
        } catch (err) {
            setError(t(privacyErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t('privacy.record.intro')}</p>
            <div className="flex flex-wrap items-end gap-3">
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('privacy.record.kind')}</span>
                    <select value={kind} onChange={(e) => setKind(e.target.value as RequestKind)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                        {REQUEST_KINDS.map((k) => (
                            <option key={k} value={k}>
                                {t(`privacy.request.kind.${k}`)}
                            </option>
                        ))}
                    </select>
                </label>
                <button type="button" disabled={busy} onClick={() => void record()} className={secondaryButtonClass}>
                    {t('privacy.record.action')}
                </button>
            </div>
            {note && (
                <p role="status" className="text-sm text-success">
                    {note}
                </p>
            )}
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}
