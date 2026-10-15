'use client';

import { useCallback, useEffect, useState } from 'react';
import { Archive, ArchiveRestore, ListPlus, Lock, Pencil, Plus, Trash2 } from 'lucide-react';

import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import CustomFieldFormModal from '@/components/verein/CustomFieldFormModal';
import { Modal } from '@/components/Modal';
import { Chip, EmptyState, SectionCard } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import { type CustomFieldDefinition, customFieldErrorKey, deleteOutcomeOf, MAX_CUSTOM_FIELDS } from '@/lib/customFields';

/**
 * "Zusatzfelder" in the club area (Wave 8 W5, `forms:write`): the club's own member fields ("Trikotgröße", "Instrument",
 * "Allergien"): type, options, who may see them, who may change them, protected (`sensitive`). A field with values is
 * archived instead of deleted (the outcome is stated plainly); archived fields can be restored. The matching export column
 * is shown per field (`cf:<key>`).
 */
export default function CustomFieldsPanel({ clubId, permissions }: { clubId: string; permissions: string[] }) {
    const { t } = useLanguage();
    const canWrite = permissions.includes('forms:write');
    const canReadSensitive = permissions.includes('members:read_sensitive');
    const [defs, setDefs] = useState<CustomFieldDefinition[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [editing, setEditing] = useState<CustomFieldDefinition | null>(null);
    const [creating, setCreating] = useState(false);
    const [removing, setRemoving] = useState<CustomFieldDefinition | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);

    const load = useCallback(() => {
        setFailed(false);
        apiFetch<{ data: CustomFieldDefinition[] }>(`/member-fields?clubId=${clubId}&includeArchived=true`)
            .then((res) => setDefs(res.data))
            .catch(() => setFailed(true));
    }, [clubId]);

    useEffect(() => {
        if (!canWrite) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [canWrite, load]);

    if (!canWrite) {
        return (
            <SectionCard title={t('forms.cf.title')}>
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {t('forms.cf.noAccess')}
                </p>
            </SectionCard>
        );
    }

    async function unarchive(def: CustomFieldDefinition) {
        setBusyId(def.id);
        setFlash(null);
        try {
            await apiFetch(`/member-fields/${def.id}/unarchive?clubId=${clubId}`, { method: 'POST', body: {} });
            setFlash({ ok: true, text: t('forms.cf.unarchived', { label: def.label }) });
            load();
        } catch (err) {
            setFlash({ ok: false, text: t(customFieldErrorKey(err)) });
        } finally {
            setBusyId(null);
        }
    }

    const visible = (defs ?? []).filter((d) => showArchived || !d.archived);
    const live = (defs ?? []).filter((d) => !d.archived).length;

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-sm font-bold text-foreground">{t('forms.cf.title')}</h2>
                    <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{t('forms.cf.hint')}</p>
                </div>
                <button type="button" disabled={(defs?.length ?? 0) >= MAX_CUSTOM_FIELDS} onClick={() => setCreating(true)} className={`${primaryButtonClass} inline-flex items-center gap-1.5`}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {t('forms.cf.create')}
                </button>
            </div>

            {flash && (
                <p role={flash.ok ? 'status' : 'alert'} className={`mb-3 rounded-lg px-3 py-2 text-sm ${flash.ok ? 'bg-success/10 text-foreground' : 'border border-destructive/40 bg-destructive/5 text-destructive'}`}>
                    {flash.text}
                </p>
            )}

            {failed ? (
                <LoadError onRetry={load} />
            ) : !defs ? (
                <LoadingText />
            ) : (
                <>
                    {defs.some((d) => d.archived) && (
                        <label className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="h-4 w-4 accent-primary" />
                            {t('forms.cf.showArchived')}
                        </label>
                    )}
                    {visible.length === 0 ? (
                        <EmptyState icon={<ListPlus className="h-6 w-6" aria-hidden="true" />} text={live === 0 ? t('forms.cf.empty') : t('forms.cf.emptyArchived')} />
                    ) : (
                        <ul className="space-y-2">
                            {visible.map((d) => (
                                <li key={d.id} className={`rounded-xl border border-border bg-card p-3 ${d.archived ? 'opacity-70' : ''}`}>
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="break-words text-sm font-semibold text-foreground">{d.label}</p>
                                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                <Chip tone="muted">{t(`forms.editor.type.${d.type}`)}</Chip>
                                                <Chip tone="muted">{t('forms.cf.list.visibleTo', { who: t(`forms.cf.visibleTo.${d.visibleTo}`) })}</Chip>
                                                <Chip tone="muted">{t('forms.cf.list.editableBy', { who: t(`forms.cf.editableBy.${d.editableBy}`) })}</Chip>
                                                {d.sensitive && (
                                                    <Chip tone="warning">
                                                        <Lock className="mr-1 h-3 w-3" aria-hidden="true" />
                                                        {t('forms.cf.list.sensitive')}
                                                    </Chip>
                                                )}
                                                {d.archived && <Chip tone="muted">{t('forms.cf.list.archived')}</Chip>}
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                <code>{d.key}</code> · {t('forms.cf.list.values', { count: d.valueCount ?? 0 })} · {t('forms.cf.list.export')} <code>cf:{d.key}</code>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {d.archived ? (
                                                <button type="button" disabled={busyId === d.id} onClick={() => void unarchive(d)} className={`${secondaryButtonClass} inline-flex items-center gap-1.5`}>
                                                    <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
                                                    {t('forms.cf.unarchive')}
                                                </button>
                                            ) : (
                                                <>
                                                    <button type="button" onClick={() => setEditing(d)} aria-label={t('forms.cf.editNamed', { label: d.label })} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                                                        <Pencil className="h-4 w-4" aria-hidden="true" />
                                                    </button>
                                                    <button type="button" onClick={() => setRemoving(d)} aria-label={t('forms.cf.removeNamed', { label: d.label })} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
                                                        {(d.valueCount ?? 0) > 0 ? <Archive className="h-4 w-4" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}

            {(creating || editing) && defs && (
                <CustomFieldFormModal
                    key={editing?.id ?? 'new'}
                    clubId={clubId}
                    definition={editing}
                    all={defs}
                    canReadSensitive={canReadSensitive}
                    onClose={() => {
                        setCreating(false);
                        setEditing(null);
                    }}
                    onSaved={() => {
                        setFlash({ ok: true, text: t('forms.cf.saved') });
                        load();
                    }}
                />
            )}
            {removing && (
                <RemoveDialog
                    clubId={clubId}
                    definition={removing}
                    onClose={() => setRemoving(null)}
                    onDone={(outcome) => {
                        setFlash({ ok: true, text: t(outcome === 'archived' ? 'forms.cf.outcome.archived' : 'forms.cf.outcome.deleted', { label: removing.label }) });
                        setRemoving(null);
                        load();
                    }}
                />
            )}
        </div>
    );
}

function RemoveDialog({ clubId, definition, onClose, onDone }: { clubId: string; definition: CustomFieldDefinition; onClose: () => void; onDone: (outcome: 'archived' | 'deleted') => void }) {
    const { t } = useLanguage();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasValues = (definition.valueCount ?? 0) > 0;

    async function remove() {
        setBusy(true);
        setError(null);
        try {
            const res = await apiFetch<unknown>(`/member-fields/${definition.id}?clubId=${clubId}`, { method: 'DELETE' });
            onDone(deleteOutcomeOf(res));
        } catch (err) {
            setError(t(customFieldErrorKey(err)));
            setBusy(false);
        }
    }

    return (
        <Modal
            open
            onClose={busy ? () => {} : onClose}
            title={t('forms.cf.remove.title', { label: definition.label })}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={busy} className={secondaryButtonClass}>
                        {t('forms.editor.publish.cancel')}
                    </button>
                    <button type="button" onClick={() => void remove()} disabled={busy} className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50">
                        {hasValues ? t('forms.cf.remove.confirmArchive') : t('forms.cf.remove.confirmDelete')}
                    </button>
                </div>
            }
        >
            <p className="text-sm text-foreground">{hasValues ? t('forms.cf.remove.bodyValues', { count: definition.valueCount ?? 0 }) : t('forms.cf.remove.bodyEmpty')}</p>
            <p className="mt-2 text-xs text-muted-foreground">{t('forms.cf.remove.forms')}</p>
            {error && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                    {error}
                </p>
            )}
        </Modal>
    );
}
