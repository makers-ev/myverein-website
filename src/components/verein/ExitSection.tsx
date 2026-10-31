'use client';

import { useCallback, useEffect, useState } from 'react';
import { DoorOpen } from 'lucide-react';

import FormRenderer, { focusField } from '@/components/forms/FormRenderer';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { Modal } from '@/components/Modal';
import { Chip, EmptyState, errorMessage, SectionCard, type Tone } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { formatDate, inputClass, isLeftStatus, secondaryButtonClass, todayIso } from '@/lib/clubMembers';
import { exitDialogTouched, exitFormFields, exitRequestBody, plainExitBody, repinExit } from '@/lib/exitForm';
import { useConfirm } from '@/components/useConfirm';
import { type Answers, type FieldErrorCode, fieldErrorsFromError, type FormDefinition, formErrorKey, validateAnswers } from '@/lib/formSchema';
import { selfExitErrorKey, canWithdraw, type ExitRequest, isOwnerOrgRole, type NoticePreview, noticeRuleText } from '@/lib/memberLifecycle';

const statusTone: Record<ExitRequest['status'], Tone> = { pending: 'warning', approved: 'primary', rejected: 'destructive', withdrawn: 'muted' };

const dangerButtonClass = 'rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50';

/**
 * "Mitgliedschaft kündigen" in Mein Profil (Wave 7 W4): shows the club's notice rule (`GET /club-exit-requests/preview`),
 * files a cancellation (`POST /club-exit-requests`), shows the open / scheduled request and lets the member withdraw it
 * (`POST /:id/withdraw`). The backend decides everything; the owner of the club cannot cancel (409 `owner_protected`),
 * so the button is replaced by a hint for them.
 */
