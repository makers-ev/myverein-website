'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api-client';
import { fromDatetimeLocal } from '@/lib/meetings';
import {
    type AgendaItem,
    type AssemblyRules,
    type Ballot,
    type BallotDetail,
    MAJORITY_TOPICS,
    assemblyErrorKey,
    ballotActions,
    missingFromError,
    optionLabel,
} from '@/lib/assembly';
import { useLanguage } from '@/contexts/LanguageContext';
import { dangerBtn, inputClass, labelClass, primaryBtn, secondaryBtn } from '@/components/kalender/calendarTypes';
import { SectionCard, Toggle } from '@/components/standorte/ui';
import { Modal } from '@/components/Modal';
import { useConfirm } from '@/components/useConfirm';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import BallotResult from '@/components/assembly/BallotResult';
import { ErrorText, Notice, formatWhen } from '@/components/assembly/shared';

interface VotesResponse {
    secret: boolean;
    votes: Array<{ optionId: string; clubMemberId?: string | null; displayName?: string | null }>;
}

const STATUS_TONE: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    open: 'bg-primary/10 text-primary',
    closed: 'bg-warning/15 text-warning',
    counted: 'bg-warning/15 text-warning',
    finalized: 'bg-success/15 text-success',
    cancelled: 'bg-destructive/15 text-destructive',
};

