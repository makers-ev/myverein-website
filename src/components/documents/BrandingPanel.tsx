'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Trash2 } from 'lucide-react';

import LoadingText from '@/components/LoadingText';
import LoadError from '@/components/LoadError';
import { SectionCard, inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { BRANDING_LIMITS, type Branding, type BrandingForm, brandingPatch, brandingProblem, brandingToForm, clubQuery, documentErrorKey, openPdf, uploadWithProgress } from '@/lib/documents';
import UploadControl from './UploadControl';

const COLOR_FIELDS = ['primaryColor', 'accentColor'] as const;
const TEXT_FIELDS = ['address', 'register', 'representatives', 'contact'] as const;

/** Branding of the club's documents (`branding:write`, Wave 13 W5): logo with preview, colours, letterhead, test page as PDF. */
export default function BrandingPanel({ clubId }: { clubId: string }) {
    const { t } = useLanguage();
    const [branding, setBranding] = useState<Branding | null>(null);
    const [form, setForm] = useState<BrandingForm | null>(null);
    const [failed, setFailed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [previewing, setPreviewing] = useState(false);
    const logoRetried = useRef(false);
    const q = clubQuery(clubId);
    const base = `/club-settings/branding`;

    const load = useCallback(
        async (keepForm = false) => {
            setFailed(false);
            try {
                const res = await apiFetch<{ data: Branding }>(`${base}?${q}`);
                setBranding(res.data);
                if (!keepForm) setForm(brandingToForm(res.data));
            } catch {
                setFailed(true);
            }
        },
        [base, q],
    );

    const logoUrl = branding?.logo?.url ?? null;
    useEffect(() => {
        // A different logo (new upload) gets its own single retry.
        logoRetried.current = false;
    }, [logoUrl]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    if (failed) return <LoadError onRetry={() => void load()} />;
    if (!branding || !form) return <LoadingText />;

    const original = brandingToForm(branding);
    const patch = brandingPatch(original, form);
    const problem = brandingProblem(form);
    const set = (key: keyof BrandingForm, value: string) => {
        setNotice(null);
        setForm({ ...form, [key]: value });
    };

    async function save() {
        if (problem || Object.keys(patch).length === 0) return;
        setSaving(true);
        setError(null);
        setNotice(null);
        try {
            const res = await apiFetch<{ data: Branding }>(`${base}?${q}`, { method: 'PATCH', body: patch });
            setBranding(res.data);
            setForm(brandingToForm(res.data));
            setNotice(t('docs.branding.saved'));
        } catch (err) {
            setError(t(documentErrorKey(err)));
        } finally {
            setSaving(false);
        }
    }

    async function preview() {
        setPreviewing(true);
        setError(null);
        try {
            await openPdf(`${base}/preview?${q}`, 'POST');
        } catch (err) {
            setError(t(documentErrorKey(err)));
        } finally {
            setPreviewing(false);
        }
    }

    return (
        <SectionCard title={t('docs.branding.title')}>
            <p className="mb-4 text-sm text-muted-foreground">{t('docs.branding.intro')}</p>

            <div className="space-y-4">
                <section aria-label={t('docs.branding.logo')} className="space-y-2">
                    <h3 className="text-sm font-bold text-foreground">{t('docs.branding.logo')}</h3>
                    {branding.logo ? (
                        <div className="flex flex-wrap items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element -- signed short-lived URL from the media layer */}
                            <img src={branding.logo.url} alt={t('docs.branding.logo.alt')} onError={() => {
                                    // The signed URL may have expired: reload once, then stop (no endless loop on a broken image).
                                    if (!logoRetried.current) {
                                        logoRetried.current = true;
                                        void load(true);
                                    }
                                }} className="max-h-20 max-w-48 rounded-lg border border-border bg-white object-contain p-2" />
                            <button
                                type="button"
                                className={`${secondaryButtonClass} text-destructive`}
                                onClick={async () => {
                                    setError(null);
                                    try {
                                        await apiFetch(`${base}/logo?${q}`, { method: 'DELETE' });
                                        await load(true);
                                    } catch (err) {
                                        setError(t(documentErrorKey(err)));
                                    }
                                }}
                            >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                {t('docs.branding.logo.remove')}
                            </button>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">{t('docs.branding.logo.none')}</p>
                    )}
                    <UploadControl
                        kind="logo"
                        label={t(branding.logo ? 'docs.branding.logo.replace' : 'docs.branding.logo.add')}
                        onUpload={async (file, onProgress) => {
                            await uploadWithProgress('PUT', `${base}/logo?${q}`, {}, file, file.name, onProgress);
                        }}
                        onDone={() => void load(true)}
                    />
                </section>

                <section aria-label={t('docs.branding.colors')} className="space-y-2">
                    <h3 className="text-sm font-bold text-foreground">{t('docs.branding.colors')}</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {COLOR_FIELDS.map((key) => (
                            <div key={key}>
                                <label htmlFor={`docs-${key}`} className="mb-1 block text-xs font-medium text-muted-foreground">
                                    {t(`docs.branding.${key}`)}
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        aria-label={t(`docs.branding.${key}`)}
                                        value={/^#[0-9a-fA-F]{6}$/.test(form[key]) ? form[key] : branding.effective[key]}
                                        onChange={(e) => set(key, e.target.value)}
                                        className="h-9 w-12 shrink-0 cursor-pointer rounded border border-border bg-background"
                                    />
                                    <input id={`docs-${key}`} value={form[key]} placeholder={branding.effective[key]} maxLength={7} onChange={(e) => set(key, e.target.value)} className={inputClass} />
                                    {form[key] && (
                                        <button type="button" className={secondaryButtonClass} onClick={() => set(key, '')}>
                                            {t('docs.branding.reset')}
                                        </button>
                                    )}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">{t(`docs.branding.${key}.hint`)}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section aria-label={t('docs.branding.letterhead')} className="space-y-3">
                    <h3 className="text-sm font-bold text-foreground">{t('docs.branding.letterhead')}</h3>
                    {TEXT_FIELDS.map((key) => (
                        <label key={key} className="block">
                            <span className="mb-1 block text-xs font-medium text-muted-foreground">{t(`docs.branding.${key}`)}</span>
                            <textarea value={form[key]} rows={key === 'register' ? 2 : 3} maxLength={BRANDING_LIMITS[key]} onChange={(e) => set(key, e.target.value)} className={inputClass} />
                        </label>
                    ))}
                    <label className="block">
                        <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.branding.footer')}</span>
                        <input value={form.footer} maxLength={BRANDING_LIMITS.footer} onChange={(e) => set('footer', e.target.value)} className={inputClass} />
                    </label>
                </section>

                {(problem || error) && (
                    <p role="alert" className="text-sm text-destructive">
                        {problem ? t(problem) : error}
                    </p>
                )}
                {notice && (
                    <p role="status" className="text-sm text-success">
                        {notice}
                    </p>
                )}
                <div className="flex flex-wrap gap-2">
                    <button type="button" className={primaryButtonClass} disabled={saving || !!problem || Object.keys(patch).length === 0} onClick={() => void save()}>
                        {t('docs.common.save')}
                    </button>
                    <button type="button" className={secondaryButtonClass} disabled={previewing} onClick={() => void preview()}>
                        <FileText className="h-4 w-4" aria-hidden="true" />
                        {t(previewing ? 'docs.branding.preview.busy' : 'docs.branding.preview')}
                    </button>
                </div>
                <p className="text-xs text-muted-foreground">{t('docs.branding.preview.hint')}</p>
            </div>
        </SectionCard>
    );
}
