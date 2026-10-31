'use client';

import { useEffect, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type ArchiveDocument, clubQuery } from '@/lib/documents';
import { inputClass, secondaryButtonClass } from '@/components/standorte/ui';

/** Picks an active PDF of the archive as the attachment of a club document (the server checks the right and the type again). */
export default function AttachmentPicker({ clubId, value, valueTitle, onChange, anyType = false, label }: { clubId: string; value: string | null; valueTitle: string | null; onChange: (id: string | null, title: string | null) => void; anyType?: boolean; label?: string }) {
    const { t } = useLanguage();
    const [q, setQ] = useState('');
    const [results, setResults] = useState<ArchiveDocument[] | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const term = q.trim();
        if (term.length < 2) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setResults(null);
            return;
        }
        const timer = setTimeout(() => {
            apiFetch<{ data: ArchiveDocument[] }>(`/documents?${clubQuery(clubId)}&q=${encodeURIComponent(term)}&status=aktiv&pageSize=20`)
                .then((res) => {
                    setFailed(false);
                    setResults(anyType ? res.data : res.data.filter((d) => d.currentVersion?.mimeType === 'application/pdf'));
                })
                .catch(() => setFailed(true));
        }, 300);
        return () => clearTimeout(timer);
    }, [q, clubId, anyType]);

    return (
        <div>
            <span className="mb-1 block text-xs font-medium text-muted-foreground">{label ?? t('docs.info.attachment')}</span>
            {value ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                    <span>{valueTitle ?? t('docs.info.attachment.chosen')}</span>
                    <button type="button" className={secondaryButtonClass} onClick={() => onChange(null, null)}>
                        {t('docs.info.attachment.remove')}
                    </button>
                </div>
            ) : (
                <>
                    <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('docs.info.attachment.search')} aria-label={t('docs.info.attachment.search')} className={inputClass} />
                    {failed && <p className="mt-1 text-xs text-muted-foreground">{t('docs.info.attachment.unavailable')}</p>}
                    {results && !failed && (
                        <ul className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-border">
                            {results.length === 0 ? (
                                <li className="px-3 py-2 text-xs text-muted-foreground">{t('docs.info.attachment.none')}</li>
                            ) : (
                                results.map((d) => (
                                    <li key={d.id}>
                                        <button type="button" onClick={() => onChange(d.id, d.title)} className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted">
                                            {d.title}
                                        </button>
                                    </li>
                                ))
                            )}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}
