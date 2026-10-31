'use client';

import { useEffect, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type ConsentText } from '@/lib/consents';
import { formatDate } from '@/lib/clubMembers';
import LoadingText from '@/components/LoadingText';
import DiffView from './DiffView';

/** All published versions of a purpose, newest first, each compared with its predecessor (`GET /consent-purposes/:id/texts`, `privacy:read`). */
export default function ConsentTextHistory({ clubId, purposeId, reloadToken }: { clubId: string; purposeId: string; reloadToken: number }) {
    const { t, language } = useLanguage();
    const [texts, setTexts] = useState<ConsentText[] | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data: ConsentText[] }>(`/consent-purposes/${encodeURIComponent(purposeId)}/texts?clubId=${encodeURIComponent(clubId)}`)
            .then((res) => !cancelled && setTexts(res.data))
            .catch(() => !cancelled && setFailed(true));
        return () => {
            cancelled = true;
        };
    }, [clubId, purposeId, reloadToken]);

    if (failed)
        return (
            <p role="alert" className="text-sm text-destructive">
                {t('common.error')}
            </p>
        );
    if (!texts) return <LoadingText />;
    if (texts.length === 0) return <p className="text-sm text-muted-foreground">{t('privacy.history.empty')}</p>;
    return (
        <ol className="space-y-3">
            {texts.map((text, i) => {
                const previous = texts[i + 1];
                return (
                    <li key={text.id} className="rounded-lg border border-border p-3">
                        <p className="mb-2 text-xs font-semibold text-foreground">
                            {t('privacy.history.version', { version: text.version })}
                            <span className="ml-2 font-normal text-muted-foreground">{formatDate(text.publishedAt, language)}</span>
                        </p>
                        {previous ? (
                            <DiffView before={previous.body} after={text.body} />
                        ) : (
                            <p className="whitespace-pre-line rounded-lg bg-muted/50 p-3 text-sm text-foreground">{text.body}</p>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