export default function ExitSection({
    clubId,
    orgRole,
    effectiveStatus,
    onChanged,
}: {
    clubId: string;
    orgRole: string | null | undefined;
    effectiveStatus: string | undefined;
    /** A request was filed or withdrawn: the parent reloads the own membership. */
    onChanged: () => void;
}) {
    const { t, language } = useLanguage();
    const [requests, setRequests] = useState<ExitRequest[] | null>(null);
    const [preview, setPreview] = useState<NoticePreview | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [dialog, setDialog] = useState<'cancel' | 'withdraw' | null>(null);
    const [flash, setFlash] = useState<string | null>(null);

    const owner = isOwnerOrgRole(orgRole);
    const left = !!effectiveStatus && isLeftStatus(effectiveStatus);

    const load = useCallback(async () => {
        setLoadError(null);
        try {
            const [mine, notice] = await Promise.all([
                apiFetch<{ data: ExitRequest[] }>(`/club-exit-requests/mine?clubId=${clubId}`),
                apiFetch<{ data: NoticePreview }>(`/club-exit-requests/preview?clubId=${clubId}`),
            ]);
            setRequests(mine.data);
            setPreview(notice.data);
        } catch (err) {
            setLoadError(errorMessage(err, t));
        }
        // `t` changes identity on every render of the language provider; the text of an old error is not worth a reload.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    if (left) return null;

    const today = todayIso();
    const open = requests?.find((r) => r.status === 'pending') ?? null;
    const scheduled = requests?.find((r) => r.status === 'approved' && r.kind === 'cancellation' && canWithdraw(r, today)) ?? null;
    const active = open ?? scheduled;
    const history = (requests ?? []).filter((r) => r.id !== active?.id);

    return (
        <SectionCard title={t('verein.exit.title')}>
            {loadError ? (
                <div role="alert" className="text-sm text-destructive">
                    {loadError}{' '}
                    <button type="button" onClick={() => void load()} className="font-semibold underline">
                        {t('verein.common.retry')}
                    </button>
                </div>
            ) : requests === null || preview === null ? (
                <p role="status" className="text-sm text-muted-foreground">
                    {t('verein.exit.loading')}
                </p>
            ) : (
                <div className="space-y-4">
                    {flash && (
                        <p role="status" className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-foreground">
                            {flash}
                        </p>
                    )}

                    {active ? (
                        <div className="rounded-lg border border-border p-3 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                                <Chip tone={statusTone[active.status]}>{t(`verein.exit.status.${active.status}`)}</Chip>
                                <span className="font-medium text-foreground">
                                    {active.status === 'pending'
                                        ? t('verein.exit.mine.pending')
                                        : t('verein.exit.mine.scheduled', { date: formatDate(active.effectiveOn, language) })}
                                </span>
                            </div>
                            <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                                <div>
                                    {t('verein.exit.requestedOn')}: {formatDate(active.requestedOn, language)}
                                </div>
                                {active.status === 'pending' && (
                                    <>
                                        {active.desiredEffectiveOn && (
                                            <div>
                                                {t('verein.exit.desired')}: {formatDate(active.desiredEffectiveOn, language)}
                                            </div>
                                        )}
                                        <div>
                                            {t('verein.exit.earliest')}: {formatDate(active.earliestEffectiveOn, language)}
                                        </div>
                                    </>
                                )}
                                {active.reason && (
                                    <div>
                                        {t('verein.exit.reason')}: {active.reason}
                                    </div>
                                )}
                            </dl>
                            {active.status === 'pending' && <p className="mt-2 text-xs text-muted-foreground">{t('verein.exit.mine.pendingHint')}</p>}
                            <button type="button" onClick={() => setDialog('withdraw')} className={`mt-3 ${secondaryButtonClass}`}>
                                {active.status === 'pending' ? t('verein.exit.withdraw') : t('verein.exit.withdraw.scheduled')}
                            </button>
                        </div>
                    ) : owner ? (
                        <p className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-foreground">{t('verein.exit.owner')}</p>
                    ) : (
                        <div>
                            <p className="text-sm text-muted-foreground">
                                {t(noticeRuleText(preview).key, noticeRuleText(preview).params)}{' '}
                                {t('verein.exit.earliestToday', { date: formatDate(preview.earliestEffectiveOn, language) })}
                            </p>
                            <button type="button" onClick={() => setDialog('cancel')} className={`mt-3 ${dangerButtonClass}`}>
                                {t('verein.exit.cancel')}
                            </button>
                        </div>
                    )}

                    {history.length > 0 && (
                        <div>
                            <h3 className="text-xs font-semibold text-muted-foreground">{t('verein.exit.history')}</h3>
                            <ul className="mt-2 space-y-2">
                                {history.map((r) => (
                                    <li key={r.id} className="rounded-lg border border-border p-2 text-xs text-foreground">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Chip tone={statusTone[r.status]}>{t(`verein.exit.status.${r.status}`)}</Chip>
                                            <span>{t('verein.exit.requestedOn')}: {formatDate(r.requestedOn, language)}</span>
                                        </div>
                                        {r.decisionNote && (
                                            <p className="mt-1 text-muted-foreground">
                                                {t('verein.exit.decisionNote')}: {r.decisionNote}
                                            </p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {!active && !owner && history.length === 0 && (
                        <EmptyState icon={<DoorOpen className="h-6 w-6" aria-hidden="true" />} text={t('verein.exit.empty')} />
                    )}
                </div>
            )}

            {dialog === 'cancel' && preview && (
                <CancelDialog
                    clubId={clubId}
                    preview={preview}
                    onClose={() => setDialog(null)}
                    onDone={(adjusted, earliest) => {
                        setDialog(null);
                        setFlash(adjusted ? t('verein.exit.filed.adjusted', { date: formatDate(earliest, language) }) : t('verein.exit.filed'));
                        void load();
                        onChanged();
                    }}
                />
            )}
            {dialog === 'withdraw' && active && (
                <WithdrawDialog
                    clubId={clubId}
                    request={active}
                    onClose={() => setDialog(null)}
                    onDone={() => {
                        setDialog(null);
                        setFlash(t('verein.exit.withdrawn'));
                        void load();
                        onChanged();
                    }}
                />
            )}
        </SectionCard>
    );
}

function CancelDialog({
    clubId,
    preview,
    onClose,
    onDone,
}: {
    clubId: string;
    preview: NoticePreview;
    onClose: () => void;
    onDone: (adjustedToEarliest: boolean, earliest: string | null) => void;
}) {
    const { t, language } = useLanguage();
    const [definition, setDefinition] = useState<FormDefinition | null>(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [desired, setDesired] = useState('');
    const [answers, setAnswers] = useState<Answers>({});
    const [errors, setErrors] = useState<Record<string, FieldErrorCode>>({});
    const [notice, setNotice] = useState<string | null>(null);
    // The form could not be loaded even after a retry: the person may cancel without it (date and plain reason only).
    const [withoutForm, setWithoutForm] = useState(false);
    const [reason, setReason] = useState('');
    const { confirm, dialog } = useConfirm();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const rule = noticeRuleText(preview);

    // The club's published exit form (default: optional reason + confirmation). Loaded when the dialog opens.
    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data: FormDefinition }>(`/club-exit-requests/form?clubId=${clubId}`)
            .then((res) => {
                if (cancelled) return;
                setDefinition(res.data);
                setLoadFailed(false);
            })
            .catch(() => {
                if (!cancelled) setLoadFailed(true);
            });
        return () => {
            cancelled = true;
        };
    }, [clubId, attempt]);

    async function requestClose() {
        const touched = exitDialogTouched(desired, answers) || reason.trim() !== '';
        if (touched && !(await confirm({ title: t('forms.confirm.discard.title'), body: t('verein.form.discard'), confirmLabel: t('forms.confirm.discard.confirm'), danger: true }))) return;
        onClose();
    }

    async function submit() {
        if (!definition && !withoutForm) return;
        // Upload fields are neither shown nor required here: the dialog has no upload, and a cancellation must never be blocked by one.
        const fields = definition ? exitFormFields(definition.fields) : [];
        const local = definition ? validateAnswers(fields, answers, { mode: 'submit' }) : {};
        if (Object.keys(local).length > 0) {
            setErrors(local);
            setError(t('forms.err.fieldsInvalid'));
            focusField('exit', Object.keys(local)[0]!);
            return;
        }
        setBusy(true);
        setError(null);
        setErrors({});
        try {
            const res = await apiFetch<{ data: ExitRequest & { adjustedToEarliest?: boolean } }>(`/club-exit-requests?clubId=${clubId}`, {
                method: 'POST',
                body: definition ? exitRequestBody(desired, definition, answers) : plainExitBody(desired, reason),
            });
            onDone(res.data.adjustedToEarliest === true, res.data.earliestEffectiveOn);
        } catch (err) {
            const repin = definition ? repinExit(err, definition, answers) : null;
            if (repin) {
                setError(null);
                setErrors({});
                // The club changed the form meanwhile: show the new one with the answers that still fit, nothing was filed.
                setDefinition(repin.definition);
                setAnswers(repin.answers);
                setNotice(repin.dropped.length > 0 ? t('forms.exit.outdated.lost', { fields: repin.dropped.join(', ') }) : t('forms.exit.outdated'));
            } else {
                const fieldErrors = fieldErrorsFromError(err);
                if (fieldErrors) setErrors(fieldErrors);
                setError(t(selfExitErrorKey(err, formErrorKey)));
            }
            setBusy(false);
        }
    }

    return (
        <Modal
            open
            size="lg"
            onClose={busy ? () => {} : () => void requestClose()}
            title={t('verein.exit.dialog.title')}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => void requestClose()} disabled={busy} className={secondaryButtonClass}>
                        {t('verein.roles.add.cancel')}
                    </button>
                    <button type="button" onClick={() => void submit()} disabled={busy || (!definition && !withoutForm)} className={dangerButtonClass}>
                        {t('verein.exit.dialog.submit')}
                    </button>
                </div>
            }
        >
            <p className="text-sm text-foreground">{t('verein.exit.dialog.body')}</p>
            <p className="mt-2 text-sm text-muted-foreground">
                {t(rule.key, rule.params)} {t('verein.exit.earliestToday', { date: formatDate(preview.earliestEffectiveOn, language) })}
            </p>
            <label className="mt-4 block text-xs font-semibold text-muted-foreground">
                {t('verein.exit.dialog.desired')}
                <input type="date" value={desired} min={preview.earliestEffectiveOn} onChange={(e) => setDesired(e.target.value)} className={`mt-1 ${inputClass}`} />
                <span className="mt-1 block text-xs font-normal">{t('verein.exit.dialog.desiredHint')}</span>
            </label>
            {notice && (
                <p role="status" className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
                    {notice}
                </p>
            )}
            <div className="mt-4">
                {withoutForm ? (
                    <div>
                        <p role="status" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
                            {t('forms.exit.withoutForm')}
                        </p>
                        <label className="mt-3 block text-xs font-semibold text-muted-foreground">
                            {t('verein.exit.dialog.reason')}
                            <textarea value={reason} maxLength={2000} rows={3} onChange={(e) => setReason(e.target.value)} className={`mt-1 ${inputClass}`} />
                        </label>
                    </div>
                ) : loadFailed ? (
                    <div>
                        <LoadError onRetry={() => { setLoadFailed(false); setAttempt((n) => n + 1); }} />
                        {attempt >= 1 && (
                            <button type="button" onClick={() => setWithoutForm(true)} className={`mt-3 ${secondaryButtonClass}`}>
                                {t('forms.exit.skipForm')}
                            </button>
                        )}
                    </div>
                ) : !definition ? (
                    <LoadingText />
                ) : (
                    <FormRenderer fields={exitFormFields(definition.fields)} privacyNotice={definition.privacyNotice} answers={answers} errors={errors} idPrefix="exit" disabled={busy} onChange={(key, value) => {
                        setAnswers((a) => ({ ...a, [key]: value }));
                        setErrors((e) => {
                            if (!(key in e)) return e;
                            const copy = { ...e };
                            delete copy[key];
                            return copy;
                        });
                    }} />
                )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{t('verein.exit.dialog.approvalHint')}</p>
            {error && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                    {error}
                </p>
            )}
            {dialog}
        </Modal>
    );
}

function WithdrawDialog({ clubId, request, onClose, onDone }: { clubId: string; request: ExitRequest; onClose: () => void; onDone: () => void }) {
    const { t } = useLanguage();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit() {
        setBusy(true);
        setError(null);
        try {
            await apiFetch(`/club-exit-requests/${request.id}/withdraw?clubId=${clubId}`, { method: 'POST', body: {} });
            onDone();
        } catch (err) {
            setError(errorMessage(err, t));
            setBusy(false);
        }
    }

    return (
        <Modal
            open
            onClose={busy ? () => {} : onClose}
            title={t('verein.exit.withdraw.title')}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={busy} className={secondaryButtonClass}>
                        {t('verein.roles.add.cancel')}
                    </button>
                    <button type="button" onClick={() => void submit()} disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                        {t('verein.exit.withdraw.submit')}
                    </button>
                </div>
            }
        >
            <p className="text-sm text-foreground">{request.status === 'pending' ? t('verein.exit.withdraw.bodyPending') : t('verein.exit.withdraw.bodyScheduled')}</p>
            {error && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                    {error}
                </p>
            )}
        </Modal>
    );
}
