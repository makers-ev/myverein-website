'use client';

import { useEffect, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import type { WardClub } from '@/lib/familie';
import { inputClass } from '@/components/standorte/ui';
import MemberDocuments from './MemberDocuments';

/**
 * "Meine Dokumente" in the profile (Wave 13 W3): receipts, confirmations and own uploads. A guardian who is also a member switches
 * between their own storage and the wards' of this club (`GET /my-wards`; the server checks the guardian link again).
 */
export default function MyDocumentsPanel({ clubId, extra }: { clubId: string; extra?: React.ReactNode }) {
    const { t } = useLanguage();
    const [wards, setWards] = useState<{ wardId: string; name: string }[]>([]);
    const [who, setWho] = useState('me');

    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data: WardClub[] }>('/my-wards')
            .then((res) => {
                if (!cancelled) setWards(res.data.filter((c) => c.clubId === clubId).flatMap((c) => c.wards.map((w) => ({ wardId: w.wardId, name: w.name }))));
            })
            .catch(() => {
                // No wards or no access: the own storage is all there is.
            });
        return () => {
            cancelled = true;
        };
    }, [clubId]);

    return (
        <section aria-label={t('docs.person.title')} className="space-y-3">
            <div>
                <h2 className="text-lg font-bold text-foreground">{t('docs.person.title')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('docs.person.intro')}</p>
            </div>
            {wards.length > 0 && (
                <label className="block max-w-xs">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.person.whose')}</span>
                    <select value={who} onChange={(e) => setWho(e.target.value)} className={inputClass}>
                        <option value="me">{t('docs.person.mine')}</option>
                        {wards.map((w) => (
                            <option key={w.wardId} value={w.wardId}>
                                {w.name}
                            </option>
                        ))}
                    </select>
                </label>
            )}
            <MemberDocuments clubId={clubId} memberId={who} extra={who === 'me' ? extra : undefined} />
        </section>
    );
}
