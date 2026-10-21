'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { fetchFileBlob, saveBlob } from '@/lib/memberCsv';
import { secondaryButtonClass } from '@/lib/clubMembers';
import { privacyErrorKey } from '@/lib/privacyAdmin';

type Format = 'json' | 'html';

/**
 * Art. 15 export of one person's data as a file. `self`: the signed-in member downloads their own data
 * (`GET /club-members/me/data-export`). `board`: `privacy:manage` exports for any member, also one without an account
 * (`POST /club-members/:id/data-export`), after confirming that the identity of the requester was checked offline.
 * HTML is meant to be read, JSON to be passed on; the server limits the number of exports per hour (429).
 */
export default function DataExportSection({ clubId, target }: { clubId: string; target: { kind: 'self' } | { kind: 'board'; clubMemberId: string } }) {
    const { t } = useLanguage();
    const [format, setFormat] = useState<Format>('html');
    const [identityChecked, setIdentityChecked] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const board = target.kind === 'board';

    async function run() {
        setBusy(true);
        setError(null);
        setDone(false);
        try {
            const accept = format === 'html' ? 'text/html' : 'application/json';
            const fallback = `${board ? 'datenexport' : 'meine-daten'}.${format}`;
            const { blob, filename } =
                target.kind === 'board'
                    ? await fetchFileBlob(`/club-members/${encodeURIComponent(target.clubMemberId)}/data-export?clubId=${encodeURIComponent(clubId)}`, fallback, { accept, method: 'POST', body: { identityChecked: true, format } })
                    : await fetchFileBlob(`/club-members/me/data-export?clubId=${encodeURIComponent(clubId)}&format=${format}`, fallback, { accept });
            saveBlob(blob, filename);
            setDone(true);
        } catch (err) {
            setError(t(privacyErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t(board ? 'privacy.export.boardIntro' : 'privacy.export.selfIntro')}</p>
            <div className="flex flex-wrap items-end gap-3">
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('privacy.export.format')}</span>
                    <select value={format} onChange={(e) => setFormat(e.target.value as Format)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                        <option value="html">{t('privacy.export.format.html')}</option>
                        <option value="json">{t('privacy.export.format.json')}</option>
                    </select>
                </label>
                <button type="button" disabled={busy || (board && !identityChecked)} onClick={() => void run()} className={secondaryButtonClass}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {t(busy ? 'privacy.export.busy' : 'privacy.export.action')}
                </button>
            </div>
            {board && (
                <label className="flex items-start gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={identityChecked} onChange={(e) => setIdentityChecked(e.target.checked)} className="mt-1" />
                    {t('privacy.export.identity')}
                </label>
            )}
            {done && (
                <p role="status" className="text-sm text-success">
                    {t('privacy.export.done')}
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
