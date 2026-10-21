'use client';

import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError, apiFetch } from '@/lib/api-client';
import { inputClass, secondaryButtonClass } from '@/lib/clubMembers';
import { type ErasurePlan, erasureBlockerKey, privacyErrorKey } from '@/lib/privacyAdmin';
import { useConfirm } from '@/components/useConfirm';

/** Contributor keys of the erasure steps get a readable label; an unknown key (new backend contributor) is shown as it is. */
function stepLabel(t: (key: string) => string, key: string): string {
    const label = t(`privacy.erasure.step.${key}`);
    return label.startsWith('privacy.erasure.step.') ? key : label;
}

/** Plain-language reason why data of a step is kept; the backend's English text is never shown, unknown steps show none. */
function keptReasonLabel(t: (key: string) => string, key: string): string | null {
    const label = t(`privacy.erasure.kept.${key}`);
    return label.startsWith('privacy.erasure.kept.') ? null : label;
}

/**
 * Erasure of one member (Art. 17, `privacy:manage`), always in the same order: dry-run plan first (changes nothing), blockers
 * shown with a plain-language reason, then a double confirmation (the name has to be typed, then a second dialog) before the
 * irreversible execution. The plan carries a digest; if the data changed in between the server answers `plan_outdated` and the
 * plan is calculated again. The legal hold (`PUT .../legal-hold`) is controlled here too: while it is set, erasure is refused.
 */
export default function MemberErasureSection({ clubId, clubMemberId, displayName, onErased }: { clubId: string; clubMemberId: string; displayName: string; onErased: () => void }) {
    const { t } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const base = `/club-members/${encodeURIComponent(clubMemberId)}`;
    const query = `?clubId=${encodeURIComponent(clubId)}`;
    const [plan, setPlan] = useState<ErasurePlan | null>(null);
    const [typed, setTyped] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [erased, setErased] = useState(false);
    const [holdReason, setHoldReason] = useState('');
    const [holdNote, setHoldNote] = useState<string | null>(null);

    async function calculate() {
        setBusy(true);
        setError(null);
        setTyped('');
        try {
            setPlan((await apiFetch<{ data: ErasurePlan }>(`${base}/erasure/plan${query}`, { method: 'POST' })).data);
        } catch (err) {
            setPlan(null);
            setError(t(privacyErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    async function execute() {
        if (!plan) return;
        const ok = await confirm({
            title: t('privacy.erasure.confirm.title'),
            body: t('privacy.erasure.confirm.body', { name: plan.displayName }),
            confirmLabel: t('privacy.erasure.confirm.action'),
            danger: true,
        });
        if (!ok) return;
        setBusy(true);
        setError(null);
        try {
            await apiFetch(`${base}/erasure/execute${query}`, { method: 'POST', body: { planDigest: plan.planDigest, confirm: true } });
            setErased(true);
            setPlan(null);
            onErased();
        } catch (err) {
            // The data changed since the plan: show the new plan instead of the stale one, next to the reason.
            const outdated = err instanceof ApiError && ((err.details as { code?: unknown } | undefined)?.code ?? err.code) === 'plan_outdated';
            if (outdated) await calculate().catch(() => undefined);
            setError(t(privacyErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    async function setHold(active: boolean) {
        if (active && !holdReason.trim()) {
            setError(t('privacy.erasure.hold.reasonRequired'));
            return;
        }
        setBusy(true);
        setError(null);
        setHoldNote(null);
        try {
            await apiFetch(`${base}/legal-hold${query}`, { method: 'PUT', body: active ? { active: true, reason: holdReason.trim() } : { active: false } });
            setHoldNote(t(active ? 'privacy.erasure.hold.set' : 'privacy.erasure.hold.lifted'));
            setHoldReason('');
            if (plan) await calculate();
        } catch (err) {
            setError(t(privacyErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    if (erased) return <p role="status" className="text-sm text-success">{t('privacy.erasure.done')}</p>;

    const blocked = !!plan && plan.blockers.length > 0;
    const nameMatches = typed.trim().toLowerCase() === displayName.trim().toLowerCase() && typed.trim() !== '';

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('privacy.erasure.intro')}</p>
            <button type="button" disabled={busy} onClick={() => void calculate()} className={secondaryButtonClass}>
                {t(plan ? 'privacy.erasure.recalculate' : 'privacy.erasure.plan')}
            </button>

            {plan && blocked && (
                <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                        <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                        {t('privacy.erasure.blocked')}
                    </p>
                    <ul className="mt-2 list-inside list-disc text-sm text-foreground">
                        {plan.blockers.map((b) => (
                            <li key={b.code}>{t(erasureBlockerKey(b.code))}</li>
                        ))}
                    </ul>
                </div>
            )}

            {plan && !blocked && (
                <div className="space-y-3">
                    <p className="text-sm text-foreground">{t('privacy.erasure.planIntro')}</p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs uppercase text-muted-foreground">
                                <tr>
                                    <th className="px-3 py-2">{t('privacy.erasure.col.area')}</th>
                                    <th className="px-3 py-2">{t('privacy.erasure.col.deleted')}</th>
                                    <th className="px-3 py-2">{t('privacy.erasure.col.anonymized')}</th>
                                    <th className="px-3 py-2">{t('privacy.erasure.col.kept')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {plan.steps.map((s) => (
                                    <tr key={s.key} className="border-t border-border align-top text-foreground">
                                        <td className="px-3 py-2 font-medium">{stepLabel(t, s.key)}</td>
                                        <td className="px-3 py-2">{s.deleted}</td>
                                        <td className="px-3 py-2">{s.anonymized}</td>
                                        <td className="px-3 py-2">
                                            {s.kept}
                                            {s.kept > 0 && keptReasonLabel(t, s.key) && <span className="block text-xs text-muted-foreground">{keptReasonLabel(t, s.key)}</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-sm font-medium text-destructive">{t('privacy.erasure.irreversible')}</p>
                    <label className="block max-w-sm">
                        <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('privacy.erasure.typeName', { name: displayName })}</span>
                        <input value={typed} onChange={(e) => setTyped(e.target.value)} className={inputClass} autoComplete="off" />
                    </label>
                    <button type="button" disabled={busy || !nameMatches} onClick={() => void execute()} className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                        {t('privacy.erasure.execute')}
                    </button>
                </div>
            )}

            <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                <h4 className="text-sm font-semibold text-foreground">{t('privacy.erasure.hold.title')}</h4>
                <p className="text-xs text-muted-foreground">{t('privacy.erasure.hold.intro')}</p>
                <div className="flex flex-wrap items-end gap-2">
                    <label className="block min-w-60 flex-1">
                        <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('privacy.erasure.hold.reason')}</span>
                        <input value={holdReason} maxLength={200} onChange={(e) => setHoldReason(e.target.value)} className={inputClass} />
                    </label>
                    <button type="button" disabled={busy} onClick={() => void setHold(true)} className={secondaryButtonClass}>
                        {t('privacy.erasure.hold.setAction')}
                    </button>
                    <button type="button" disabled={busy} onClick={() => void setHold(false)} className={secondaryButtonClass}>
                        {t('privacy.erasure.hold.liftAction')}
                    </button>
                </div>
                {holdNote && (
                    <p role="status" className="text-sm text-success">
                        {holdNote}
                    </p>
                )}
            </div>

            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
            {dialog}
        </div>
    );
}
