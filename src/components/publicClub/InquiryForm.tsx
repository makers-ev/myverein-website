'use client';

import { useRef, useState } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

import { useLanguage } from '@/contexts/LanguageContext';
import { type PublicClub, submitLead } from '@/lib/publicClub';
import { UI_BTN_PRIMARY, UI_INPUT, UI_LABEL } from '@/lib/uiClasses';

/** Translation key for a failed submit; never says anything about the club beyond "not possible right now". */
export function inquiryErrorKey(kind: 'notFound' | 'rateLimited' | 'invalid' | 'conflict' | 'error'): string {
    switch (kind) {
        case 'rateLimited':
            return 'pc.form.err.rateLimited';
        case 'invalid':
            return 'pc.form.err.invalid';
        case 'notFound':
        case 'conflict':
            return 'pc.form.err.unavailable';
        default:
            return 'pc.form.err.generic';
    }
}

/**
 * Inquiry / trial session form of the public club page (Wave 15 B4). No session. Honeypot field, explicit privacy consent, the
 * thank-you state replaces the form. `disabled` is the editor preview: the form is shown but nothing can be sent.
 */
export default function InquiryForm({ club, disabled = false }: { club: Pick<PublicClub, 'slug' | 'name' | 'leadForm'>; disabled?: boolean }) {
    const { t } = useLanguage();
    const [kind, setKind] = useState<'trial' | 'inquiry'>(club.leadForm.trialTraining ? 'trial' : 'inquiry');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [department, setDepartment] = useState('');
    const [message, setMessage] = useState('');
    const [accepted, setAccepted] = useState(false);
    const [honeypot, setHoneypot] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, unknown>>({});
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const submitting = useRef(false);
    const ready = accepted && name.trim().length >= 2 && email.trim() !== '';

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (disabled || submitting.current || !ready) return;
        submitting.current = true;
        setBusy(true);
        setError(null);
        setFieldErrors({});
        const r = await submitLead(club.slug, {
            name: name.trim(),
            email: email.trim(),
            privacyAccepted: true,
            website: honeypot,
            ...(club.leadForm.trialTraining && kind === 'trial' ? { trialRequested: true } : {}),
            ...(phone.trim() ? { phone: phone.trim() } : {}),
            ...(department ? { departmentId: department } : {}),
            ...(message.trim() ? { message: message.trim() } : {}),
        });
        submitting.current = false;
        setBusy(false);
        if (r.kind === 'ok') setDone(true);
        else {
            if (r.kind === 'invalid') setFieldErrors(r.fields);
            setError(t(inquiryErrorKey(r.kind)));
        }
    }

    const bad = (key: string) => key in fieldErrors;
    const fieldHint = (key: string, id: string) => (bad(key) ? <p id={`${id}-err`} className="mt-1 text-xs text-destructive">{t('pc.form.err.field')}</p> : null);
    const attrs = (key: string, id: string) => (bad(key) ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-err` } : {});

    if (done) {
        return (
            <div role="status" className="rounded-xl bg-success-soft p-6 text-center">
                <CheckCircleIcon className="mx-auto h-10 w-10 text-success" aria-hidden />
                <h3 className="mt-3 text-lg font-semibold text-foreground">{t('pc.form.thanks.title')}</h3>
                <p className="mt-1 text-sm text-foreground">{t('pc.form.thanks.body')}</p>
            </div>
        );
    }

    return (
        <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate aria-label={t(club.leadForm.trialTraining ? 'pc.form.title.trial' : 'pc.form.title.inquiry')}>
            <p className="text-sm text-muted-foreground">{t('pc.form.intro')}</p>
            {club.leadForm.trialTraining && (
                <fieldset>
                    <legend className={UI_LABEL}>{t('pc.form.kind')}</legend>
                    <div className="flex flex-wrap gap-4 text-sm text-foreground">
                        {(['trial', 'inquiry'] as const).map((k) => (
                            <label key={k} className="flex min-h-11 items-center gap-2">
                                <input type="radio" name="pc-kind" value={k} checked={kind === k} onChange={() => setKind(k)} disabled={disabled || busy} />
                                {t(`pc.form.kind.${k}`)}
                            </label>
                        ))}
                    </div>
                </fieldset>
            )}
            <div>
                <label htmlFor="pc-name" className={UI_LABEL}>
                    {t('pc.form.name')} <span aria-hidden className="text-destructive">*</span>
                </label>
                <input id="pc-name" type="text" required maxLength={100} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} disabled={disabled} className={UI_INPUT} aria-describedby={name.trim().length === 1 ? 'pc-name-hint' : undefined} {...attrs('name', 'pc-name')} />
                {name.trim().length === 1 && (
                    <p id="pc-name-hint" className="mt-1 text-xs text-muted-foreground">
                        {t('pc.form.name.hint')}
                    </p>
                )}
                {fieldHint('name', 'pc-name')}
            </div>
            <div>
                <label htmlFor="pc-email" className={UI_LABEL}>
                    {t('pc.form.email')} <span aria-hidden className="text-destructive">*</span>
                </label>
                <input id="pc-email" type="email" required maxLength={200} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={disabled} className={UI_INPUT} {...attrs('email', 'pc-email')} />
                {fieldHint('email', 'pc-email')}
            </div>
            <div>
                <label htmlFor="pc-phone" className={UI_LABEL}>
                    {t('pc.form.phone')}
                </label>
                <input id="pc-phone" type="tel" maxLength={40} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={disabled} className={UI_INPUT} {...attrs('phone', 'pc-phone')} />
                {fieldHint('phone', 'pc-phone')}
            </div>
            {club.leadForm.departments.length > 0 && (
                <div>
                    <label htmlFor="pc-department" className={UI_LABEL}>
                        {t('pc.form.department')}
                    </label>
                    <select id="pc-department" value={department} onChange={(e) => setDepartment(e.target.value)} disabled={disabled} className={UI_INPUT}>
                        <option value="">{t('pc.form.department.none')}</option>
                        {club.leadForm.departments.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            <div>
                <label htmlFor="pc-message" className={UI_LABEL}>
                    {t('pc.form.message')}
                </label>
                <textarea id="pc-message" rows={4} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} disabled={disabled} className={UI_INPUT} {...attrs('message', 'pc-message')} />
                {fieldHint('message', 'pc-message')}
            </div>
            {/* Honeypot: hidden from people and assistive technology, bots fill it in. */}
            <div aria-hidden="true" inert className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <input name="xq_contact_ref" type="text" tabIndex={-1} autoComplete="off" data-lpignore="true" data-1p-ignore value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
            </div>
            <div>
                <label className="flex items-start gap-2 text-sm text-foreground">
                    <input type="checkbox" required checked={accepted} onChange={(e) => setAccepted(e.target.checked)} disabled={disabled} className="mt-1 h-4 w-4" />
                    <span>{t('pc.form.privacy', { club: club.name })}</span>
                </label>
                {club.leadForm.privacyNotice ? (
                    <details className="mt-2 rounded-lg border border-hairline px-3 py-2 text-sm">
                        <summary className="min-h-8 cursor-pointer font-medium text-primary-text">{t('pc.form.notice.title', { club: club.name })}</summary>
                        <div className="mt-2 max-h-60 overflow-y-auto whitespace-pre-line text-xs text-foreground">{club.leadForm.privacyNotice.body}</div>
                    </details>
                ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                        {t('pc.form.privacy.hint', { club: club.name })}{' '}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-primary-text underline">
                            {t('pc.form.privacy.link')}
                        </a>
                    </p>
                )}
            </div>
            {error && (
                <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive">
                    {error}
                </p>
            )}
            {!disabled && !busy && !ready && <p className="text-xs text-muted-foreground">{t('pc.form.submit.hint')}</p>}
            <button type="submit" disabled={disabled || busy || !ready} className={`${UI_BTN_PRIMARY} w-full sm:w-auto`}>
                {t(busy ? 'pc.form.submit.busy' : 'pc.form.submit')}
            </button>
        </form>
    );
}
