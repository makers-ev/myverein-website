'use client';

import { useCallback, useEffect, useState } from 'react';
import { Archive, Pencil, Plus } from 'lucide-react';

import { Modal } from '@/components/Modal';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import {
    inputClass,
    memberCountFromError,
    memberErrorKey,
    primaryButtonClass,
    secondaryButtonClass,
    type MemberCategory,
} from '@/lib/clubMembers';

const DEFAULT_CATEGORY_KEY = 'aktiv';

function ageRangeText(c: MemberCategory, t: (key: string, p?: Record<string, string | number>) => string): string {
    if (c.minAge === null && c.maxAge === null) return t('verein.categories.age.none');
    if (c.minAge !== null && c.maxAge !== null) return t('verein.categories.age.range', { min: c.minAge, max: c.maxAge });
    if (c.minAge !== null) return t('verein.categories.age.from', { min: c.minAge });
    return t('verein.categories.age.to', { max: c.maxAge ?? 0 });
}

interface FormState {
    name: string;
    key: string;
    votingRight: boolean;
    applicantSelectable: boolean;
    minAge: string;
    maxAge: string;
    autoTransitionToKey: string;
}

function CategoryFormModal({
    category,
    all,
    clubId,
    onClose,
    onSaved,
}: {
    /** `null` = create. */
    category: MemberCategory | null;
    all: MemberCategory[];
    clubId: string;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { t } = useLanguage();
    const initialForm: FormState = {
        name: category?.name ?? '',
        key: '',
        votingRight: category?.votingRight ?? true,
        applicantSelectable: category?.applicantSelectable ?? false,
        minAge: category?.minAge?.toString() ?? '',
        maxAge: category?.maxAge?.toString() ?? '',
        autoTransitionToKey: category?.autoTransitionToKey ?? '',
    };
    const [initial] = useState(initialForm);
    const [form, setForm] = useState<FormState>(initial);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const targets = all.filter((c) => !c.archived && c.key !== category?.key);
    const hasMax = form.maxAge.trim() !== '';

    function parseAge(v: string): number | null | undefined {
        if (v.trim() === '') return null;
        const n = Number(v);
        return Number.isInteger(n) && n >= 0 && n <= 120 ? n : undefined;
    }

    // Esc, the X and a click on the backdrop all end up here: never drop typed input without asking.
    function requestClose() {
        if (JSON.stringify(form) !== JSON.stringify(initial) && !window.confirm(t('verein.form.discard'))) return;
        onClose();
    }

    async function save() {
        const name = form.name.trim();
        if (!name) {
            setError(t('verein.categories.err.name'));
            return;
        }
        const minAge = parseAge(form.minAge);
        const maxAge = parseAge(form.maxAge);
        if (minAge === undefined || maxAge === undefined) {
            setError(t('verein.categories.err.age'));
            return;
        }
        if (minAge !== null && maxAge !== null && minAge > maxAge) {
            setError(t('verein.err.ageRange'));
            return;
        }
        const auto = maxAge === null ? null : form.autoTransitionToKey || null;
        if (!category && form.key.trim() && !/^[a-z0-9][a-z0-9_-]{0,49}$/.test(form.key.trim().toLowerCase())) {
            setError(t('verein.err.categoryKeyInvalid'));
            return;
        }
        setSaving(true);
        setError(null);
        try {
            if (category) {
                await apiFetch(`/club-members/categories/${category.id}?clubId=${clubId}`, {
                    method: 'PATCH',
                    body: { name, votingRight: form.votingRight, applicantSelectable: form.applicantSelectable, minAge, maxAge, autoTransitionToKey: auto },
                });
            } else {
                await apiFetch(`/club-members/categories?clubId=${clubId}`, {
                    method: 'POST',
                    body: {
                        name,
                        ...(form.key.trim() ? { key: form.key.trim().toLowerCase() } : {}),
                        votingRight: form.votingRight,
                        applicantSelectable: form.applicantSelectable,
                        ...(minAge !== null ? { minAge } : {}),
                        ...(maxAge !== null ? { maxAge } : {}),
                        ...(auto ? { autoTransitionToKey: auto } : {}),
                    },
                });
            }
            onSaved();
            onClose();
        } catch (err) {
            setError(t(memberErrorKey(err)));
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            open
            onClose={saving ? () => {} : requestClose}
            title={category ? t('verein.categories.edit.title', { name: category.name }) : t('verein.categories.create.title')}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={requestClose} disabled={saving} className={secondaryButtonClass}>
                        {t('verein.roles.add.cancel')}
                    </button>
                    <button type="button" onClick={() => void save()} disabled={saving} className={primaryButtonClass}>
                        {category ? t('verein.profil.save') : t('verein.departments.new.submit')}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <label className="block text-xs font-semibold text-muted-foreground">
                    {t('verein.categories.field.name')} *
                    <input value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`mt-1 ${inputClass}`} />
                </label>

                {category ? (
                    <p className="text-xs text-muted-foreground">
                        {t('verein.categories.field.key')}: <code className="rounded bg-muted px-1 py-0.5 text-foreground">{category.key}</code> · {t('verein.categories.key.immutable')}
                    </p>
                ) : (
                    <label className="block text-xs font-semibold text-muted-foreground">
                        {t('verein.categories.field.key')}
                        <input
                            value={form.key}
                            maxLength={50}
                            onChange={(e) => setForm({ ...form, key: e.target.value })}
                            placeholder={t('verein.categories.key.placeholder')}
                            className={`mt-1 ${inputClass}`}
                        />
                        <span className="mt-1 block text-xs font-normal text-muted-foreground">{t('verein.categories.key.hint')}</span>
                    </label>
                )}

                <label className="flex items-start gap-2 text-sm text-foreground">
                    <input
                        type="checkbox"
                        checked={form.votingRight}
                        onChange={(e) => setForm({ ...form, votingRight: e.target.checked })}
                        className="mt-0.5 h-4 w-4 accent-primary"
                    />
                    <span>
                        {t('verein.categories.field.voting')}
                        <span className="block text-xs text-muted-foreground">{t('verein.categories.voting.hint')}</span>
                    </span>
                </label>

                <label className="flex items-start gap-2 text-sm text-foreground">
                    <input
                        type="checkbox"
                        checked={form.applicantSelectable}
                        onChange={(e) => setForm({ ...form, applicantSelectable: e.target.checked })}
                        className="mt-0.5 h-4 w-4 accent-primary"
                    />
                    <span>
                        {t('forms.category.applicantSelectable')}
                        <span className="block text-xs text-muted-foreground">{t('forms.category.applicantSelectable.hint')}</span>
                    </span>
                </label>

                <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs font-semibold text-muted-foreground">
                        {t('verein.categories.field.minAge')}
                        <input
                            type="number"
                            min={0}
                            max={120}
                            value={form.minAge}
                            onChange={(e) => setForm({ ...form, minAge: e.target.value })}
                            className={`mt-1 ${inputClass}`}
                        />
                    </label>
                    <label className="block text-xs font-semibold text-muted-foreground">
                        {t('verein.categories.field.maxAge')}
                        <input
                            type="number"
                            min={0}
                            max={120}
                            value={form.maxAge}
                            onChange={(e) => setForm({ ...form, maxAge: e.target.value })}
                            className={`mt-1 ${inputClass}`}
                        />
                    </label>
                </div>

                <label className="block text-xs font-semibold text-muted-foreground">
                    {t('verein.categories.field.auto')}
                    <select
                        value={hasMax ? form.autoTransitionToKey : ''}
                        disabled={!hasMax}
                        onChange={(e) => setForm({ ...form, autoTransitionToKey: e.target.value })}
                        className={`mt-1 ${inputClass} disabled:opacity-60`}
                    >
                        <option value="">{t('verein.categories.auto.none')}</option>
                        {targets.map((c) => (
                            <option key={c.id} value={c.key}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">{hasMax ? t('verein.categories.auto.hint') : t('verein.categories.auto.needsMax')}</span>
                </label>

                {error && (
                    <p role="alert" className="text-sm text-destructive">
                        {error}
                    </p>
                )}
            </div>
        </Modal>
    );
}

function ArchiveModal({
    category,
    all,
    clubId,
    onClose,
    onDone,
}: {
    category: MemberCategory;
    all: MemberCategory[];
    clubId: string;
    onClose: () => void;
    onDone: (moved: number) => void;
}) {
    const { t } = useLanguage();
    const [memberCount, setMemberCount] = useState(category.memberCount ?? 0);
    const [moveTo, setMoveTo] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const targets = all.filter((c) => !c.archived && c.id !== category.id);

    async function archive() {
        if (memberCount > 0 && !moveTo) {
            setError(t('verein.categories.archive.err.moveTo'));
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const qs = new URLSearchParams({ clubId });
            if (memberCount > 0) qs.set('moveTo', moveTo);
            const res = await apiFetch<{ data?: { movedMembers?: number } }>(`/club-members/categories/${category.id}?${qs.toString()}`, { method: 'DELETE' });
            onDone(res?.data?.movedMembers ?? 0);
        } catch (err) {
            // Members moved into the category in the meantime: ask for a target instead of failing.
            const count = memberCountFromError(err);
            if (count !== null && count > 0) {
                setMemberCount(count);
                setError(t('verein.categories.archive.err.moveTo'));
            } else {
                setError(t(memberErrorKey(err)));
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal
            open
            onClose={busy ? () => {} : onClose}
            title={t('verein.categories.archive.title', { name: category.name })}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={busy} className={secondaryButtonClass}>
                        {t('verein.roles.add.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={() => void archive()}
                        disabled={busy}
                        className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
                    >
                        {t('verein.categories.archive.confirm')}
                    </button>
                </div>
            }
        >
            <p className="text-sm text-foreground">{t('verein.categories.archive.body')}</p>
            {memberCount > 0 && (
                <label className="mt-4 block text-xs font-semibold text-muted-foreground">
                    {t('verein.categories.archive.moveTo', { count: memberCount })}
                    <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className={`mt-1 ${inputClass}`}>
                        <option value="">{t('verein.categories.archive.choose')}</option>
                        {targets.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </label>
            )}
            {error && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                    {error}
                </p>
            )}
        </Modal>
    );
}

/**
 * "Vereinseinstellungen -> Mitgliedskategorien" (Wave 7 W5, categories part): list, create, edit and archive the
 * club's member categories. Everything here needs `members:write`; the parent only shows the tab for writers.
 * The key is the stable identifier and cannot be changed after creation.
 */
export default function CategoriesPanel({ clubId, onChanged }: { clubId: string; onChanged: () => void }) {
    const { t } = useLanguage();
    const [categories, setCategories] = useState<MemberCategory[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const [editing, setEditing] = useState<MemberCategory | null>(null);
    const [creating, setCreating] = useState(false);
    const [archiving, setArchiving] = useState<MemberCategory | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await apiFetch<{ data: MemberCategory[] }>(`/club-members/categories?clubId=${clubId}&includeArchived=true`);
            setCategories(res.data);
            setLoadError(null);
        } catch (err) {
            setLoadError(t(memberErrorKey(err)));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    function changed() {
        void load();
        onChanged();
    }

    const nameByKey = new Map((categories ?? []).map((c) => [c.key, c.name]));
    const visible = (categories ?? []).filter((c) => showArchived || !c.archived);

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-sm font-bold text-foreground">{t('verein.categories.title')}</h2>
                    <p className="mt-1 max-w-xl text-xs text-muted-foreground">{t('verein.categories.hint')}</p>
                </div>
                <button type="button" onClick={() => setCreating(true)} className={`${primaryButtonClass} inline-flex items-center gap-1.5`}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {t('verein.categories.create')}
                </button>
            </div>

            {notice && (
                <p role="status" className="mb-3 rounded-lg bg-success/10 px-3 py-2 text-sm text-foreground">
                    {notice}
                </p>
            )}

            {loadError ? (
                <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
                    <p className="text-destructive">{loadError}</p>
                    <button type="button" onClick={() => void load()} className={`${secondaryButtonClass} mt-3`}>
                        {t('verein.create.retry')}
                    </button>
                </div>
            ) : categories === null ? (
                <p className="text-sm text-muted-foreground" role="status">
                    {t('verein.members.loading')}
                </p>
            ) : (
                <>
                    {categories.some((c) => c.archived) && (
                        <label className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="h-4 w-4 accent-primary" />
                            {t('verein.categories.showArchived')}
                        </label>
                    )}
                    {visible.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{t('verein.categories.empty')}</p>
                    ) : (
                        <ul className="space-y-2">
                            {visible.map((c) => (
                                <li key={c.id} className={`rounded-xl border border-border bg-card p-3 ${c.archived ? 'opacity-60' : ''}`}>
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-foreground">
                                                {c.name}
                                                {c.archived && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">{t('verein.categories.archived')}</span>}
                                                {!c.archived && c.applicantSelectable && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-normal text-primary">{t('forms.category.applicantSelectable.chip')}</span>}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                <code>{c.key}</code> · {c.votingRight ? t('verein.categories.voting.yes') : t('verein.categories.voting.no')} · {ageRangeText(c, t)}
                                                {c.autoTransitionToKey && ` · ${t('verein.categories.auto.to', { name: nameByKey.get(c.autoTransitionToKey) ?? c.autoTransitionToKey })}`}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">{t('verein.categories.memberCount', { count: c.memberCount ?? 0 })}</p>
                                        </div>
                                        {!c.archived && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditing(c)}
                                                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                    aria-label={t('verein.categories.edit', { name: c.name })}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                {c.key === DEFAULT_CATEGORY_KEY ? (
                                                    <span className="px-1 text-xs text-muted-foreground" title={t('verein.categories.archive.defaultHint')}>
                                                        {t('verein.categories.default')}
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setArchiving(c)}
                                                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                                                        aria-label={t('verein.categories.archive.action', { name: c.name })}
                                                    >
                                                        <Archive className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}

            {(creating || editing) && categories && (
                <CategoryFormModal
                    key={editing?.id ?? 'new'}
                    category={editing}
                    all={categories}
                    clubId={clubId}
                    onClose={() => {
                        setCreating(false);
                        setEditing(null);
                    }}
                    onSaved={changed}
                />
            )}
            {archiving && categories && (
                <ArchiveModal
                    category={archiving}
                    all={categories}
                    clubId={clubId}
                    onClose={() => setArchiving(null)}
                    onDone={(moved) => {
                        setNotice(moved > 0 ? t('verein.categories.archive.done.moved', { name: archiving.name, count: moved }) : t('verein.categories.archive.done', { name: archiving.name }));
                        setArchiving(null);
                        changed();
                    }}
                />
            )}
        </div>
    );
}
