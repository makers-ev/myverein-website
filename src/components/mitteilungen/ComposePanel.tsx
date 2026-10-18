'use client';

import { useEffect, useMemo, useState } from 'react';

import { inputClass, primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import {
    type Announcement,
    type Audience,
    type AudiencePreview,
    type Channel,
    type CommunicationGate,
    OPTIONAL_CHANNELS,
    audienceIsEmpty,
    buildChannels,
    cleanAudience,
    communicationErrorKey,
    composeProblem,
    confirmationFromError,
    emptyAudience,
    isoToLocalInput,
    localInputToIso,
    needsConfirmation,
    previewAudience,
    saveAnnouncement,
    sendAnnouncement,
} from '@/lib/communication';
import { useLanguage } from '@/contexts/LanguageContext';
import { useConfirm } from '@/components/useConfirm';
import { Toggle } from '@/components/standorte/ui';
import AudiencePicker, { type PickedMember, type PickerDepartment } from './AudiencePicker';

const TITLE_MAX = 200;
const BODY_MAX = 10000;

function PreviewBox({ state, channels }: { state: 'idle' | 'loading' | 'error' | { counts: AudiencePreview }; channels: Channel[] }) {
    const { t } = useLanguage();
    if (state === 'idle') return <p className="text-sm text-muted-foreground">{t('mitteilungen.preview.idle')}</p>;
    if (state === 'loading')
        return (
            <p role="status" className="text-sm text-muted-foreground">
                {t('common.loading')}
            </p>
        );
    if (state === 'error')
        return (
            <p role="alert" className="text-sm text-destructive">
                {t('mitteilungen.preview.error')}
            </p>
        );
    const c = state.counts;
    return (
        <div role="status" aria-live="polite" className="space-y-1 text-sm text-foreground">
            <p className="font-semibold">{t('mitteilungen.preview.reach', { reachable: c.reachable, total: c.total })}</p>
            <ul className="space-y-0.5 text-xs text-muted-foreground">
                {channels.includes('email') && <li>{t('mitteilungen.preview.emailOnly', { count: c.emailOnly })}</li>}
                {channels.includes('push') && <li>{t('mitteilungen.preview.push', { count: c.push })}</li>}
                {c.unreachable > 0 && <li className="text-warning">{t('mitteilungen.preview.unreachable', { count: c.unreachable })}</li>}
                {c.sharedAddress > 0 && <li>{t('mitteilungen.preview.shared', { count: c.sharedAddress })}</li>}
            </ul>
        </div>
    );
}

/**
 * Compose area "Mitteilungen" (W1): title/text, audience, channels, urgent (only `announcements:write`), pin, expiry,
 * scheduling, a live count preview (counts only, never a person list) and a confirmation dialog for large sends.
 * Saves a draft or sends/schedules; an existing draft/scheduled announcement can be edited via `initial`.
 */
export default function ComposePanel({
    clubId,
    gate,
    departments,
    initial,
    onDone,
}: {
    clubId: string;
    gate: CommunicationGate;
    /** Departments the author may address (already restricted to the own ones for the department scope). */
    departments: PickerDepartment[];
    initial?: Announcement | null;
    onDone: (result: { kind: 'draft' | 'sent' | 'scheduled'; announcement: Announcement | null }) => void;
}) {
    const { t } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const [id, setId] = useState<string | null>(initial?.id ?? null);
    const [title, setTitle] = useState(initial?.title ?? '');
    const [body, setBody] = useState(initial?.body ?? '');
    const [audience, setAudience] = useState<Audience>({ ...emptyAudience(), ...(initial?.audience ?? {}) });
    const [picked, setPicked] = useState<PickedMember[]>([]);
    const [optional, setOptional] = useState<Channel[]>((initial?.channels ?? ['in_app', 'email']).filter((c) => c !== 'in_app'));
    const [urgent, setUrgent] = useState(gate.canUrgent && !!initial?.urgent);
    const [pinned, setPinned] = useState(!!initial?.pinned);
    const [expiresAt, setExpiresAt] = useState(isoToLocalInput(initial?.expiresAt));
    const [schedule, setSchedule] = useState(!!initial?.publishAt && initial.status === 'scheduled');
    const [publishAt, setPublishAt] = useState(isoToLocalInput(initial?.publishAt));
    const [busy, setBusy] = useState<null | 'draft' | 'send'>(null);
    const [error, setError] = useState<string | null>(null);

    const channels = useMemo(() => buildChannels(optional), [optional]);

    // Debounced count preview, keyed by the request so a stale answer is never shown for a newer selection.
    const previewKey = useMemo(() => JSON.stringify([cleanAudience(audience), channels]), [audience, channels]);
    const [preview, setPreview] = useState<{ key: string; counts: AudiencePreview } | { key: string; error: true } | null>(null);
    const empty = audienceIsEmpty(audience);

    useEffect(() => {
        if (empty) return;
        let cancelled = false;
        const handle = setTimeout(() => {
            previewAudience(clubId, audience, channels)
                .then((counts) => {
                    if (!cancelled) setPreview({ key: previewKey, counts });
                })
                .catch(() => {
                    if (!cancelled) setPreview({ key: previewKey, error: true });
                });
        }, 400);
        return () => {
            cancelled = true;
            clearTimeout(handle);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId, previewKey, empty]);

    const current = preview && preview.key === previewKey ? preview : null;
    const previewState: 'idle' | 'loading' | 'error' | { counts: AudiencePreview } = empty ? 'idle' : !current ? 'loading' : 'error' in current ? 'error' : { counts: current.counts };
    const counts = typeof previewState === 'object' ? previewState.counts : null;

    const problem = composeProblem({ title, body, audience, schedule, publishAt, expiresAt });

    function payload() {
        return {
            title: title.trim(),
            body: body.trim(),
            audience: cleanAudience(audience),
            channels,
            urgent: gate.canUrgent && urgent,
            pinned,
            publishAt: schedule ? localInputToIso(publishAt) : null,
            expiresAt: localInputToIso(expiresAt),
        };
    }

    async function persist(): Promise<Announcement> {
        const saved = await saveAnnouncement(clubId, id, payload());
        setId(saved.id);
        return saved;
    }

    async function saveDraft() {
        setBusy('draft');
        setError(null);
        try {
            const saved = await persist();
            onDone({ kind: 'draft', announcement: saved });
        } catch (err) {
            setError(t(communicationErrorKey(err)));
        } finally {
            setBusy(null);
        }
    }

    async function send() {
        if (problem) return;
        const when = schedule ? localInputToIso(publishAt) : null;
        const ask = (recipients: number) =>
            confirm({
                title: t('mitteilungen.confirm.title'),
                body: (
                    <div className="space-y-2">
                        <p>{t(schedule ? 'mitteilungen.confirm.body.schedule' : 'mitteilungen.confirm.body', { count: recipients })}</p>
                        <p className="font-semibold">{title.trim()}</p>
                    </div>
                ),
                confirmLabel: t(schedule ? 'mitteilungen.confirm.schedule' : 'mitteilungen.confirm.send', { count: recipients }),
            });

        setBusy('send');
        setError(null);
        try {
            const saved = await persist();
            let confirmRecipients: number | undefined;
            if (counts && needsConfirmation(counts.total)) {
                if (!(await ask(counts.total))) return;
                confirmRecipients = counts.total;
            }
            try {
                await sendAnnouncement(clubId, saved.id, { publishAt: when, ...(confirmRecipients !== undefined ? { confirmRecipients } : {}) });
            } catch (err) {
                // The club's threshold differs from the default: ask once with the count the backend names.
                const needed = confirmationFromError(err);
                if (!needed || !(await ask(needed.recipients))) {
                    if (needed) return;
                    throw err;
                }
                await sendAnnouncement(clubId, saved.id, { publishAt: when, confirmRecipients: needed.recipients });
            }
            onDone({ kind: schedule ? 'scheduled' : 'sent', announcement: saved });
        } catch (err) {
            setError(t(communicationErrorKey(err)));
        } finally {
            setBusy(null);
        }
    }

    const problemText = problem ? t(`mitteilungen.problem.${problem}`) : null;
    const departmentScopeOnly = !gate.writeAll;

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                void send();
            }}
            className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
        >
            <div className="space-y-5">
                {departmentScopeOnly && <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{t('mitteilungen.scope.department')}</p>}
                <div>
                    <label htmlFor="ann-title" className="mb-1 block text-xs font-semibold text-muted-foreground">
                        {t('mitteilungen.field.title')} *
                    </label>
                    <input id="ann-title" value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} className={inputClass} required />
                </div>
                <div>
                    <label htmlFor="ann-body" className="mb-1 block text-xs font-semibold text-muted-foreground">
                        {t('mitteilungen.field.body')} *
                    </label>
                    <textarea id="ann-body" rows={8} value={body} maxLength={BODY_MAX} onChange={(e) => setBody(e.target.value)} className={inputClass} required aria-describedby="ann-body-hint" />
                    <p id="ann-body-hint" className="mt-1 text-xs text-muted-foreground">
                        {t('mitteilungen.field.body.hint', { count: body.length, max: BODY_MAX })}
                    </p>
                </div>

                <section className="space-y-3 rounded-xl border border-border bg-card p-4">
                    <h3 className="text-sm font-bold text-foreground">{t('mitteilungen.section.audience')}</h3>
                    <AudiencePicker clubId={clubId} gate={gate} departments={departments} value={audience} pickedMembers={picked} onChange={setAudience} onPickedMembersChange={setPicked} />
                </section>

                <section className="space-y-3 rounded-xl border border-border bg-card p-4">
                    <h3 className="text-sm font-bold text-foreground">{t('mitteilungen.section.channels')}</h3>
                    <p className="text-xs text-muted-foreground">{t('mitteilungen.channels.inapp')}</p>
                    <div className="flex flex-wrap gap-4">
                        {OPTIONAL_CHANNELS.map((c) => (
                            <label key={c} className="flex items-center gap-2 text-sm text-foreground">
                                <input
                                    type="checkbox"
                                    checked={optional.includes(c)}
                                    onChange={() => setOptional((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))}
                                    className="h-4 w-4 accent-primary"
                                />
                                {t(`mitteilungen.channel.${c}`)}
                            </label>
                        ))}
                    </div>
                </section>

                <section className="space-y-4 rounded-xl border border-border bg-card p-4">
                    <h3 className="text-sm font-bold text-foreground">{t('mitteilungen.section.options')}</h3>
                    {gate.canUrgent && (
                        <div className="space-y-1">
                            <Toggle checked={urgent} onChange={setUrgent} label={t('mitteilungen.option.urgent')} />
                            <p className="text-xs text-muted-foreground">{t('mitteilungen.option.urgent.hint')}</p>
                        </div>
                    )}
                    <div className="space-y-1">
                        <Toggle checked={pinned} onChange={setPinned} label={t('mitteilungen.option.pinned')} />
                        <p className="text-xs text-muted-foreground">{t('mitteilungen.option.pinned.hint')}</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="ann-expires" className="mb-1 block text-xs font-semibold text-muted-foreground">
                                {t('mitteilungen.option.expires')}
                            </label>
                            <input id="ann-expires" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={`${inputClass} [color-scheme:light] dark:[color-scheme:dark]`} />
                            <p className="mt-1 text-xs text-muted-foreground">{t('mitteilungen.option.expires.hint')}</p>
                        </div>
                        <div className="space-y-2">
                            <Toggle checked={schedule} onChange={setSchedule} label={t('mitteilungen.option.schedule')} />
                            {schedule && (
                                <input
                                    type="datetime-local"
                                    value={publishAt}
                                    onChange={(e) => setPublishAt(e.target.value)}
                                    aria-label={t('mitteilungen.option.schedule.at')}
                                    className={`${inputClass} [color-scheme:light] dark:[color-scheme:dark]`}
                                />
                            )}
                        </div>
                    </div>
                </section>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
                <section className="space-y-2 rounded-xl border border-border bg-card p-4">
                    <h3 className="text-sm font-bold text-foreground">{t('mitteilungen.preview.title')}</h3>
                    <PreviewBox state={previewState} channels={channels} />
                </section>
                {error && (
                    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                    </p>
                )}
                {problemText && <p className="text-xs text-muted-foreground">{problemText}</p>}
                <div className="flex flex-col gap-2">
                    <button type="submit" disabled={busy !== null || problem !== null} className={`${primaryButtonClass} justify-center`}>
                        {busy === 'send' ? t('mitteilungen.action.sending') : t(schedule ? 'mitteilungen.action.schedule' : 'mitteilungen.action.send')}
                    </button>
                    <button type="button" onClick={() => void saveDraft()} disabled={busy !== null || !title.trim() || !body.trim()} className={`${secondaryButtonClass} justify-center`}>
                        {t('mitteilungen.action.draft')}
                    </button>
                </div>
                <p className="text-xs text-muted-foreground">{t('mitteilungen.send.hint')}</p>
            </aside>
            {dialog}
        </form>
    );
}
