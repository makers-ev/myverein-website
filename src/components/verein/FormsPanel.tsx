'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, ClipboardList, DoorOpen, Lock, Plus } from 'lucide-react';

import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import FormEditor from '@/components/verein/FormEditor';
import { Chip, EmptyState, SectionCard } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { formatDate, inputClass, primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import { type CustomFieldRef, editableForms, editorErrorKey, type FormSummary } from '@/lib/formEditor';

/**
 * "Formulare" in the club area (Wave 8 W2, `forms:write`): the standard forms of the club (Aufnahmeantrag, Austrittsformular,
 * always present) with their state, and the editor for one of them. Everything under `/forms` needs `forms:write`, so
 * without it nothing is loaded and an explanation is shown instead of a broken page.
 */
export default function FormsPanel({
    clubId,
    permissions,
    onDirtyChange,
    onOpenCategorySettings,
}: {
    clubId: string;
    permissions: string[];
    onDirtyChange: (dirty: boolean) => void;
    /** Opens the category settings (where applicants' choice is allowed); omitted when the caller has no access to them. */
    onOpenCategorySettings?: () => void;
}) {
    const { t, language } = useLanguage();
    const canWrite = permissions.includes('forms:write');
    const [forms, setForms] = useState<FormSummary[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [openId, setOpenId] = useState<string | null>(null);
    // Wave 12: event registration forms (purpose `veranstaltungsanmeldung`) can be created, the standard forms always exist.
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [createBusy, setCreateBusy] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [customFields, setCustomFields] = useState<CustomFieldRef[]>([]);
    const [customFieldsFailed, setCustomFieldsFailed] = useState(false);
    const [categories, setCategories] = useState<Array<{ key: string; name: string }>>([]);
    // `null` until the categories are loaded (or when loading failed): the editor then skips the "no selectable category" pre-warning.
    const [categoriesLoaded, setCategoriesLoaded] = useState(false);

    const load = useCallback(() => {
        setFailed(false);
        apiFetch<{ data: FormSummary[] }>(`/forms?clubId=${clubId}`)
            .then((res) => setForms(res.data))
            .catch(() => setFailed(true));
    }, [clubId]);

    useEffect(() => {
        if (!canWrite) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
        // Reference data of the editor (mapping targets, category options); the editor works without them and says so.
        apiFetch<{ data: CustomFieldRef[] }>(`/member-fields?clubId=${clubId}`)
            .then((res) => {
                setCustomFields(res.data.map((d) => ({ key: d.key, label: d.label, type: d.type, sensitive: d.sensitive, archived: d.archived })));
                setCustomFieldsFailed(false);
            })
            .catch(() => setCustomFieldsFailed(true));
        // Applicants only get the categories that are live and marked selectable for them.
        apiFetch<{ data: Array<{ key: string; name: string; archived?: boolean; applicantSelectable?: boolean }> }>(`/club-members/categories?clubId=${clubId}`)
            .then((res) => {
                setCategories(res.data.filter((c) => !c.archived && c.applicantSelectable !== false).map((c) => ({ key: c.key, name: c.name })));
                setCategoriesLoaded(true);
            })
            .catch(() => {
                setCategories([]);
                setCategoriesLoaded(false);
            });
    }, [canWrite, clubId, load]);

    if (!canWrite) {
        return (
            <SectionCard title={t('forms.editor.title')}>
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {t('forms.editor.noAccess')}
                </p>
            </SectionCard>
        );
    }

    const open = forms?.find((f) => f.id === openId) ?? null;
    if (open) {
        return (
            <FormEditor
                key={open.id}
                clubId={clubId}
                form={open}
                customFields={customFields}
                customFieldsFailed={customFieldsFailed}
                categories={categories}
                selectableCategories={categoriesLoaded ? categories.length : null}
                onOpenCategorySettings={onOpenCategorySettings}
                onDirtyChange={onDirtyChange}
                onBack={(changed) => {
                    setOpenId(null);
                    if (changed) load();
                }}
            />
        );
    }

    const list = forms ? editableForms(forms) : [];

    async function createEventForm(e: React.FormEvent) {
        e.preventDefault();
        const name = newName.trim();
        if (!name) return;
        setCreateBusy(true);
        setCreateError(null);
        try {
            const res = await apiFetch<{ data: { form: { id: string } } }>(`/forms?clubId=${clubId}`, { method: 'POST', body: { purpose: 'veranstaltungsanmeldung', name } });
            setCreating(false);
            setNewName('');
            load();
            setOpenId(res.data.form.id);
        } catch (err) {
            setCreateError(t(editorErrorKey(err)));
        } finally {
            setCreateBusy(false);
        }
    }

    return (
        <div>
            <div className="mb-3">
                <h2 className="text-sm font-bold text-foreground">{t('forms.editor.title')}</h2>
                <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t('forms.editor.hint')}</p>
            </div>
            <div className="mb-3">
                {creating ? (
                    <form onSubmit={(e) => void createEventForm(e)} className="flex flex-wrap items-end gap-2">
                        <div className="min-w-56 flex-1">
                            <label htmlFor="new-event-form-name" className="mb-1 block text-xs font-medium text-muted-foreground">
                                {t('forms.editor.createEvent.name')}
                            </label>
                            <input id="new-event-form-name" type="text" required maxLength={120} autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} className={inputClass} />
                        </div>
                        <button type="submit" disabled={createBusy || !newName.trim()} className={primaryButtonClass}>
                            {t('forms.editor.createEvent.submit')}
                        </button>
                        <button type="button" onClick={() => setCreating(false)} className={secondaryButtonClass}>
                            {t('forms.editor.createEvent.cancel')}
                        </button>
                        {createError && (
                            <p role="alert" className="w-full text-xs text-destructive">
                                {createError}
                            </p>
                        )}
                    </form>
                ) : (
                    <button type="button" onClick={() => setCreating(true)} className={secondaryButtonClass}>
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        {t('forms.editor.createEvent')}
                    </button>
                )}
            </div>
            {failed ? (
                <LoadError onRetry={load} />
            ) : !forms ? (
                <LoadingText />
            ) : list.length === 0 ? (
                <EmptyState icon={<ClipboardList className="h-6 w-6" aria-hidden="true" />} text={t('forms.editor.empty')} />
            ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                    {list.map((f) => (
                        <li key={f.id} className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4">
                            <div className="min-w-0">
                                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                    {f.purpose === 'aufnahme' ? (
                                        <ClipboardList className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                                    ) : f.purpose === 'veranstaltungsanmeldung' ? (
                                        <CalendarCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                                    ) : (
                                        <DoorOpen className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                                    )}
                                    <span className="break-words">{f.name}</span>
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">{t(`forms.editor.purpose.${f.purpose}`)}</p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {f.publishedVersion !== null ? <Chip tone="success">{t('forms.editor.list.published', { version: f.publishedVersion })}</Chip> : <Chip tone="muted">{t('forms.editor.status.unpublished')}</Chip>}
                                    {f.draftVersion !== null && <Chip tone="primary">{t('forms.editor.list.draft', { version: f.draftVersion })}</Chip>}
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">{t('forms.editor.list.changed', { date: formatDate(f.updatedAt, language) })}</p>
                            </div>
                            <div>
                                <button type="button" onClick={() => setOpenId(f.id)} className={primaryButtonClass}>
                                    {t('forms.editor.list.edit')}
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