export function BallotCard({ clubId, ballot, onChanged }: { clubId: string; ballot: Ballot; onChanged: () => void }) {
    const { t, language } = useLanguage();
    const [detail, setDetail] = useState<BallotDetail | null>(null);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [votes, setVotes] = useState<VotesResponse | null>(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [opensAt, setOpensAt] = useState('');
    const [closesAt, setClosesAt] = useState('');
    const { confirm, dialog } = useConfirm();

    const loadDetail = useCallback(async () => {
        try {
            const res = await apiFetch<{ data: BallotDetail }>(`/ballots/${ballot.id}?clubId=${clubId}`);
            setDetail(res.data);
        } catch (err) {
            setError(t(assemblyErrorKey(err)));
        }
    }, [ballot.id, clubId, t]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (open) void loadDetail();
    }, [open, loadDetail, ballot.status]);

    const view: Ballot | BallotDetail = detail ?? ballot;
    const actions = ballotActions(view);
    const circular = view.mode === 'circular';

    async function act(path: string, body?: unknown, method: 'POST' | 'DELETE' = 'POST') {
        setBusy(true);
        setError(null);
        try {
            const res = await apiFetch<{ data?: BallotDetail } | null>(`/ballots/${ballot.id}${path}?clubId=${clubId}`, { method, ...(body !== undefined ? { body } : {}) });
            if (res?.data?.warnings) setWarnings(res.data.warnings);
            else setWarnings([]);
            onChanged();
            if (method !== 'DELETE') await loadDetail();
            return true;
        } catch (err) {
            const missing = missingFromError(err);
            setError(missing.length > 0 ? `${t(assemblyErrorKey(err))} ${missing.map((m) => t(`assembly.rule.${m}`)).join(', ')}` : t(assemblyErrorKey(err)));
            return false;
        } finally {
            setBusy(false);
        }
    }

    async function doOpen() {
        const body: Record<string, unknown> = {};
        const o = fromDatetimeLocal(opensAt);
        const c = fromDatetimeLocal(closesAt);
        if (o) body.opensAt = o;
        if (c) body.closesAt = c;
        if (await act('/open', body)) setOpenDialog(false);
    }

    async function confirmThen(titleKey: string, bodyKey: string, path: string, danger = false, method: 'POST' | 'DELETE' = 'POST') {
        if (await confirm({ title: t(titleKey), body: t(bodyKey), confirmLabel: t(titleKey), danger })) await act(path, method === 'POST' ? {} : undefined, method);
    }

    async function showVotes() {
        try {
            const res = await apiFetch<{ data: VotesResponse }>(`/ballots/${ballot.id}/votes?clubId=${clubId}`);
            setVotes(res.data);
        } catch (err) {
            setError(t(assemblyErrorKey(err)));
        }
    }

    const participation = detail?.participation;
    const ended = ['closed', 'counted', 'finalized'].includes(view.status);

    return (
        <li className="rounded-lg border border-border bg-background p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{view.title}</p>
                    <p className="text-xs text-muted-foreground">
                        {t(`assembly.topic.${view.topic}`)} · {t(view.secret ? 'assembly.ballot.secret' : 'assembly.ballot.open')}
                        {view.closesAt && ` · ${t('assembly.ballot.closesAt', { when: formatWhen(view.closesAt, language) })}`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[view.status] ?? ''}`}>{t(`assembly.ballot.status.${view.status}`)}</span>
                    <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`${secondaryBtn} !px-3 !py-1.5`}>
                        {t(open ? 'assembly.ballot.hide' : 'assembly.ballot.show')}
                    </button>
                </div>
            </div>

            {open && (
                <div className="mt-3 space-y-3">
                    {!detail && !error && <LoadingText />}
                    {view.description && <p className="whitespace-pre-line text-sm text-foreground">{view.description}</p>}
                    <ul className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {view.options.map((o) => (
                            <li key={o.id} className="rounded-full border border-border px-2 py-0.5">
                                {o.label}
                            </li>
                        ))}
                    </ul>
                    {participation && view.status !== 'draft' && (
                        <p className="text-sm text-foreground" aria-live="polite">
                            {t('assembly.ballot.participation', { voted: participation.voted, eligible: participation.eligible })}
                        </p>
                    )}
                    {detail?.opening?.withoutAccount ? <p className="text-xs text-muted-foreground">{t('assembly.ballot.withoutAccount', { count: detail.opening.withoutAccount })}</p> : null}
                    {warnings.includes('agenda_item_not_announced') && <Notice tone="warning">{t('assembly.ballot.warn.unannounced')}</Notice>}
                    {view.status === 'open' && !circular && <p className="text-xs text-muted-foreground">{t('assembly.ballot.hint.inSession')}</p>}
                    {view.secret && <p className="text-xs text-muted-foreground">{t('assembly.ballot.secretNote')}</p>}
                    <BallotResult ballot={view} />
                    {error && <ErrorText>{error}</ErrorText>}

                    <div className="flex flex-wrap gap-2">
                        {actions.open && (
                            <button type="button" disabled={busy} onClick={() => setOpenDialog(true)} className={primaryBtn}>
                                {t('assembly.ballot.action.open')}
                            </button>
                        )}
                        {actions.close && (
                            <button type="button" disabled={busy} onClick={() => void confirmThen('assembly.ballot.action.close', 'assembly.ballot.confirm.close', '/close')} className={primaryBtn}>
                                {t('assembly.ballot.action.close')}
                            </button>
                        )}
                        {actions.count && (
                            <button type="button" disabled={busy} onClick={() => void act('/count', {})} className={primaryBtn}>
                                {t('assembly.ballot.action.count')}
                            </button>
                        )}
                        {actions.finalize && (
                            <button type="button" disabled={busy} onClick={() => void confirmThen('assembly.ballot.action.finalize', 'assembly.ballot.confirm.finalize', '/finalize')} className={primaryBtn}>
                                {t('assembly.ballot.action.finalize')}
                            </button>
                        )}
                        {ended && !view.secret && (
                            <button type="button" disabled={busy} onClick={() => void showVotes()} className={secondaryBtn}>
                                {t('assembly.ballot.action.votes')}
                            </button>
                        )}
                        {actions.cancel && (
                            <button type="button" disabled={busy} onClick={() => void confirmThen('assembly.ballot.action.cancel', 'assembly.ballot.confirm.cancel', '/cancel', true)} className={dangerBtn}>
                                {t('assembly.ballot.action.cancel')}
                            </button>
                        )}
                        {actions.remove && (
                            <button type="button" disabled={busy} onClick={() => void confirmThen('assembly.ballot.action.delete', 'assembly.ballot.confirm.delete', '', true, 'DELETE')} className={dangerBtn}>
                                {t('assembly.ballot.action.delete')}
                            </button>
                        )}
                    </div>

                    {votes && (
                        <div className="rounded-lg border border-border p-3">
                            <p className="text-sm font-semibold text-foreground">{t('assembly.ballot.votes.title')}</p>
                            {votes.secret && <p className="text-xs text-muted-foreground">{t('assembly.ballot.votes.secret')}</p>}
                            <ul className="mt-1 text-sm text-foreground">
                                {votes.votes.map((v, i) => (
                                    <li key={`${v.optionId}-${i}`}>
                                        {!votes.secret && <span className="text-muted-foreground">{v.displayName ?? '—'}: </span>}
                                        {optionLabel(view, v.optionId)}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <Modal
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                title={t('assembly.ballot.action.open')}
                footer={
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setOpenDialog(false)} className={secondaryBtn}>
                            {t('treffen.cancel')}
                        </button>
                        <button type="button" disabled={busy || (circular && !closesAt && !view.closesAt)} onClick={() => void doOpen()} className={primaryBtn}>
                            {t('assembly.ballot.action.open')}
                        </button>
                    </div>
                }
            >
                <div className="space-y-3">
                    <p className="text-sm text-foreground">{t(circular ? 'assembly.ballot.open.circular' : 'assembly.ballot.open.session')}</p>
                    <div>
                        <label htmlFor={`op-${ballot.id}`} className={labelClass}>
                            {t('assembly.ballot.opensAt')}
                        </label>
                        <input id={`op-${ballot.id}`} type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className={inputClass} />
                    </div>
                    <div>
                        <label htmlFor={`cl-${ballot.id}`} className={labelClass}>
                            {t('assembly.ballot.closesAtField')}
                            {circular ? ' *' : ''}
                        </label>
                        <input id={`cl-${ballot.id}`} type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className={inputClass} />
                    </div>
                    {error && <ErrorText>{error}</ErrorText>}
                </div>
            </Modal>
            {dialog}
        </li>
    );
}

/**
 * Digital ballots of one assembly (`meetingId`) or the circular resolutions of the club (`mode="circular"`): create, open, close,
 * count, finalize (Wave 11 W3/W5). Secret and circular ballots are only offered when the club's statute parameters allow them.
 */
export default function BallotsManager({ clubId, mode, meetingId, agendaItems = [] }: { clubId: string; mode: 'in_session' | 'circular'; meetingId?: string; agendaItems?: AgendaItem[] }) {
    const { t } = useLanguage();
    const circular = mode === 'circular';
    const [ballots, setBallots] = useState<Ballot[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [rules, setRules] = useState<AssemblyRules | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [secret, setSecret] = useState(false);
    const [topic, setTopic] = useState<(typeof MAJORITY_TOPICS)[number]>('allgemein');
    const [agendaItemId, setAgendaItemId] = useState('');
    const [audience, setAudience] = useState<'all_voting_members' | 'board'>('all_voting_members');
    const [closesAt, setClosesAt] = useState('');
    const [choicesText, setChoicesText] = useState('');
    const [maxChoices, setMaxChoices] = useState('1');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const query = circular ? 'mode=circular' : `mode=in_session&meetingId=${meetingId}`;
            const [list, ruleRes] = await Promise.all([
                apiFetch<{ data: Ballot[] }>(`/ballots?clubId=${clubId}&${query}`),
                apiFetch<{ data: { rules: AssemblyRules } }>(`/club-settings/assembly?clubId=${clubId}`),
            ]);
            setBallots(list.data.filter((b) => b.kind === 'resolution' || !circular));
            setRules(ruleRes.data.rules);
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, [clubId, circular, meetingId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    if (failed && !ballots) return <LoadError onRetry={() => void load()} />;
    if (!ballots || !rules) return <LoadingText />;

    const circularBlocked = circular && !rules.circularAllowed;
    const choices = choicesText
        .split('\n')
        .map((c) => c.trim())
        .filter(Boolean);

    async function create(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) return;
        setSaving(true);
        setError(null);
        try {
            await apiFetch(`/ballots?clubId=${clubId}`, {
                method: 'POST',
                body: {
                    mode,
                    ...(circular ? { audience, closesAt: fromDatetimeLocal(closesAt) } : { meetingId, ...(agendaItemId ? { agendaItemId } : {}) }),
                    title: title.trim(),
                    ...(description.trim() ? { description: description.trim() } : {}),
                    secret,
                    topic,
                    ...(choices.length > 0 ? { choices, maxChoices: Number(maxChoices) || 1 } : {}),
                },
            });
            setTitle('');
            setDescription('');
            setSecret(false);
            setChoicesText('');
            setMaxChoices('1');
            setShowForm(false);
            await load();
        } catch (err) {
            const missing = missingFromError(err);
            setError(missing.length > 0 ? `${t(assemblyErrorKey(err))} ${missing.map((m) => t(`assembly.rule.${m}`)).join(', ')}` : t(assemblyErrorKey(err)));
        } finally {
            setSaving(false);
        }
    }

    return (
        <SectionCard
            title={t(circular ? 'assembly.circular.title' : 'assembly.ballots.title')}
            action={
                !circularBlocked && (
                    <button type="button" onClick={() => setShowForm((s) => !s)} aria-expanded={showForm} className={`${primaryBtn} !px-3 !py-1.5`}>
                        {t(circular ? 'assembly.circular.new' : 'assembly.ballots.new')}
                    </button>
                )
            }
        >
            <div className="space-y-3">
                {circular && <Notice>{t('assembly.circular.intro')}</Notice>}
                {circularBlocked && <Notice tone="warning">{t('assembly.circular.notAllowed')}</Notice>}
                {!circular && <Notice>{t('assembly.ballots.intro')}</Notice>}

                {showForm && !circularBlocked && (
                    <form onSubmit={(e) => void create(e)} className="space-y-3 rounded-lg border border-border p-3">
                        <div>
                            <label htmlFor="bl-title" className={labelClass}>
                                {t(circular ? 'assembly.circular.subject' : 'assembly.ballots.subject')} *
                            </label>
                            <input id="bl-title" type="text" required maxLength={300} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="bl-desc" className={labelClass}>
                                {t('assembly.ballots.text')}
                            </label>
                            <textarea id="bl-desc" rows={3} maxLength={4000} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <label htmlFor="bl-topic" className={labelClass}>
                                    {t('assembly.agenda.topic')}
                                </label>
                                <select id="bl-topic" value={topic} onChange={(e) => setTopic(e.target.value as (typeof MAJORITY_TOPICS)[number])} className={inputClass}>
                                    {MAJORITY_TOPICS.map((k) => (
                                        <option key={k} value={k}>
                                            {t(`assembly.topic.${k}`)}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {rules.majorityByTopic[topic] ?? rules.majorityByTopic.allgemein
                                        ? t('assembly.ballots.majorityShown', { majority: t(`assembly.majority.${rules.majorityByTopic[topic] ?? rules.majorityByTopic.allgemein}`) })
                                        : t('assembly.ballots.majorityMissing')}
                                </p>
                            </div>
                            {circular ? (
                                <>
                                    <div>
                                        <label htmlFor="bl-aud" className={labelClass}>
                                            {t('assembly.circular.audience')}
                                        </label>
                                        <select id="bl-aud" value={audience} onChange={(e) => setAudience(e.target.value as 'all_voting_members' | 'board')} className={inputClass}>
                                            <option value="all_voting_members">{t('assembly.circular.audience.all')}</option>
                                            <option value="board">{t('assembly.circular.audience.board')}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="bl-closes" className={labelClass}>
                                            {t('assembly.ballot.closesAtField')} *
                                        </label>
                                        <input id="bl-closes" type="datetime-local" required value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className={inputClass} />
                                    </div>
                                    <div className="sm:col-span-2 text-xs text-muted-foreground">
                                        {rules.circularUnanimity === true
                                            ? t('assembly.circular.rule.unanimity')
                                            : rules.circularUnanimity === false && rules.circularMinParticipation
                                              ? t('assembly.circular.rule.participation', { percent: Math.round(rules.circularMinParticipation * 100) })
                                              : t('assembly.circular.rule.missing')}
                                    </div>
                                </>
                            ) : (
                                agendaItems.length > 0 && (
                                    <div>
                                        <label htmlFor="bl-agenda" className={labelClass}>
                                            {t('assembly.ballots.agendaItem')}
                                        </label>
                                        <select id="bl-agenda" value={agendaItemId} onChange={(e) => setAgendaItemId(e.target.value)} className={inputClass}>
                                            <option value="">{t('assembly.ballots.agendaItem.none')}</option>
                                            {agendaItems.map((a) => (
                                                <option key={a.id} value={a.id}>
                                                    {a.position}. {a.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )
                            )}
                        </div>
                        {!circular && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="bl-choices" className={labelClass}>
                                        {t('assembly.ballots.choices')}
                                    </label>
                                    <textarea id="bl-choices" rows={3} value={choicesText} onChange={(e) => setChoicesText(e.target.value)} aria-describedby="bl-choices-hint" className={inputClass} />
                                    <p id="bl-choices-hint" className="mt-1 text-xs text-muted-foreground">
                                        {t('assembly.ballots.choices.hint')}
                                    </p>
                                </div>
                                {choices.length > 0 && (
                                    <div>
                                        <label htmlFor="bl-max" className={labelClass}>
                                            {t('assembly.ballots.maxChoices')}
                                        </label>
                                        <input id="bl-max" type="number" min={1} max={choices.length} value={maxChoices} onChange={(e) => setMaxChoices(e.target.value)} className={inputClass} />
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="space-y-1">
                            <Toggle checked={secret} onChange={setSecret} disabled={!rules.secretBallotDigitalAllowed} describedBy="bl-secret-hint" label={t('assembly.ballots.secret')} />
                            {!rules.secretBallotDigitalAllowed && (
                                <p id="bl-secret-hint" className="text-xs text-muted-foreground">
                                    {t('assembly.ballots.secret.disabled')} {t('assembly.ballots.secret.notAllowed')}
                                </p>
                            )}
                            {secret && <Notice>{t('assembly.ballots.secret.explain')}</Notice>}
                        </div>
                        {error && <ErrorText>{error}</ErrorText>}
                        <div className="flex gap-2">
                            <button type="submit" disabled={saving || !title.trim()} className={primaryBtn}>
                                {t('assembly.ballots.create')}
                            </button>
                            <button type="button" onClick={() => setShowForm(false)} className={secondaryBtn}>
                                {t('treffen.cancel')}
                            </button>
                        </div>
                    </form>
                )}

                {ballots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t(circular ? 'assembly.circular.empty' : 'assembly.ballots.empty')}</p>
                ) : (
                    <ul className="space-y-2">
                        {ballots.map((b) => (
                            <BallotCard key={b.id} clubId={clubId} ballot={b} onChanged={() => void load()} />
                        ))}
                    </ul>
                )}
            </div>
        </SectionCard>
    );
}
