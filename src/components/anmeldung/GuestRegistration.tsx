'use client';

import { useEffect, useRef, useState } from 'react';

import FormRenderer, { focusField } from '@/components/forms/FormRenderer';
import { useLanguage } from '@/contexts/LanguageContext';
import { inputClass } from '@/lib/clubMembers';
import { type Answers, type FieldErrorCode, validateAnswers, visibleAnswers } from '@/lib/formSchema';
import { partySizeOptions } from '@/lib/eventRegistration';
import { type PublicEventData, type PublicResult, getPublicEvent, guestLanguage, isPlausibleSecret, publicResultKey, registerGuest } from '@/lib/publicEvents';

import { PublicEventSummary, PublicLoading, PublicMessage, PublicShell, publicButton } from './PublicShell';

type View = { kind: 'loading' } | { kind: 'ready'; data: PublicEventData } | { kind: 'pending' } | Exclude<PublicResult<unknown>, { kind: 'ok' | 'invalid' }>;

/** `/anmeldung/<token>`: registration of a guest without an account (double opt-in by e-mail). */
export default function GuestRegistration({ token }: { token: string }) {
    const { t, language } = useLanguage();
    const [view, setView] = useState<View>({ kind: 'loading' });
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [partySize, setPartySize] = useState(1);
    const [answers, setAnswers] = useState<Answers>({});
    const [accepted, setAccepted] = useState(false);
    const [honeypot, setHoneypot] = useState('');
    const [errors, setErrors] = useState<Record<string, FieldErrorCode>>({});
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const submitting = useRef(false);

    useEffect(() => {
        if (!isPlausibleSecret(token)) {
            // Reading the route parameter after mount, not derivable during render.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setView({ kind: 'notFound' });
            return;
        }
        let alive = true;
        void getPublicEvent(token).then((r) => {
            if (!alive) return;
            if (r.kind === 'ok') setView({ kind: 'ready', data: r.data });
            else if (r.kind !== 'invalid') setView(r);
        });
        return () => {
            alive = false;
        };
    }, [token]);

    if (view.kind === 'loading') return <PublicLoading />;
    if (view.kind === 'pending') {
        return (
            <PublicShell status="ok">
                <div className="text-center" role="status">
                    <h1 className="text-xl font-bold text-foreground">{t('guest.pending.title')}</h1>
                    <p className="mt-2 text-sm text-muted-foreground">{t('guest.pending.body', { email: email.trim() })}</p>
                    <p className="mt-3 text-xs text-muted-foreground">{t('guest.pending.hint')}</p>
                </div>
            </PublicShell>
        );
    }
    if (view.kind !== 'ready') {
        const key = view.kind === 'notFound' ? 'guest.err.notFound' : view.kind === 'rateLimited' ? 'guest.err.rateLimited' : 'guest.err.generic';
        return <PublicMessage title={t(`${key}.title`)} body={t(`${key}.body`)} />;
    }

    const { event, registration } = view.data;
    const form = registration.form;
    const closed = !registration.open || event.cancelled;
    const closedKey = event.cancelled ? 'cancelled' : (registration.closedReason ?? 'deadline_passed');

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (submitting.current) return;
        const fields = form?.fields ?? [];
        const clientErrors = form ? validateAnswers(fields, answers, { mode: 'submit' }) : {};
        if (Object.keys(clientErrors).length > 0) {
            setErrors(clientErrors);
            setMessage(t('guest.err.invalid'));
            const first = fields.find((f) => f.key in clientErrors);
            if (first) focusField('guest-form', first.key);
            return;
        }
        submitting.current = true;
        setBusy(true);
        setErrors({});
        setMessage(null);
        const r = await registerGuest(token, {
            name: name.trim(),
            email: email.trim(),
            privacyAccepted: true,
            ...(partySize > 1 ? { partySize } : {}),
            ...(form ? { answers: visibleAnswers(fields, answers) } : {}),
            language: guestLanguage(language),
            website: honeypot,
        });
        submitting.current = false;
        setBusy(false);
        if (r.kind === 'ok') {
            setView({ kind: 'pending' });
            return;
        }
        if (r.kind === 'invalid') {
            setErrors(r.fields);
            setMessage(t(publicResultKey(r)));
            const first = fields.find((f) => f.key in r.fields);
            if (first) focusField('guest-form', first.key);
            return;
        }
        setMessage(t(publicResultKey(r)));
    }

    return (
        <PublicShell wide>
            <PublicEventSummary event={event} />
            {closed ? (
                <p role="status" className="mt-6 rounded-lg bg-muted px-3 py-3 text-sm text-foreground">
                    {t(`guest.closed.${closedKey}`)}
                </p>
            ) : (
                <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4" noValidate>
                    <h2 className="text-base font-bold text-foreground">{t('guest.form.title')}</h2>
                    {registration.full && <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-foreground">{t('guest.full')}</p>}
                    <div>
                        <label htmlFor="guest-name" className="block text-sm font-medium text-foreground">
                            {t('guest.name')} <span aria-hidden className="text-destructive">*</span>
                        </label>
                        <input id="guest-name" type="text" required maxLength={100} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} mt-1`} />
                    </div>
                    <div>
                        <label htmlFor="guest-email" className="block text-sm font-medium text-foreground">
                            {t('guest.email')} <span aria-hidden className="text-destructive">*</span>
                        </label>
                        <input id="guest-email" type="email" required maxLength={200} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby="guest-email-hint" className={`${inputClass} mt-1`} />
                        <p id="guest-email-hint" className="mt-1 text-xs text-muted-foreground">
                            {t('guest.email.hint')}
                        </p>
                    </div>
                    {registration.maxCompanions > 0 && (
                        <div>
                            <label htmlFor="guest-party" className="block text-sm font-medium text-foreground">
                                {t('guest.party')}
                            </label>
                            <select id="guest-party" value={partySize} onChange={(e) => setPartySize(Number(e.target.value))} className={`${inputClass} mt-1`}>
                                {partySizeOptions(registration.maxCompanions).map((n) => (
                                    <option key={n} value={n}>
                                        {t('guest.party.option', { count: n })}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    {form && (
                        <FormRenderer
                            fields={form.fields}
                            privacyNotice={form.privacyNotice}
                            answers={answers}
                            onChange={(key, value) => setAnswers((a) => ({ ...a, [key]: value }))}
                            errors={errors}
                            idPrefix="guest-form"
                            disabled={busy}
                        />
                    )}
                    {/* Honeypot: hidden from people and assistive technology, bots fill it in. */}
                    <div aria-hidden="true" inert className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                        <input name="xq_contact_ref" type="text" tabIndex={-1} autoComplete="off" data-lpignore="true" data-1p-ignore value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
                    </div>
                    <div>
                        {!form?.privacyNotice && (
                            <p className="mb-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                                {t('guest.privacy.generic', { club: event.clubName })}{' '}
                                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline">
                                    {t('guest.privacy.link')}
                                </a>
                            </p>
                        )}
                        <label className="flex items-start gap-2 text-sm text-foreground">
                            <input type="checkbox" required checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1" />
                            <span>{t('guest.privacy.accept', { club: event.clubName })}</span>
                        </label>
                        <p className="mt-1 text-xs text-muted-foreground">{t('guest.privacy.hint')}</p>
                    </div>
                    {message && (
                        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {message}
                        </p>
                    )}
                    {!busy && (!accepted || !name.trim() || !email.trim()) && <p className="text-center text-xs text-muted-foreground">{t('guest.submit.hint')}</p>}
                    <button type="submit" disabled={busy || !accepted || !name.trim() || !email.trim()} className={publicButton}>
                        {t(busy ? 'guest.submit.busy' : registration.full ? 'guest.submit.waitlist' : 'guest.submit')}
                    </button>
                </form>
            )}
        </PublicShell>
    );
}
