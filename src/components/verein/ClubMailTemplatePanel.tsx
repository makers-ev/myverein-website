'use client';

import { useCallback, useEffect, useState } from 'react';

import { errorMessage, Field, SectionCard } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { inputClass, primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import {
    MAIL_PREVIEW_TEMPLATES,
    type MailPreview,
    type MailPreviewTemplate,
    type MailTemplateSettings,
    SENDER_NAME_MAX,
    SIGNATURE_MAX,
    draftFromTemplate,
    mailTemplatePatch,
    mailTemplateProblems,
} from '@/lib/clubCommSettings';

/**
 * "Absender und Vorlage" in the Einstellungen tab (Wave 9 W6, `announcements:write`): sender name, signature and reply-to
 * of the club's e-mails plus a preview that renders a sample mail with the (even unsaved) values. The sender address stays
 * the platform's fixed address (SPF/DKIM) -- only the display name and reply-to are the club's. The preview shows sample
 * data only and is rendered in a sandboxed frame without scripts.
 */
export default function ClubMailTemplatePanel({ clubId }: { clubId: string }) {
    const { t } = useLanguage();
    const [saved, setSaved] = useState<MailTemplateSettings | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [draft, setDraft] = useState(draftFromTemplate({}));
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
    const [template, setTemplate] = useState<MailPreviewTemplate>('announcement');
    const [preview, setPreview] = useState<{ state: 'loading' } | { state: 'error'; text: string } | { state: 'ready'; data: MailPreview } | null>(null);

    const apply = useCallback((s: MailTemplateSettings) => {
        setSaved(s);
        setDraft(draftFromTemplate(s));
    }, []);

    const load = useCallback(async () => {
        setLoadError(null);
        try {
            const res = await apiFetch<{ data: MailTemplateSettings }>(`/club-settings?clubId=${clubId}`);
            apply(res.data);
        } catch (err) {
            setLoadError(errorMessage(err, t));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId, apply]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    if (loadError) {
        return (
            <SectionCard title={t('verein.mail.title')}>
                <p role="alert" className="text-sm text-destructive">
                    {loadError}{' '}
                    <button type="button" onClick={() => void load()} className="font-semibold underline">
                        {t('verein.common.retry')}
                    </button>
                </p>
            </SectionCard>
        );
    }
    if (!saved) {
        return (
            <SectionCard title={t('verein.mail.title')}>
                <p role="status" className="text-sm text-muted-foreground">
                    {t('verein.settings.loading')}
                </p>
            </SectionCard>
        );
    }

    const problems = mailTemplateProblems(draft);
    const patch = mailTemplatePatch(saved, draft);
    const dirty = Object.keys(patch).length > 0;

    async function save(e: React.FormEvent) {
        e.preventDefault();
        if (!dirty || problems.length > 0) return;
        setBusy(true);
        setStatus(null);
        try {
            const res = await apiFetch<{ data: MailTemplateSettings }>(`/club-settings?clubId=${clubId}`, { method: 'PATCH', body: patch });
            apply(res.data);
            setStatus({ ok: true, text: t('verein.settings.saved') });
        } catch (err) {
            setStatus({ ok: false, text: errorMessage(err, t) });
        } finally {
            setBusy(false);
        }
    }

    async function showPreview() {
        setPreview({ state: 'loading' });
        try {
            const res = await apiFetch<{ data: MailPreview }>(`/club-settings/mail-preview?clubId=${clubId}`, {
                method: 'POST',
                body: {
                    template,
                    senderName: draft.senderName.trim() || null,
                    signature: draft.signature.trim() || null,
                    replyTo: draft.replyTo.trim() || null,
                },
            });
            setPreview({ state: 'ready', data: res.data });
        } catch (err) {
            setPreview({ state: 'error', text: errorMessage(err, t) });
        }
    }

    const has = (p: 'senderName' | 'signature' | 'replyTo') => problems.includes(p);

    return (
        <SectionCard title={t('verein.mail.title')}>
            <form onSubmit={(e) => void save(e)} className="space-y-4">
                <p className="text-xs text-muted-foreground">{t('verein.mail.hint')}</p>
                <Field label={t('verein.mail.senderName')}>
                    <input
                        value={draft.senderName}
                        maxLength={SENDER_NAME_MAX}
                        placeholder={t('verein.mail.senderName.placeholder')}
                        aria-invalid={has('senderName')}
                        onChange={(e) => setDraft((d) => ({ ...d, senderName: e.target.value }))}
                        className={inputClass}
                    />
                </Field>
                <p className="-mt-2 text-xs text-muted-foreground">{t(has('senderName') ? 'verein.mail.senderName.invalid' : 'verein.mail.senderName.hint')}</p>
                <Field label={t('verein.mail.replyTo')}>
                    <input
                        type="email"
                        value={draft.replyTo}
                        placeholder="vorstand@verein.de"
                        aria-invalid={has('replyTo')}
                        onChange={(e) => setDraft((d) => ({ ...d, replyTo: e.target.value }))}
                        className={inputClass}
                    />
                </Field>
                <p className={`-mt-2 text-xs ${has('replyTo') ? 'text-destructive' : 'text-muted-foreground'}`}>{t(has('replyTo') ? 'verein.mail.replyTo.invalid' : 'verein.mail.replyTo.hint')}</p>
                <Field label={t('verein.mail.signature')}>
                    <textarea
                        rows={4}
                        value={draft.signature}
                        maxLength={SIGNATURE_MAX}
                        aria-invalid={has('signature')}
                        onChange={(e) => setDraft((d) => ({ ...d, signature: e.target.value }))}
                        className={inputClass}
                    />
                </Field>
                <p className="-mt-2 text-xs text-muted-foreground">{t('verein.mail.signature.hint', { count: draft.signature.length, max: SIGNATURE_MAX })}</p>

                <div className="flex flex-wrap items-center gap-3">
                    <button type="submit" disabled={busy || !dirty || problems.length > 0} className={primaryButtonClass}>
                        {t('verein.profil.save')}
                    </button>
                    {status && (
                        <span role={status.ok ? 'status' : 'alert'} className={`text-sm ${status.ok ? 'text-success' : 'text-destructive'}`}>
                            {status.text}
                        </span>
                    )}
                </div>
            </form>

            <div className="mt-6 space-y-3 border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-foreground">{t('verein.mail.preview.title')}</h3>
                <p className="text-xs text-muted-foreground">{t('verein.mail.preview.hint')}</p>
                <div className="flex flex-wrap items-center gap-2">
                    <select value={template} onChange={(e) => setTemplate(e.target.value as MailPreviewTemplate)} aria-label={t('verein.mail.preview.template')} className={`${inputClass} !w-auto`}>
                        {MAIL_PREVIEW_TEMPLATES.map((m) => (
                            <option key={m} value={m}>
                                {t(`verein.mail.preview.template.${m}`)}
                            </option>
                        ))}
                    </select>
                    <button type="button" onClick={() => void showPreview()} disabled={problems.length > 0 || preview?.state === 'loading'} className={secondaryButtonClass}>
                        {t('verein.mail.preview.show')}
                    </button>
                </div>
                {preview?.state === 'loading' && (
                    <p role="status" className="text-sm text-muted-foreground">
                        {t('common.loading')}
                    </p>
                )}
                {preview?.state === 'error' && (
                    <p role="alert" className="text-sm text-destructive">
                        {preview.text}
                    </p>
                )}
                {preview?.state === 'ready' && (
                    <div className="space-y-2">
                        <dl className="grid gap-x-3 gap-y-1 rounded-lg bg-muted/50 p-3 text-xs sm:grid-cols-[auto_1fr]">
                            <dt className="font-semibold text-muted-foreground">{t('verein.mail.preview.from')}</dt>
                            <dd className="break-all text-foreground">{preview.data.from}</dd>
                            <dt className="font-semibold text-muted-foreground">{t('verein.mail.preview.replyTo')}</dt>
                            <dd className="break-all text-foreground">{preview.data.replyTo ?? '—'}</dd>
                            <dt className="font-semibold text-muted-foreground">{t('verein.mail.preview.subject')}</dt>
                            <dd className="text-foreground">{preview.data.subject}</dd>
                        </dl>
                        {/* Sample data only; `sandbox=""` = no scripts, no forms, no same-origin access. */}
                        <iframe title={t('verein.mail.preview.frame')} sandbox="" srcDoc={preview.data.html} referrerPolicy="no-referrer" className="h-[28rem] w-full rounded-lg border border-border bg-white" />
                        <p className="text-xs text-muted-foreground">{t('verein.mail.preview.sample')}</p>
                    </div>
                )}
            </div>
        </SectionCard>
    );
}
