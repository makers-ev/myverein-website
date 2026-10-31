'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { fetchFileBlob, saveBlob } from '@/lib/memberCsv';
import { formatDate, inputClass, primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import { type DpaCurrent, SIGNER_MAX, SIGNER_MIN, privacyErrorKey } from '@/lib/privacyAdmin';
import { Chip, SectionCard } from '@/components/standorte/ui';
import LoadingText from '@/components/LoadingText';

/**
 * Status page of the processor agreement (AV-Vertrag, Wave 10 W6): the current version with text, subprocessors and technical
 * measures, a download, who accepted it and when, and -- for the club owner only -- the acceptance (signer name plus the
 * confirmation of authority). A new version starts a grace period shown here and in the banner; the club's data remain readable
 * all along. The server enforces who may accept; everybody else sees the status read-only.
 */
export default function DpaPanel({ clubId, onAccepted }: { clubId: string; onAccepted?: () => void }) {
    const { t, language } = useLanguage();
    const [current, setCurrent] = useState<DpaCurrent | undefined>(undefined);
    const [loadError, setLoadError] = useState(false);
    const [signer, setSigner] = useState('');
    const [authorized, setAuthorized] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const query = `clubId=${encodeURIComponent(clubId)}`;

    const load = useCallback(async () => {
        setLoadError(false);
        try {
            setCurrent((await apiFetch<{ data: DpaCurrent }>(`/dpa/current?${query}`)).data);
        } catch {
            setLoadError(true);
        }
    }, [query]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    async function accept() {
        if (!current?.version) return;
        setBusy(true);
        setError(null);
        try {
            await apiFetch(`/dpa/accept?${query}`, { method: 'POST', body: { dpaVersionId: current.version.id, signerName: signer.trim(), authorized: true } });
            setSigner('');
            setAuthorized(false);
            await load();
            onAccepted?.();
        } catch (err) {
            setError(t(privacyErrorKey(err)));
            // A newer version was published meanwhile: show it instead of the stale one.
            await load();
        } finally {
            setBusy(false);
        }
    }

    async function download(format: 'markdown' | 'html') {
        setError(null);
        try {
            const { blob, filename } = await fetchFileBlob(`/dpa/current/document?${query}&format=${format}`, format === 'html' ? 'av-vertrag.html' : 'av-vertrag.md', { accept: format === 'html' ? 'text/html' : 'text/markdown' });
            saveBlob(blob, filename);
        } catch (err) {
            setError(t(privacyErrorKey(err)));
        }
    }

    if (loadError)
        return (
            <SectionCard title={t('privacy.dpa.title')}>
                <p role="alert" className="text-sm text-destructive">
                    {t('common.error')}{' '}
                    <button type="button" onClick={() => void load()} className="font-semibold underline">
                        {t('common.retry')}
                    </button>
                </p>
            </SectionCard>
        );
    if (current === undefined)
        return (
            <SectionCard title={t('privacy.dpa.title')}>
                <LoadingText />
            </SectionCard>
        );

    const v = current.version;
    const status = current.status;
    const signerOk = signer.trim().length >= SIGNER_MIN && signer.trim().length <= SIGNER_MAX;

    return (
        <SectionCard title={t('privacy.dpa.title')}>
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{t('privacy.dpa.intro')}</p>
                {!v ? (
                    <p className="text-sm text-foreground">{t('privacy.dpa.none')}</p>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                            <Chip tone={status.accepted ? 'success' : status.blocked ? 'destructive' : 'warning'}>{t(status.accepted ? 'privacy.dpa.status.accepted' : status.blocked ? 'privacy.dpa.status.blocked' : 'privacy.dpa.status.open')}</Chip>
                            <span className="font-semibold">{v.title}</span>
                            <span className="text-muted-foreground">{t('privacy.dpa.versionLine', { version: v.version, date: formatDate(v.publishedAt, language) })}</span>
                        </div>

                        {status.accepted ? (
                            <p className="text-sm text-foreground">{t('privacy.dpa.acceptedBy', { name: status.signerName ?? '—', date: formatDate(status.acceptedAt, language) })}</p>
                        ) : (
                            <p className="text-sm text-foreground">
                                {status.deadline && !status.blocked
                                    ? t('privacy.dpa.graceLine', { count: Math.max(status.daysLeft ?? 0, 0), date: formatDate(status.deadline, language) })
                                    : status.blocked
                                      ? t('privacy.dpa.blockedLine')
                                      : t('privacy.dpa.openLine')}
                                {v.version > 1 && <span className="mt-1 block text-xs text-muted-foreground">{t('privacy.dpa.newVersionHint')}</span>}
                            </p>
                        )}

                        <details className="rounded-lg border border-border p-3 text-sm">
                            <summary className="cursor-pointer font-medium text-primary">{t('privacy.dpa.readText')}</summary>
                            <p className="mt-3 whitespace-pre-line text-foreground">{v.body}</p>
                        </details>

                        <div>
                            <h3 className="text-sm font-semibold text-foreground">{t('privacy.dpa.subprocessors')}</h3>
                            {v.subprocessors.length === 0 ? (
                                <p className="mt-1 text-sm text-muted-foreground">{t('privacy.dpa.subprocessors.none')}</p>
                            ) : (
                                <div className="mt-2 overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="text-xs uppercase text-muted-foreground">
                                            <tr>
                                                <th className="px-3 py-2">{t('privacy.dpa.sub.name')}</th>
                                                <th className="px-3 py-2">{t('privacy.dpa.sub.purpose')}</th>
                                                <th className="px-3 py-2">{t('privacy.dpa.sub.location')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {v.subprocessors.map((s, i) => (
                                                <tr key={`${s.name}-${i}`} className="border-t border-border text-foreground">
                                                    <td className="px-3 py-2 font-medium">{s.name}</td>
                                                    <td className="px-3 py-2">{s.purpose}</td>
                                                    <td className="px-3 py-2">{s.location}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {v.tomAnnex && (
                            <details className="rounded-lg border border-border p-3 text-sm">
                                <summary className="cursor-pointer font-medium text-primary">{t('privacy.dpa.tom')}</summary>
                                <p className="mt-3 whitespace-pre-line text-foreground">{v.tomAnnex}</p>
                            </details>
                        )}

                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => void download('markdown')} className={secondaryButtonClass}>
                                <Download className="h-4 w-4" aria-hidden="true" />
                                {t('privacy.dpa.download.markdown')}
                            </button>
                            <button type="button" onClick={() => void download('html')} className={secondaryButtonClass}>
                                <Download className="h-4 w-4" aria-hidden="true" />
                                {t('privacy.dpa.download.html')}
                            </button>
                        </div>

                        {!status.accepted && (
                            <div id="dpa-accept" className="space-y-3 rounded-lg bg-muted/50 p-3">
                                {current.canAccept ? (
                                    <>
                                        <h3 className="text-sm font-semibold text-foreground">{t('privacy.dpa.accept.title')}</h3>
                                        <label className="block max-w-md">
                                            <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('privacy.dpa.accept.signer')}</span>
                                            <input value={signer} maxLength={SIGNER_MAX} onChange={(e) => setSigner(e.target.value)} className={inputClass} autoComplete="name" />
                                        </label>
                                        <label className="flex items-start gap-2 text-sm text-foreground">
                                            <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} className="mt-1" />
                                            {t('privacy.dpa.accept.authorized')}
                                        </label>
                                        <button type="button" disabled={busy || !signerOk || !authorized} onClick={() => void accept()} className={primaryButtonClass}>
                                            {t('privacy.dpa.accept.action', { version: v.version })}
                                        </button>
                                    </>
                                ) : (
                                    <p className="text-sm text-foreground">{t('privacy.dpa.accept.ownerOnly')}</p>
                                )}
                            </div>
                        )}
                    </>
                )}
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
            </div>
        </SectionCard>
    );
}
