'use client';

import { AlertTriangle, ShieldAlert } from 'lucide-react';

import { Modal } from '@/components/Modal';
import { useLanguage } from '@/contexts/LanguageContext';
import { primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import { type ChangeSummary, type DescribedProblem, fieldTitle } from '@/lib/formEditor';

/** One problem in plain language: "Feld „Vorname“: <text>"; with a button to jump to the field. */
export function ProblemList({ problems, onGoToField, goLabel }: { problems: readonly DescribedProblem[]; onGoToField?: (fieldKey: string) => void; goLabel?: string }) {
    const { t } = useLanguage();
    return (
        <ul className="space-y-1.5">
            {problems.map((p, i) => (
                <li key={`${p.code}-${p.fieldKey ?? ''}-${i}`} className="flex flex-wrap items-start gap-x-2 gap-y-1 text-sm text-foreground">
                    <span className="min-w-0 break-words">
                        {p.fieldLabel !== null && <strong className="font-semibold">{t('forms.editor.problem.field', { label: p.fieldLabel })} </strong>}
                        {t(p.key)}
                    </span>
                    {onGoToField && p.fieldKey && (
                        <button type="button" onClick={() => onGoToField(p.fieldKey!)} className="text-xs font-semibold text-primary underline">
                            {goLabel ?? t('forms.editor.problem.goto')}
                        </button>
                    )}
                </li>
            ))}
        </ul>
    );
}

function ChangeLine({ labelKey, fields }: { labelKey: string; fields: ReadonlyArray<{ key: string; label: string }> }) {
    const { t } = useLanguage();
    if (fields.length === 0) return null;
    return (
        <li>
            <span className="font-medium">{t(labelKey, { count: fields.length })}:</span>{' '}
            <span className="break-words text-muted-foreground">{fields.map((f) => fieldTitle(f, f.key)).join(', ')}</span>
        </li>
    );
}

/**
 * Confirmation before a version goes live: what changes against the published version, the immutability warning
 * ("neue Anträge sehen die neue Version, bestehende behalten ihre"), the open checks and -- after a refused publish --
 * the server's problem list per field. Nothing is published from here; `onConfirm` does it.
 */
export default function FormPublishDialog({
    summary,
    publishedVersion,
    needsSave,
    checks,
    serverProblems,
    error,
    busy,
    onConfirm,
    onGoToField,
    onClose,
}: {
    summary: ChangeSummary;
    /** `null` = nothing is live yet. */
    publishedVersion: number | null;
    /** The editor has unsaved changes: they are saved as draft first. */
    needsSave: boolean;
    /** Problems already visible locally (they block publishing). */
    checks: DescribedProblem[];
    /** Problem list of the last refused publish. */
    serverProblems: DescribedProblem[] | null;
    error: string | null;
    busy: boolean;
    onConfirm: () => void;
    onGoToField: (fieldKey: string) => void;
    onClose: () => void;
}) {
    const { t } = useLanguage();
    const blocked = checks.length > 0;
    const nothing = summary.none && publishedVersion !== null;
    return (
        <Modal
            open
            size="lg"
            onClose={busy ? () => {} : onClose}
            title={t('forms.editor.publish.title')}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={busy} className={secondaryButtonClass}>
                        {t('forms.editor.publish.cancel')}
                    </button>
                    <button type="button" onClick={onConfirm} disabled={busy || blocked || nothing} className={primaryButtonClass}>
                        {busy ? t('forms.editor.publish.working') : needsSave ? t('forms.editor.publish.confirmSave') : t('forms.editor.publish.confirm')}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                    <div className="space-y-1">
                        <p className="font-semibold">{t('forms.editor.publish.warnTitle')}</p>
                        <p>{t('forms.editor.publish.warnBody')}</p>
                    </div>
                </div>

                <section>
                    <h3 className="text-sm font-bold text-foreground">{publishedVersion === null ? t('forms.editor.publish.changesFirst') : t('forms.editor.publish.changes', { version: publishedVersion })}</h3>
                    {nothing ? (
                        <p className="mt-1 text-sm text-muted-foreground">{t('forms.editor.publish.noChanges')}</p>
                    ) : (
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground">
                            <ChangeLine labelKey="forms.editor.publish.added" fields={summary.added} />
                            <ChangeLine labelKey="forms.editor.publish.changed" fields={summary.changed} />
                            <ChangeLine labelKey="forms.editor.publish.removed" fields={summary.removed} />
                            {summary.reordered && <li>{t('forms.editor.publish.reordered')}</li>}
                            {summary.privacyNoticeChanged && <li>{t('forms.editor.publish.privacyChanged')}</li>}
                        </ul>
                    )}
                    {summary.removed.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{t('forms.editor.publish.removedHint')}</p>}
                </section>

                {needsSave && <p className="text-sm text-muted-foreground">{t('forms.editor.publish.unsavedHint')}</p>}

                {blocked && (
                    <section role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                        <h3 className="flex items-center gap-1.5 text-sm font-bold text-destructive">
                            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                            {t('forms.editor.publish.blocked')}
                        </h3>
                        <div className="mt-2">
                            <ProblemList problems={checks} onGoToField={onGoToField} />
                        </div>
                    </section>
                )}

                {serverProblems && serverProblems.length > 0 && (
                    <section role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                        <h3 className="flex items-center gap-1.5 text-sm font-bold text-destructive">
                            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                            {t('forms.editor.publish.refused')}
                        </h3>
                        <div className="mt-2">
                            <ProblemList problems={serverProblems} onGoToField={onGoToField} />
                        </div>
                    </section>
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
