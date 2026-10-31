'use client';

import { useCallback, useEffect, useId, useState } from 'react';

import { apiFetch } from '@/lib/api-client';
import {
    ABSTAIN_RULES,
    type AssemblyRules,
    INVITATION_FORMS,
    MAJORITY_KINDS,
    MAJORITY_TOPICS,
    ONLINE_MODES,
    QUORUM_MODES,
    TERM_EXPIRY_EFFECTS,
    VOTING_STATUSES,
    assemblyErrorKey,
    buildRulesPatch,
    hasRiskySwitches,
    parsePositiveNumber,
    parseWarningDays,
    parseWholeNumber,
    type RulesResponse,
} from '@/lib/assembly';
import { useLanguage } from '@/contexts/LanguageContext';
import { inputClass, labelClass, primaryBtn, secondaryBtn } from '@/components/kalender/calendarTypes';
import { SectionCard, Toggle } from '@/components/standorte/ui';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { ErrorText, Notice, formatWhen } from '@/components/assembly/shared';

interface HistoryEntry {
    id: string;
    createdAt: string;
    actor: { name: string | null } | null;
    payload: { changedFields?: string[] };
}

/** Text input for a number that keeps what the user typed; reports `undefined` to the parent while the text is not valid. */
function NumberField({ label, hint, value, onChange, kind = 'whole', suffix }: { label: string; hint?: string; value: number | null; onChange: (v: number | null | undefined) => void; kind?: 'whole' | 'percent'; suffix?: string }) {
    const { t } = useLanguage();
    const id = useId();
    const shown = value === null ? '' : String(kind === 'percent' ? Math.round(value * 10000) / 100 : value);
    const [text, setText] = useState(shown);
    const [invalid, setInvalid] = useState(false);
    // Take over a changed value from outside (reset after saving) without fighting the user's own typing.
    const [lastValue, setLastValue] = useState(value);
    if (lastValue !== value) {
        setLastValue(value);
        if (!invalid) setText(shown);
    }

    function handle(next: string) {
        setText(next);
        const parsed = kind === 'percent' ? parsePositiveNumber(next) : parseWholeNumber(next);
        const ok = parsed !== undefined && (kind !== 'percent' || parsed === null || parsed <= 100);
        setInvalid(!ok);
        onChange(!ok ? undefined : parsed === null ? null : kind === 'percent' ? parsed / 100 : parsed);
    }

    return (
        <div>
            <label htmlFor={id} className={labelClass}>
                {label}
            </label>
            <div className="flex items-center gap-2">
                <input id={id} type="text" inputMode="decimal" value={text} onChange={(e) => handle(e.target.value)} aria-invalid={invalid} aria-describedby={hint ? `${id}-hint` : undefined} className={`${inputClass} max-w-[8rem]`} />
                {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
            </div>
            {invalid && <p className="mt-1 text-xs text-destructive">{t('assembly.rules.invalidNumber')}</p>}
            {hint && (
                <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">
                    {hint}
                </p>
            )}
        </div>
    );
}

/** Select with an explicit "not stated" entry: a legal parameter is never preselected. */
function ChoiceField<V extends string>({ label, hint, value, options, onChange, optionLabel, allowUnset = true }: { label: string; hint?: string; value: V | null; options: readonly V[]; onChange: (v: V | null) => void; optionLabel: (v: V) => string; allowUnset?: boolean }) {
    const { t } = useLanguage();
    const id = useId();
    return (
        <div>
            <label htmlFor={id} className={labelClass}>
                {label}
            </label>
            <select id={id} value={value ?? ''} onChange={(e) => onChange((e.target.value || null) as V | null)} aria-describedby={hint ? `${id}-hint` : undefined} className={inputClass}>
                {allowUnset && <option value="">{t('assembly.rules.unset')}</option>}
                {options.map((o) => (
                    <option key={o} value={o}>
                        {optionLabel(o)}
                    </option>
                ))}
            </select>
            {hint && (
                <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">
                    {hint}
                </p>
            )}
        </div>
    );
}

/** Yes / no / not stated for a nullable legal switch. */
function TriField({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
    const { t } = useLanguage();
    return (
        <ChoiceField
            label={label}
            hint={hint}
            value={value === null ? null : value ? 'yes' : 'no'}
            options={['yes', 'no'] as const}
            onChange={(v) => onChange(v === null ? null : v === 'yes')}
            optionLabel={(v) => t(v === 'yes' ? 'assembly.rules.yes' : 'assembly.rules.no')}
        />
    );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <fieldset className="space-y-3 rounded-lg border border-border p-3">
            <legend className="px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</legend>
            {children}
        </fieldset>
    );
}

/**
 * Statute parameters of the general assembly ("Satzung & Versammlung", Wave 11 W1): the club states what its statute says; nothing is
 * preset and nothing is legal advice. Features that depend on a parameter stay off until it is stated.
 */
export default function AssemblyRulesPanel({ clubId, canReadHistory }: { clubId: string; canReadHistory: boolean }) {
    const { t, language } = useLanguage();
    const [state, setState] = useState<RulesResponse | null>(null);
    const [failed, setFailed] = useState(false);
    const [draft, setDraft] = useState<AssemblyRules | null>(null);
    const [invalid, setInvalid] = useState<Record<string, boolean>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [history, setHistory] = useState<HistoryEntry[]>([]);

    const load = useCallback(async () => {
        try {
            const res = await apiFetch<{ data: RulesResponse }>(`/club-settings/assembly?clubId=${clubId}`);
            setState(res.data);
            setDraft(res.data.rules);
            setFailed(false);
        } catch {
            setFailed(true);
        }
    }, [clubId]);

    const loadHistory = useCallback(async () => {
        if (!canReadHistory) return;
        try {
            const res = await apiFetch<{ data: HistoryEntry[] }>(`/audit-log?clubId=${clubId}&type=club_settings.assembly_update&pageSize=8`);
            setHistory(res.data);
        } catch {
            setHistory([]);
        }
    }, [clubId, canReadHistory]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
        void loadHistory();
    }, [load, loadHistory]);

    if (failed && !state) return <LoadError onRetry={() => void load()} />;
    if (!state || !draft) return <LoadingText />;

    const current = state.rules;
    const patch = buildRulesPatch(current, draft);
    const dirty = Object.keys(patch).length > 0;
    const hasInvalid = Object.values(invalid).some(Boolean);

    const set = <K extends keyof AssemblyRules>(key: K, value: AssemblyRules[K]) => {
        setSaved(false);
        setDraft((d) => (d ? { ...d, [key]: value } : d));
    };
    const num = (key: 'invitationMinDays' | 'invitationDeliveryBufferDays' | 'maxProxiesPerPerson' | 'votingMinAge' | 'quorumValue' | 'circularMinParticipation') => (v: number | null | undefined) => {
        setInvalid((i) => ({ ...i, [key]: v === undefined }));
        if (v !== undefined) set(key, v);
    };

    const topicLabel = (k: string) => t(`assembly.topic.${k}`);
    const majorityLabel = (k: string) => t(`assembly.majority.${k}`);

    async function save() {
        if (!dirty || hasInvalid) return;
        setSaving(true);
        setError(null);
        try {
            const res = await apiFetch<{ data: RulesResponse }>(`/club-settings/assembly?clubId=${clubId}`, { method: 'PATCH', body: patch });
            setState(res.data);
            setDraft(res.data.rules);
            setSaved(true);
            void loadHistory();
        } catch (err) {
            setError(t(assemblyErrorKey(err)));
        } finally {
            setSaving(false);
        }
    }

    const fractionQuorum = draft.quorumMode === 'fraction';

    return (
        <SectionCard title={t('assembly.rules.title')}>
            <form
                className="space-y-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    void save();
                }}
            >
                <Notice>{t('assembly.rules.intro')}</Notice>

                {state.complete ? (
                    <p className="text-sm text-success">{t('assembly.rules.complete')}</p>
                ) : (
                    <Notice tone="warning">
                        <p className="font-semibold">{t('assembly.rules.missing.title')}</p>
                        <ul className="mt-1 list-disc pl-5">
                            {state.missing.map((m) => (
                                <li key={m}>{t(`assembly.rule.${m}`)}</li>
                            ))}
                        </ul>
                    </Notice>
                )}

                <Group title={t('assembly.rules.group.invitation')}>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <NumberField label={t('assembly.rule.invitationMinDays')} hint={t('assembly.rule.invitationMinDays.hint')} value={draft.invitationMinDays} onChange={num('invitationMinDays')} suffix={t('assembly.rules.days')} />
                        <NumberField label={t('assembly.rule.invitationDeliveryBufferDays')} hint={t('assembly.rule.invitationDeliveryBufferDays.hint')} value={draft.invitationDeliveryBufferDays} onChange={num('invitationDeliveryBufferDays')} suffix={t('assembly.rules.days')} />
                        <ChoiceField label={t('assembly.rule.invitationForm')} hint={t('assembly.rule.invitationForm.hint')} value={draft.invitationForm} options={INVITATION_FORMS} onChange={(v) => set('invitationForm', v)} optionLabel={(v) => t(`assembly.invitationForm.${v}`)} />
                        <TriField label={t('assembly.rule.agendaRequiredInInvitation')} hint={t('assembly.rule.agendaRequiredInInvitation.hint')} value={draft.agendaRequiredInInvitation} onChange={(v) => set('agendaRequiredInInvitation', v)} />
                    </div>
                </Group>

                <Group title={t('assembly.rules.group.quorum')}>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <ChoiceField label={t('assembly.rule.quorumMode')} value={draft.quorumMode} options={QUORUM_MODES} onChange={(v) => setDraft((d) => (d ? { ...d, quorumMode: v, quorumValue: v === 'none' ? null : d.quorumValue } : d))} optionLabel={(v) => t(`assembly.quorumMode.${v}`)} />
                        {(draft.quorumMode === 'fraction' || draft.quorumMode === 'absolute') && (
                            <NumberField
                                key={draft.quorumMode}
                                label={t(fractionQuorum ? 'assembly.rule.quorumValue.fraction' : 'assembly.rule.quorumValue.absolute')}
                                hint={t(fractionQuorum ? 'assembly.rule.quorumValue.fraction.hint' : 'assembly.rule.quorumValue.absolute.hint')}
                                value={draft.quorumValue}
                                onChange={num('quorumValue')}
                                kind={fractionQuorum ? 'percent' : 'whole'}
                                suffix={fractionQuorum ? '%' : undefined}
                            />
                        )}
                    </div>
                </Group>

                <Group title={t('assembly.rules.group.majority')}>
                    <p className="text-xs text-muted-foreground">{t('assembly.rules.majority.hint')}</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {MAJORITY_TOPICS.map((topic) => (
                            <ChoiceField
                                key={topic}
                                label={topicLabel(topic)}
                                value={draft.majorityByTopic[topic]}
                                options={MAJORITY_KINDS}
                                onChange={(v) => set('majorityByTopic', { ...draft.majorityByTopic, [topic]: v })}
                                optionLabel={majorityLabel}
                            />
                        ))}
                        <ChoiceField label={t('assembly.rule.abstainCountsAs')} hint={t('assembly.rule.abstainCountsAs.hint')} value={draft.abstainCountsAs} options={ABSTAIN_RULES} onChange={(v) => set('abstainCountsAs', v)} optionLabel={(v) => t(`assembly.abstain.${v}`)} />
                    </div>
                </Group>

                <Group title={t('assembly.rules.group.votingRight')}>
                    <fieldset>
                        <legend className={labelClass}>{t('assembly.rule.votingStatuses')}</legend>
                        <div className="flex flex-wrap gap-4">
                            {VOTING_STATUSES.map((status) => {
                                const selected = draft.votingStatuses ?? [];
                                return (
                                    <label key={status} className="flex items-center gap-2 text-sm text-foreground">
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(status)}
                                            onChange={(e) => {
                                                const next = e.target.checked ? [...selected, status] : selected.filter((s) => s !== status);
                                                set('votingStatuses', next.length === 0 ? null : next);
                                            }}
                                        />
                                        {t(`assembly.votingStatus.${status}`)}
                                    </label>
                                );
                            })}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{t('assembly.rule.votingStatuses.hint')}</p>
                    </fieldset>
                    <NumberField label={t('assembly.rule.votingMinAge')} hint={t('assembly.rule.votingMinAge.hint')} value={draft.votingMinAge} onChange={num('votingMinAge')} suffix={t('assembly.rules.years')} />
                </Group>

                <Group title={t('assembly.rules.group.proxy')}>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <TriField label={t('assembly.rule.proxyAllowed')} value={draft.proxyAllowed} onChange={(v) => setDraft((d) => (d ? { ...d, proxyAllowed: v, maxProxiesPerPerson: v === false ? null : d.maxProxiesPerPerson } : d))} />
                        {draft.proxyAllowed === true && <NumberField label={t('assembly.rule.maxProxiesPerPerson')} value={draft.maxProxiesPerPerson} onChange={num('maxProxiesPerPerson')} />}
                    </div>
                </Group>

                <Group title={t('assembly.rules.group.digital')}>
                    <Notice tone="warning">{t('assembly.rules.digital.warning')}</Notice>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <ChoiceField label={t('assembly.rule.onlineAllowed')} hint={t('assembly.rule.onlineAllowed.hint')} value={draft.onlineAllowed} options={ONLINE_MODES} allowUnset={false} onChange={(v) => set('onlineAllowed', v ?? 'none')} optionLabel={(v) => t(`assembly.online.${v}`)} />
                    </div>
                    <Toggle checked={draft.secretBallotDigitalAllowed} onChange={(v) => set('secretBallotDigitalAllowed', v)} label={t('assembly.rule.secretBallotDigitalAllowed')} />
                    <p className="text-xs text-muted-foreground">{t('assembly.rule.secretBallotDigitalAllowed.hint')}</p>
                    <Toggle checked={draft.circularAllowed} onChange={(v) => set('circularAllowed', v)} label={t('assembly.rule.circularAllowed')} />
                    {draft.circularAllowed && (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <TriField label={t('assembly.rule.circularUnanimity')} hint={t('assembly.rule.circularUnanimity.hint')} value={draft.circularUnanimity} onChange={(v) => set('circularUnanimity', v)} />
                            {draft.circularUnanimity === false && (
                                <NumberField label={t('assembly.rule.circularMinParticipation')} value={draft.circularMinParticipation} onChange={num('circularMinParticipation')} kind="percent" suffix="%" />
                            )}
                        </div>
                    )}
                    {hasRiskySwitches(draft) && <Notice tone="warning">{t('assembly.rules.digital.active')}</Notice>}
                </Group>

                <Group title={t('assembly.rules.group.terms')}>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <TermDaysField value={draft.termWarningDays} onChange={(v) => set('termWarningDays', v)} onInvalid={(bad) => setInvalid((i) => ({ ...i, termWarningDays: bad }))} />
                        <ChoiceField label={t('assembly.rule.termExpiryEffect')} hint={t('assembly.rule.termExpiryEffect.hint')} value={draft.termExpiryEffect} options={TERM_EXPIRY_EFFECTS} allowUnset={false} onChange={(v) => set('termExpiryEffect', v ?? 'none')} optionLabel={(v) => t(`assembly.termEffect.${v}`)} />
                    </div>
                </Group>

                <Group title={t('assembly.rules.group.statute')}>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <TextField label={t('assembly.rule.satzungReference')} hint={t('assembly.rule.satzungReference.hint')} value={draft.satzungReference} max={300} onChange={(v) => set('satzungReference', v)} />
                        <TextField label={t('assembly.rule.satzungPageSlug')} hint={t('assembly.rule.satzungPageSlug.hint')} value={draft.satzungPageSlug} max={100} onChange={(v) => set('satzungPageSlug', v)} />
                    </div>
                </Group>

                {error && <ErrorText>{error}</ErrorText>}
                {saved && !dirty && (
                    <p role="status" className="text-sm text-success">
                        {t('assembly.rules.saved')}
                    </p>
                )}
                <div className="flex gap-2">
                    <button type="submit" disabled={!dirty || hasInvalid || saving} className={primaryBtn}>
                        {t('assembly.rules.save')}
                    </button>
                    <button type="button" disabled={!dirty || saving} onClick={() => setDraft(current)} className={secondaryBtn}>
                        {t('assembly.rules.reset')}
                    </button>
                </div>
            </form>

            <div className="mt-6 border-t border-border pt-4">
                <h3 className="text-sm font-bold text-foreground">{t('assembly.rules.history.title')}</h3>
                {!canReadHistory ? (
                    <p className="mt-1 text-xs text-muted-foreground">{t('assembly.rules.history.noAccess')}</p>
                ) : history.length === 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">{t('assembly.rules.history.empty')}</p>
                ) : (
                    <ul className="mt-2 space-y-1 text-sm text-foreground">
                        {history.map((h) => (
                            <li key={h.id}>
                                <span className="text-muted-foreground">{formatWhen(h.createdAt, language)}</span> · {h.actor?.name ?? '—'} · {(h.payload.changedFields ?? []).map((f) => t(`assembly.rule.${f}`)).join(', ')}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </SectionCard>
    );
}

function TermDaysField({ value, onChange, onInvalid }: { value: number[] | null; onChange: (v: number[] | null) => void; onInvalid: (bad: boolean) => void }) {
    const { t } = useLanguage();
    const id = useId();
    const [text, setText] = useState(value ? value.join(', ') : '');
    const [bad, setBad] = useState(false);
    return (
        <div>
            <label htmlFor={id} className={labelClass}>
                {t('assembly.rule.termWarningDays')}
            </label>
            <input
                id={id}
                type="text"
                value={text}
                aria-invalid={bad}
                aria-describedby={`${id}-hint`}
                onChange={(e) => {
                    setText(e.target.value);
                    const parsed = parseWarningDays(e.target.value);
                    setBad(parsed === undefined);
                    onInvalid(parsed === undefined);
                    if (parsed !== undefined) onChange(parsed);
                }}
                className={`${inputClass} max-w-[14rem]`}
            />
            {bad && <p className="mt-1 text-xs text-destructive">{t('assembly.rules.invalidDays')}</p>}
            <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">
                {t('assembly.rule.termWarningDays.hint')}
            </p>
        </div>
    );
}

function TextField({ label, hint, value, max, onChange }: { label: string; hint?: string; value: string | null; max: number; onChange: (v: string | null) => void }) {
    const id = useId();
    return (
        <div>
            <label htmlFor={id} className={labelClass}>
                {label}
            </label>
            <input id={id} type="text" value={value ?? ''} maxLength={max} onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)} aria-describedby={hint ? `${id}-hint` : undefined} className={inputClass} />
            {hint && (
                <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">
                    {hint}
                </p>
            )}
        </div>
    );
}
