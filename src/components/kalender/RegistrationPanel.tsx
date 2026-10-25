'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import FormRenderer, { focusField } from '@/components/forms/FormRenderer';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError, apiFetch } from '@/lib/api-client';
import { eventErrorKey } from '@/lib/eventErrors';
import { type MyRegistration, type RegistrationInfo, type RsvpResult, formatCost, partySizeOptions, rsvpBody } from '@/lib/eventRegistration';
import { type WardClub } from '@/lib/familie';
import { type Answers, type FieldErrorCode, fieldErrorsFromError, validateAnswers, visibleAnswers } from '@/lib/formSchema';

import { type CalendarEvent, inputClass, labelClass, primaryBtn, secondaryBtn } from './calendarTypes';
import MemberPicker from './MemberPicker';

interface Props {
    clubId: string;
    event: CalendarEvent;
    info: RegistrationInfo;
    /** `members:write`: may register any member. */
    canRegisterOthers: boolean;
    /** The caller's registration or a registered person changed: the page refetches the event. */
    onChanged: () => void;
}

interface Target {
    /** `null` = the caller. */
    clubMemberId: string | null;
    name: string;
}

/** Registration of the caller, a ward (parents) or any member (board) with form and party size (W7). */
export default function RegistrationPanel({ clubId, event, info, canRegisterOthers, onChanged }: Props) {
    const { t } = useLanguage();
    const [target, setTarget] = useState<Target>({ clubMemberId: null, name: '' });
    const [wards, setWards] = useState<Array<{ id: string; name: string }>>([]);

    useEffect(() => {
        let alive = true;
        apiFetch<{ data: WardClub[] }>('/my-wards')
            .then((res) => {
                if (!alive) return;
                setWards(res.data.filter((c) => c.clubId === clubId).flatMap((c) => c.wards.map((w) => ({ id: w.wardId, name: w.name }))));
            })
            .catch(() => alive && setWards([]));
        return () => {
            alive = false;
        };
    }, [clubId]);

    const showTargets = wards.length > 0 || canRegisterOthers;

    return (
        <div className="space-y-4 text-sm">
            {showTargets && (
                <div>
                    <label htmlFor="reg-target" className={labelClass}>
                        {t('register.for')}
                    </label>
                    <select
                        id="reg-target"
                        value={target.clubMemberId ?? ''}
                        onChange={(e) => {
                            const id = e.target.value;
                            const ward = wards.find((w) => w.id === id);
                            setTarget(id ? { clubMemberId: id, name: ward?.name ?? target.name } : { clubMemberId: null, name: '' });
                        }}
                        className={inputClass}
                    >
                        <option value="">{t('register.for.me')}</option>
                        {wards.map((w) => (
                            <option key={w.id} value={w.id}>
                                {t('register.for.child', { name: w.name })}
                            </option>
                        ))}
                        {canRegisterOthers && target.clubMemberId && !wards.some((w) => w.id === target.clubMemberId) && <option value={target.clubMemberId}>{target.name}</option>}
                    </select>
                    {canRegisterOthers && (
                        <div className="mt-2">
                            <MemberPicker clubId={clubId} label={t('register.for.member')} onPick={(m) => setTarget({ clubMemberId: m.id, name: m.name })} />
                        </div>
                    )}
                </div>
            )}
            <RegistrationForm key={target.clubMemberId ?? 'self'} clubId={clubId} event={event} info={info} target={target} onChanged={onChanged} />
        </div>
    );
}

