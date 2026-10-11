'use client';

import { useState } from 'react';

import { Modal } from '@/components/Modal';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import {
    allowedStatusesFromError,
    type ClubMember,
    formatDate,
    hasPendingExit,
    inputClass,
    isLeftStatus,
    memberErrorKey,
    primaryButtonClass,
    secondaryButtonClass,
    statusChipClass,
    STATUS_TRANSITIONS,
    todayIso,
    type MemberStatus,
} from '@/lib/clubMembers';

/**
 * "Status ändern": the only way to change a member's status (PATCH /club-members/:id rejects `status`).
 * POST /club-members/:id/transition, needs `members:write` -- the caller only opens this with that permission.
 */
export default function MemberStatusDialog({
    member,
    clubId,
    onClose,
    onDone,
}: {
    member: ClubMember;
    clubId: string;
    onClose: () => void;
    /** Called with the full member shape the backend returns. */
    onDone: (member: ClubMember) => void;
}) {
    const { t, language } = useLanguage();
    const from = member.effectiveStatus;
    const reopening = isLeftStatus(from);
    const pendingExit = hasPendingExit(member);

    // The matrix is a fallback; a 409 from the backend carries the authoritative `allowed` list.
    const [allowedOverride, setAllowedOverride] = useState<MemberStatus[] | null>(null);
    const allowed = allowedOverride ?? STATUS_TRANSITIONS[from] ?? [];
    const [target, setTarget] = useState<MemberStatus | ''>(allowed.length === 1 ? allowed[0]! : '');
    const [effectiveOn, setEffectiveOn] = useState(todayIso());
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const leaving = target !== '' && isLeftStatus(target);
    // Only a notice to a key date ("ausgetreten") may lie in the future.
    const allowFuture = target === 'ausgetreten';
    const reasonRequired = reopening;

    async function submit(body: Record<string, unknown>) {
        setBusy(true);
        setError(null);
        try {
            const res = await apiFetch<{ data?: ClubMember }>(`/club-members/${member.id}/transition?clubId=${clubId}`, {
                method: 'POST',
                body,
            });
            if (!res.data) throw new Error('Request failed');
            onDone(res.data);
        } catch (err) {
            const list = allowedStatusesFromError(err);
            if (list) {
                setAllowedOverride(list);
                if (target !== '' && !list.includes(target)) setTarget('');
            }
            setError(t(memberErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    function handleSave() {
        if (target === '') return;
        if (reasonRequired && !reason.trim()) {
            setError(t('verein.err.reasonRequired'));
            return;
        }
        if (leaving) {
            if (!effectiveOn) {
                setError(t('verein.status.err.date'));
                return;
            }
            if (member.joinedAt && effectiveOn < member.joinedAt.slice(0, 10)) {
                setError(t('verein.err.dateBeforeJoin'));
                return;
            }
            if (!allowFuture && effectiveOn > todayIso()) {
                setError(t('verein.err.dateFuture'));
                return;
            }
        }
        void submit({
            toStatus: target,
            ...(leaving ? { effectiveOn } : {}),
            ...(reason.trim() ? { reason: reason.trim() } : {}),
            ...(reopening ? { reopen: true } : {}),
        });
    }

    const future = leaving && allowFuture && effectiveOn > todayIso();

    return (
        <Modal
            open
            onClose={busy ? () => {} : onClose}
            title={t('verein.status.title', { name: member.name ?? '—' })}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={busy} className={secondaryButtonClass}>
                        {t('verein.roles.add.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={busy || target === ''}
                        className={leaving ? 'rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50' : primaryButtonClass}
                    >
                        {future ? t('verein.status.submit.schedule') : t('verein.status.submit')}
                    </button>
                </div>
            }
        >
            <p className="text-sm text-muted-foreground">
                {t('verein.status.current')}{' '}
                <span className={`ml-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusChipClass(from)}`}>{t(`verein.status.${from}`)}</span>
            </p>

            {pendingExit && (
                <div className="mt-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
                    <p>{t('verein.status.pendingExit', { date: formatDate(member.leftAt, language) })}</p>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => void submit({ toStatus: member.status })}
                        className="mt-2 rounded-md border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                    >
                        {t('verein.status.cancelExit')}
                    </button>
                </div>
            )}

            {reopening && <p className="mt-3 text-sm text-foreground">{t('verein.status.reopen.hint')}</p>}

            {allowed.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">{t('verein.status.noneAllowed')}</p>
            ) : (
                <fieldset className="mt-4">
                    <legend className="text-xs font-semibold text-muted-foreground">{t('verein.status.target')}</legend>
                    <div className="mt-1 flex flex-wrap gap-2">
                        {allowed.map((s) => (
                            <button
                                key={s}
                                type="button"
                                aria-pressed={target === s}
                                onClick={() => setTarget(s)}
                                className={`rounded-full border px-3 py-1 text-sm ${
                                    target === s ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:border-primary'
                                }`}
                            >
                                {t(`verein.status.${s}`)}
                            </button>
                        ))}
                    </div>
                </fieldset>
            )}

            {leaving && (
                <label className="mt-4 block text-xs font-semibold text-muted-foreground">
                    {allowFuture ? t('verein.status.date.exit') : t('verein.status.date.effective')}
                    <input
                        type="date"
                        value={effectiveOn}
                        min={member.joinedAt?.slice(0, 10) || undefined}
                        max={allowFuture ? undefined : todayIso()}
                        onChange={(e) => setEffectiveOn(e.target.value)}
                        className={`mt-1 ${inputClass}`}
                    />
                    {allowFuture && (
                        <span className="mt-1 block text-xs font-normal text-muted-foreground">
                            {future ? t('verein.status.date.futureHint') : t('verein.status.date.exitHint')}
                        </span>
                    )}
                </label>
            )}

            {target !== '' && (
                <label className="mt-4 block text-xs font-semibold text-muted-foreground">
                    {reasonRequired ? t('verein.status.reason.required') : t('verein.status.reason')}
                    <textarea
                        value={reason}
                        maxLength={1000}
                        rows={3}
                        onChange={(e) => setReason(e.target.value)}
                        className={`mt-1 ${inputClass}`}
                    />
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">{t('verein.status.reason.hint')}</span>
                </label>
            )}

            {error && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                    {error}
                </p>
            )}
        </Modal>
    );
}
