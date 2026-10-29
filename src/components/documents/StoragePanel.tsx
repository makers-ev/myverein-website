'use client';

import { useCallback, useEffect, useState } from 'react';

import LoadingText from '@/components/LoadingText';
import LoadError from '@/components/LoadError';
import { useConfirm } from '@/components/useConfirm';
import { SectionCard, secondaryButtonClass } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type StorageOverview, clubQuery, documentErrorKey, formatBytes, quotaPercent, quotaTone } from '@/lib/documents';

const AREAS = ['documents', 'personal', 'generated', 'branding', 'other'] as const;
const TONE_CLASS = { ok: 'text-success', warn: 'text-warning', full: 'text-destructive' } as const;

/** Storage of the club (`storage:read`, Wave 13 W5): used / limit, breakdown, trash and a way to empty it (`documents:manage`). */
export default function StoragePanel({ clubId, canEmptyTrash }: { clubId: string; canEmptyTrash: boolean }) {
    const { t, language } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const [data, setData] = useState<StorageOverview | null>(null);
    const [failed, setFailed] = useState(false);
    const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
    const q = clubQuery(clubId);

    const load = useCallback(async () => {
        setFailed(false);
        try {
            const res = await apiFetch<{ data: StorageOverview }>(`/club-storage?${q}`);
            setData(res.data);
        } catch {
            setFailed(true);
        }
    }, [q]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    if (failed) return <LoadError onRetry={() => void load()} />;
    if (!data) return <LoadingText />;

    const percent = quotaPercent(data.usedBytes, data.quotaBytes);
    const tone = quotaTone(percent);

    async function emptyTrash() {
        if (!(await confirm({ title: t('docs.archive.emptyTrash.title'), body: t('docs.archive.emptyTrash.body'), confirmLabel: t('docs.archive.emptyTrash.confirm'), danger: true }))) return;
        try {
            const res = await apiFetch<{ data: { removed: number; kept: number } }>(`/documents/trash/empty?${q}`, { method: 'POST', body: {} });
            setMessage({ text: t('docs.archive.emptyTrash.done', { removed: res.data.removed, kept: res.data.kept }), error: false });
            await load();
        } catch (err) {
            setMessage({ text: t(documentErrorKey(err)), error: true });
        }
    }

    return (
        <SectionCard title={t('docs.storage.title')}>
            <p className="text-sm text-foreground">
                <span className={`font-bold ${TONE_CLASS[tone]}`}>{formatBytes(data.usedBytes, language)}</span> {t('docs.storage.of')} {formatBytes(data.quotaBytes, language)} ({percent} %)
            </p>
            <progress className="mt-2 h-2 w-full" max={100} value={percent} aria-label={t('docs.storage.title')} />
            {tone !== 'ok' && (
                <p role="status" className={`mt-2 text-sm ${TONE_CLASS[tone]}`}>
                    {t(tone === 'full' ? 'docs.storage.full' : 'docs.storage.warn')}
                </p>
            )}
            <ul className="mt-3 divide-y divide-border rounded-lg border border-border text-sm">
                {AREAS.map((area) => (
                    <li key={area} className="flex justify-between px-3 py-2">
                        <span className="text-foreground">{t(`docs.storage.area.${area}`)}</span>
                        <span className="text-muted-foreground">{formatBytes(data.areas[area], language)}</span>
                    </li>
                ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>{t('docs.storage.trash', { size: formatBytes(data.trashBytes, language) })}</span>
                {canEmptyTrash && (
                    <button type="button" className={secondaryButtonClass} disabled={data.trashBytes === 0} onClick={() => void emptyTrash()}>
                        {t('docs.archive.emptyTrash')}
                    </button>
                )}
            </div>
            {message && (
                <p role={message.error ? 'alert' : 'status'} className={`mt-2 text-sm ${message.error ? 'text-destructive' : 'text-success'}`}>
                    {message.text}
                </p>
            )}
            {dialog}
        </SectionCard>
    );
}
