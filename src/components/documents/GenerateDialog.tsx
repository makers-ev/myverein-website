'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Download, FilePlus2, Loader2 } from 'lucide-react';

import { Modal } from '@/components/Modal';
import { primaryButtonClass, secondaryButtonClass } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { POLL_SLOW_AFTER, type RenderJob, type ResultTarget, generationErrorKey, isActiveJob, jobErrorKey, loadTemplates, offers, pollDelayMs, resultDownloadPath } from '@/lib/documentGeneration';
import { clubQuery, downloadDocument } from '@/lib/documents';

/** True once the club's template list offers `templateId` (`null` while loading or when the list is unavailable: show nothing). */
export function useTemplateOffered(clubId: string, templateId: string): boolean {
    const [offered, setOffered] = useState(false);
    useEffect(() => {
        let cancelled = false;
        void loadTemplates(clubId).then((list) => {
            if (!cancelled) setOffered(offers(list, templateId));
        });
        return () => {
            cancelled = true;
        };
    }, [clubId, templateId]);
    return offered;
}

/**
 * "Dokument erzeugen" dialog (Wave 13 W6): form fields (`children`) -> request -> job status (waiting / rendering, polled) -> download
 * or a plain-language error with "Erneut versuchen". A failed render never loses the business action; the job can be repeated.
 */
export default function GenerateDialog({
    clubId,
    templateId,
    title,
    intro,
    params,
    target,
    canSubmit = true,
    submitLabel,
    children,
    onClose,
    onDone,
}: {
    clubId: string;
    templateId: string;
    title: string;
    intro?: string;
    params: Record<string, unknown>;
    target: ResultTarget;
    canSubmit?: boolean;
    submitLabel?: string;
    children?: ReactNode;
    onClose: () => void;
    /** Called when the document is ready (e.g. to reload the list it lands in). */
    onDone?: () => void;
}) {
    const { t } = useLanguage();
    const q = clubQuery(clubId);
    const [job, setJob] = useState<RenderJob | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [polls, setPolls] = useState(0);
    const doneFor = useRef<string | null>(null);
    const onDoneRef = useRef(onDone);
    useEffect(() => {
        onDoneRef.current = onDone;
    });

    const jobId = job?.id ?? null;
    const active = job ? isActiveJob(job) : false;

    useEffect(() => {
        if (!jobId || !active) return;
        let cancelled = false;
        const timer = setTimeout(() => {
            apiFetch<{ data: RenderJob }>(`/document-generation/jobs/${encodeURIComponent(jobId)}?${q}`)
                .then((res) => {
                    if (cancelled) return;
                    setJob(res.data);
                    setPolls((n) => n + 1);
                })
                .catch(() => {
                    // A single lost poll is not an error; the next round asks again.
                    if (!cancelled) setPolls((n) => n + 1);
                });
        }, pollDelayMs(polls));
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [jobId, active, polls, q]);

    useEffect(() => {
        if (job?.status === 'fertig' && doneFor.current !== job.id) {
            doneFor.current = job.id;
            onDoneRef.current?.();
        }
    }, [job]);

    const start = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
            const res = await apiFetch<{ data: RenderJob }>(`/document-generation?${q}`, { method: 'POST', body: { templateId, params } });
            setPolls(0);
            setJob(res.data);
        } catch (err) {
            setError(t(generationErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }, [q, templateId, params, t]);

    async function retry() {
        if (!job) return;
        setBusy(true);
        setError(null);
        try {
            const res = await apiFetch<{ data: RenderJob }>(`/document-generation/jobs/${encodeURIComponent(job.id)}/retry?${q}`, { method: 'POST', body: {} });
            setPolls(0);
            setJob(res.data);
        } catch (err) {
            setError(t(generationErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    async function download() {
        if (!job?.documentId) return;
        setBusy(true);
        setError(null);
        try {
            await downloadDocument(resultDownloadPath(target, job.documentId, q), `${templateId}.pdf`);
        } catch (err) {
            setError(t(generationErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            title={title}
            footer={
                <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" className={secondaryButtonClass} onClick={onClose}>
                        {t(job ? 'docs.gen.close' : 'docs.common.cancel')}
                    </button>
                    {!job && (
                        <button type="button" className={primaryButtonClass} disabled={busy || !canSubmit} onClick={() => void start()}>
                            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                            {submitLabel ?? t('docs.gen.submit')}
                        </button>
                    )}
                    {job?.status === 'fertig' && (
                        <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => void download()}>
                            <Download className="h-4 w-4" aria-hidden="true" />
                            {t('docs.archive.download')}
                        </button>
                    )}
                    {job?.status === 'fehlgeschlagen' && (
                        <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => void retry()}>
                            {t('docs.gen.retry')}
                        </button>
                    )}
                </div>
            }
        >
            <div className="space-y-3">
                {intro && !job && <p className="text-sm text-muted-foreground">{intro}</p>}
                {!job && children}
                {job && active && (
                    <div role="status" className="flex items-start gap-2 text-sm text-foreground">
                        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                        <div>
                            <p>{t(job.status === 'wartet' ? 'docs.gen.job.wartet' : 'docs.gen.job.rendert')}</p>
                            {polls >= POLL_SLOW_AFTER && <p className="mt-1 text-xs text-muted-foreground">{t('docs.gen.job.slow')}</p>}
                        </div>
                    </div>
                )}
                {job?.status === 'fertig' && (
                    <p role="status" className="text-sm text-foreground">
                        {t(target.kind === 'person' ? 'docs.gen.done.person' : 'docs.gen.done.archive')}
                    </p>
                )}
                {job?.status === 'fehlgeschlagen' && (
                    <p role="alert" className="text-sm text-destructive">
                        {t(jobErrorKey(job.errorCode))} {t('docs.gen.job.retryHint')}
                    </p>
                )}
                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
            </div>
        </Modal>
    );
}

/**
 * Button + dialog for templates without a form: shown only when the club's template list offers the template (the server decides by
 * permission), so a member without the right never sees a dead button.
 */
export function GenerateAction({
    clubId,
    templateId,
    label,
    title,
    intro,
    params,
    target,
    className,
    onDone,
}: {
    clubId: string;
    templateId: string;
    label: string;
    title?: string;
    intro?: string;
    params: Record<string, unknown>;
    target: ResultTarget;
    className?: string;
    onDone?: () => void;
}) {
    const offered = useTemplateOffered(clubId, templateId);
    const [open, setOpen] = useState(false);
    if (!offered) return null;
    return (
        <>
            <button type="button" className={className ?? secondaryButtonClass} onClick={() => setOpen(true)}>
                <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                {label}
            </button>
            {open && <GenerateDialog clubId={clubId} templateId={templateId} title={title ?? label} intro={intro} params={params} target={target} onClose={() => setOpen(false)} onDone={onDone} />}
        </>
    );
}
