'use client';

import { useEffect, useRef, useState } from 'react';

import FormRenderer, { focusField } from '@/components/forms/FormRenderer';
import { useConfirm } from '@/components/useConfirm';
import { useLanguage } from '@/contexts/LanguageContext';
import { inputClass } from '@/lib/clubMembers';
import { partySizeOptions } from '@/lib/eventRegistration';
import { type Answers, type FieldErrorCode, validateAnswers, visibleAnswers } from '@/lib/formSchema';
import { type ManagedData, cancelManaged, changeManaged, getManaged, isPlausibleSecret, publicResultKey } from '@/lib/publicEvents';

import { PublicEventSummary, PublicLoading, PublicMessage, PublicShell, publicButton, publicSecondaryButton } from './PublicShell';

type View = { kind: 'loading' } | { kind: 'ready'; data: ManagedData } | { kind: 'deleted' } | { kind: 'notFound' | 'rateLimited' | 'error' };

/** `/anmeldung/verwalten/<manageToken>`: a guest changes party size and answers or cancels (cancelling deletes the data). */
export default function GuestManage({ token }: { token: string }) {
    const { t } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const [view, setView] = useState<View>({ kind: 'loading' });
    const [name, setName] = useState('');
    const [partySize, setPartySize] = useState(1);
    const [answers, setAnswers] = useState<Answers>({});
    const [errors, setErrors] = useState<Record<string, FieldErrorCode>>({});
    const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
    const [busy, setBusy] = useState(false);
    const lock = useRef(false);

    useEffect(() => {
        if (!isPlausibleSecret(token)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setView({ kind: 'notFound' });
            return;
        }
        let alive = true;
        void getManaged(token).then((r) => {
            if (!alive) return;
            if (r.kind === 'ok') {
                setView({ kind: 'ready', data: r.data });
                setName(r.data.name);
                setPartySize(r.data.partySize);
                setAnswers(r.data.answers);
            } else if (r.kind === 'notFound' || r.kind === 'rateLimited') setView({ kind: r.kind });
            else setView({ kind: 'error' });
        });
        return () => {
            alive = false;
        };
    }, [token]);

    if (view.kind === 'loading') return <PublicLoading />;
    if (view.kind === 'deleted') {
        return (
            <PublicShell status="ok">
                <div role="status" className="text-center">
                    <h1 className="text-xl font-bold text-foreground">{t('guest.deleted.title')}</h1>
                    <p className="mt-2 text-sm text-muted-foreground">{t('guest.deleted.body')}</p>
                </div>
            </PublicShell>
        );
    }
    if (view.kind !== 'ready') {
        const key = view.kind === 'notFound' ? 'guest.err.manageInvalid' : view.kind === 'rateLimited' ? 'guest.err.rateLimited' : 'guest.err.generic';
        return <PublicMessage title={t(`${key}.title`)} body={t(`${key}.body`)} />;
    }

    const { event, registration, status, canChange } = view.data;
    const form = registration.form;

    async function save(e: React.FormEvent) {
        e.preventDefault();
        if (lock.current) return;
        const fields = form?.fields ?? [];
        const clientErrors = form ? validateAnswers(fields, answers, { mode: 'submit' }) : {};
        if (Object.keys(clientErrors).length > 0) {
            setErrors(clientErrors);
            setMessage({ tone: 'error', text: t('guest.err.invalid') });
            const first = fields.find((f) => f.key in clientErrors);
            if (first) focusField('guest-manage', first.key);
            return;
        }
        lock.current = true;
        setBusy(true);
        setErrors({});
        setMessage(null);
        const r = await changeManaged(token, { name: name.trim(), partySize, ...(form ? { answers: visibleAnswers(fields, answers) } : {}) });
        lock.current = false;
        setBusy(false);
        if (r.kind === 'ok') {
            setMessage({ tone: 'ok', text: t('guest.manage.saved') });
            setView((v) => (v.kind === 'ready' ? { kind: 'ready', data: { ...v.data, status: r.data.status, partySize: r.data.partySize, name: name.trim() } } : v));
            return;
        }
        if (r.kind === 'invalid') setErrors(r.fields);
        setMessage({ tone: 'error', text: t(publicResultKey(r)) });
    }

    async function cancel() {
        if (!(await confirm({ title: t('guest.cancel.title'), body: t('guest.cancel.body'), confirmLabel: t('guest.cancel.confirm'), danger: true }))) return;
        lock.current = true;
        setBusy(true);
        const r = await cancelManaged(token);
        lock.current = false;
        setBusy(false);
        if (r.kind === 'ok') setView({ kind: 'deleted' });
        else setMessage({ tone: 'error', text: t(publicResultKey(r)) });
    }

    return (
        <PublicShell wide>
            <PublicEventSummary event={event} />
            <p className="mt-4 text-sm text-foreground">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status === 'angemeldet' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}`}>{t(`participants.status.${status}`)}</span>{' '}
                <span className="text-muted-foreground">{t('guest.manage.persons', { count: view.data.partySize })}</span>
            </p>
            {canChange ? (
                <form onSubmit={(e) => void save(e)} className="mt-6 space-y-4" noValidate>
                    <h2 className="text-base font-bold text-foreground">{t('guest.manage.change')}</h2>
                    <div>
                        <label htmlFor="manage-name" className="block text-sm font-medium text-foreground">
                            {t('guest.name')}
                        </label>
                        <input id="manage-name" type="text" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} mt-1`} />
                    </div>
                    {registration.maxCompanions > 0 && (
                        <div>
                            <label htmlFor="manage-party" className="block text-sm font-medium text-foreground">
                                {t('guest.party')}
                            </label>
                            <select id="manage-party" value={partySize} onChange={(e) => setPartySize(Number(e.target.value))} className={`${inputClass} mt-1`}>
                                {partySizeOptions(registration.maxCompanions).map((n) => (
                                    <option key={n} value={n}>
                                        {t('guest.party.option', { count: n })}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    {form && (
                        <FormRenderer fields={form.fields} privacyNotice={null} answers={answers} onChange={(key, value) => setAnswers((a) => ({ ...a, [key]: value }))} errors={errors} idPrefix="guest-manage" disabled={busy} />
                    )}
                    {message && (
                        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`rounded-lg px-3 py-2 text-sm ${message.tone === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                            {message.text}
                        </p>
                    )}
                    <button type="submit" disabled={busy || !name.trim()} className={publicButton}>
                        {t('guest.manage.save')}
                    </button>
                </form>
            ) : (
                <p role="status" className="mt-6 rounded-lg bg-muted px-3 py-3 text-sm text-foreground">
                    {t('guest.manage.locked')}
                </p>
            )}
            <div className="mt-4">
                <button type="button" disabled={busy} onClick={() => void cancel()} className={publicSecondaryButton}>
                    {t('guest.cancel.button')}
                </button>
                <p className="mt-2 text-center text-xs text-muted-foreground">{t('guest.cancel.hint')}</p>
            </div>
            {dialog}
        </PublicShell>
    );
}