function RegistrationForm({ clubId, event, info, target, onChanged }: { clubId: string; event: CalendarEvent; info: RegistrationInfo; target: Target; onChanged: () => void }) {
    const { t, language } = useLanguage();
    const form = info.form;
    const forQuery = target.clubMemberId ? `&forClubMemberId=${target.clubMemberId}` : '';
    const url = `/events/${event.id}/rsvp?clubId=${clubId}${forQuery}`;
    const [existing, setExisting] = useState<MyRegistration | null | 'loading' | 'error'>('loading');
    const [partySize, setPartySize] = useState(1);
    const [answers, setAnswers] = useState<Answers>({});
    const [errors, setErrors] = useState<Record<string, FieldErrorCode>>({});
    const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);
    const cancelled = Boolean(event.cancelled);

    const load = useCallback(() => {
        setExisting('loading');
        apiFetch<{ data: MyRegistration | null }>(url)
            .then((res) => {
                setExisting(res.data);
                if (res.data) {
                    setPartySize(res.data.partySize);
                    setAnswers(res.data.answers ?? {});
                }
            })
            .catch(() => setExisting('error'));
    }, [url]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (lock.current || existing === 'loading' || existing === 'error') return;
        const fields = form?.fields ?? [];
        const clientErrors = form ? validateAnswers(fields, answers, { mode: 'submit' }) : {};
        if (Object.keys(clientErrors).length > 0) {
            setErrors(clientErrors);
            setMessage({ tone: 'error', text: t('register.err.fields') });
            const first = fields.find((f) => f.key in clientErrors);
            if (first) focusField(`reg-${target.clubMemberId ?? 'self'}`, first.key);
            return;
        }
        lock.current = true;
        setBusy(true);
        setErrors({});
        setMessage(null);
        try {
            const res = await apiFetch<{ data: RsvpResult }>(`/events/${event.id}/rsvp?clubId=${clubId}`, {
                method: 'POST',
                body: rsvpBody(info, partySize, form ? visibleAnswers(fields, answers) : {}, target.clubMemberId ?? undefined),
            });
            setMessage({ tone: 'ok', text: t(res.data.status === 'angemeldet' ? 'register.done.confirmed' : 'register.done.waitlist') });
            onChanged();
            load();
        } catch (err) {
            const fieldErrors = fieldErrorsFromError(err);
            if (fieldErrors) {
                setErrors(fieldErrors);
                const first = fields.find((f) => f.key in fieldErrors);
                if (first) focusField(`reg-${target.clubMemberId ?? 'self'}`, first.key);
            }
            setMessage({ tone: 'error', text: fieldErrors ? t('register.err.fields') : err instanceof ApiError ? t(eventErrorKey(err)) : t('verein.err.network') });
        } finally {
            lock.current = false;
            setBusy(false);
        }
    }

    async function cancel() {
        if (lock.current) return;
        lock.current = true;
        setBusy(true);
        setMessage(null);
        try {
            await apiFetch(url, { method: 'DELETE' });
            setExisting(null);
            setPartySize(1);
            setAnswers({});
            setMessage({ tone: 'ok', text: t('register.done.cancelled') });
            onChanged();
        } catch (err) {
            setMessage({ tone: 'error', text: t(eventErrorKey(err)) });
        } finally {
            lock.current = false;
            setBusy(false);
        }
    }

    if (existing === 'error') return <LoadError onRetry={load} />;
    if (existing === 'loading') return <LoadingText />;

    const cost = formatCost(info.costCents, language);
    const closed = !info.open || cancelled;
    const closedKey = cancelled ? 'cancelled' : (info.closedReason ?? 'deadline_passed');
    const who = target.clubMemberId ? target.name : null;

    return (
        <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate>
            {(cost || info.costNote) && (
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">
                        {cost ? t('registration.cost', { amount: cost }) : ''}
                        {cost && info.costNote ? ' · ' : ''}
                        {info.costNote ?? ''}
                    </p>
                    <p className="mt-0.5">{t('registration.cost.hint.guest')}</p>
                </div>
            )}
            {existing && (
                <p role="status" className="flex flex-wrap items-center gap-2 text-foreground">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${existing.status === 'angemeldet' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>
                        {t(existing.status === 'angemeldet' ? 'kalender.events.rsvp.confirmed' : 'kalender.events.rsvp.waitlist')}
                    </span>
                    <span className="text-muted-foreground">
                        {who ? `${who} · ` : ''}
                        {t('guest.manage.persons', { count: existing.partySize })}
                    </span>
                </p>
            )}
            {closed ? (
                <p role="status" className="rounded-lg bg-muted px-3 py-2 text-foreground">
                    {t(`register.closed.${closedKey}`)}
                </p>
            ) : (
                <>
                    {info.maxCompanions > 0 && (
                        <div>
                            <label htmlFor="reg-party" className={labelClass}>
                                {t('register.party')}
                            </label>
                            <select id="reg-party" value={partySize} onChange={(e) => setPartySize(Number(e.target.value))} className={inputClass}>
                                {partySizeOptions(info.maxCompanions).map((n) => (
                                    <option key={n} value={n}>
                                        {t('guest.party.option', { count: n })}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-muted-foreground">{t('register.party.hint')}</p>
                        </div>
                    )}
                    {form && (
                        <FormRenderer
                            fields={form.fields}
                            privacyNotice={form.privacyNotice}
                            answers={answers}
                            onChange={(key, value) => setAnswers((a) => ({ ...a, [key]: value }))}
                            errors={errors}
                            idPrefix={`reg-${target.clubMemberId ?? 'self'}`}
                            disabled={busy}
                        />
                    )}
                    <div className="flex flex-wrap gap-2">
                        <button type="submit" disabled={busy} className={primaryBtn}>
                            {t(existing ? 'register.update' : who ? 'register.submit.for' : 'register.submit', { name: who ?? '' })}
                        </button>
                        {existing && (
                            <button type="button" disabled={busy} onClick={() => void cancel()} className={secondaryBtn}>
                                {t('kalender.events.rsvp.cancel')}
                            </button>
                        )}
                    </div>
                </>
            )}
            {closed && existing && !cancelled && (
                <button type="button" disabled={busy} onClick={() => void cancel()} className={secondaryBtn}>
                    {t('kalender.events.rsvp.cancel')}
                </button>
            )}
            {message && (
                <p role={message.tone === 'error' ? 'alert' : 'status'} className={`rounded-lg px-3 py-2 ${message.tone === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                    {message.text}
                </p>
            )}
        </form>
    );
}
