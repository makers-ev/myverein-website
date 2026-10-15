'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';

import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import FormRenderer from '@/components/forms/FormRenderer';
import { Modal } from '@/components/Modal';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { formatDate, secondaryButtonClass } from '@/lib/clubMembers';
import { type FormVersion, type FormVersionSummary, previewFields } from '@/lib/formEditor';

const statusClass: Record<FormVersion['status'], string> = {
    published: 'bg-success/10 text-success',
    draft: 'bg-primary/10 text-primary',
    archived: 'bg-muted text-muted-foreground',
};

function StatusChip({ status }: { status: FormVersion['status'] }) {
    const { t } = useLanguage();
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusClass[status]}`}>{t(`forms.editor.version.status.${status}`)}</span>;
}

/** Read-only view of one version: its fields as the applicants saw them and its privacy notice. Nothing here can be edited. */
function VersionView({ clubId, formId, version, categories, onBack }: { clubId: string; formId: string; version: number; categories: ReadonlyArray<{ key: string; name: string }>; onBack: () => void }) {
    const { t, language } = useLanguage();
    const [data, setData] = useState<FormVersion | null>(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data: { version: FormVersion } }>(`/forms/${formId}/versions/${version}?clubId=${clubId}`)
            .then((res) => {
                if (cancelled) return;
                setData(res.data.version);
                setFailed(false);
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            });
        return () => {
            cancelled = true;
        };
    }, [clubId, formId, version, attempt]);

    return (
        <div>
            <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {t('forms.editor.versions.back')}
            </button>
            {failed ? (
                <LoadError onRetry={() => setAttempt((n) => n + 1)} />
            ) : !data ? (
                <LoadingText />
            ) : (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground">{t('forms.editor.versions.version', { version: data.version })}</h3>
                        <StatusChip status={data.status} />
                        {data.publishedAt && <span className="text-xs text-muted-foreground">{t('forms.editor.versions.publishedOn', { date: formatDate(data.publishedAt, language) })}</span>}
                    </div>
                    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {t('forms.editor.versions.readonly')}
                    </p>
                    {/* Plain text on purpose: the notice comes from the club's definition. */}
                    {data.privacyNotice && (
                        <section>
                            <h4 className="text-xs font-semibold text-muted-foreground">{t('forms.editor.privacy.title')}</h4>
                            <p className="mt-1 max-h-40 overflow-y-auto whitespace-pre-line break-words rounded-lg border border-border p-3 text-sm text-foreground">{data.privacyNotice}</p>
                        </section>
                    )}
                    <section>
                        <h4 className="text-xs font-semibold text-muted-foreground">{t('forms.editor.versions.fields', { count: data.fields.length })}</h4>
                        {data.fields.length === 0 ? (
                            <p className="mt-1 text-sm text-muted-foreground">{t('forms.editor.fields.empty')}</p>
                        ) : (
                            <div className="mt-2 rounded-lg border border-border p-3" aria-label={t('forms.editor.versions.preview')} role="group">
                                <FormRenderer fields={previewFields(data.fields, categories)} privacyNotice={data.privacyNotice} answers={{}} onChange={() => {}} disabled idPrefix={`ver-${version}`} />
                            </div>
                        )}
                    </section>
                </div>
            )}
        </div>
    );
}

/** Version history of a form: all versions (draft, published, archived), each openable read-only. */
export default function FormVersionsDialog({ clubId, formId, categories, onClose }: { clubId: string; formId: string; categories: ReadonlyArray<{ key: string; name: string }>; onClose: () => void }) {
    const { t, language } = useLanguage();
    const [versions, setVersions] = useState<FormVersionSummary[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [open, setOpen] = useState<number | null>(null);

    const load = useCallback(() => {
        setFailed(false);
        apiFetch<{ data: FormVersionSummary[] }>(`/forms/${formId}/versions?clubId=${clubId}`)
            .then((res) => setVersions(res.data))
            .catch(() => setFailed(true));
    }, [clubId, formId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);

    return (
        <Modal
            open
            size="lg"
            onClose={onClose}
            title={t('forms.editor.versions.title')}
            footer={
                <div className="flex justify-end">
                    <button type="button" onClick={onClose} className={secondaryButtonClass}>
                        {t('forms.editor.versions.close')}
                    </button>
                </div>
            }
        >
            {open !== null ? (
                <VersionView clubId={clubId} formId={formId} version={open} categories={categories} onBack={() => setOpen(null)} />
            ) : failed ? (
                <LoadError onRetry={load} />
            ) : !versions ? (
                <LoadingText />
            ) : versions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('forms.editor.versions.empty')}</p>
            ) : (
                <ul className="space-y-2">
                    {versions.map((v) => (
                        <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                            <div className="min-w-0">
                                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                                    {t('forms.editor.versions.version', { version: v.version })}
                                    <StatusChip status={v.status} />
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {v.publishedAt ? t('forms.editor.versions.publishedOn', { date: formatDate(v.publishedAt, language) }) : t('forms.editor.versions.changedOn', { date: formatDate(v.updatedAt, language) })} · {t('forms.editor.versions.fields', { count: v.fieldCount })}
                                </p>
                            </div>
                            <button type="button" onClick={() => setOpen(v.version)} className={secondaryButtonClass}>
                                {t('forms.editor.versions.view')}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Modal>
    );
}
