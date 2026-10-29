'use client';

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';

import { Modal } from '@/components/Modal';
import LoadingText from '@/components/LoadingText';
import LoadError from '@/components/LoadError';
import { MemberPicker } from '@/components/assembly/shared';
import { inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type DocLevel, type FolderPermissionEntry, clubQuery, documentErrorKey } from '@/lib/documents';

const ROLES = ['mitglied', 'vorsitz', 'stellv_vorsitz', 'schriftfuehrer', 'kassenwart', 'beisitzer', 'abteilungsleitung', 'trainer'] as const;
const LEVELS: DocLevel[] = ['lesen', 'schreiben', 'verwalten'];

const entryKey = (e: FolderPermissionEntry) => `${e.subjectType}:${e.roleType ?? e.departmentId ?? e.clubMemberId}`;

/**
 * Rights of one folder per role, department or person (`documents:manage`). The set is replaced as a whole; an empty set means
 * the folder inherits from its parent. Without any entry (and no inherited one) nobody but the board has access.
 */
export default function FolderPermissionsDialog({ clubId, folderId, folderName, departments, onClose }: { clubId: string; folderId: string; folderName: string; departments: { id: string; name: string }[]; onClose: () => void }) {
    const { t } = useLanguage();
    const [entries, setEntries] = useState<FolderPermissionEntry[] | null>(null);
    const [inheritsFrom, setInheritsFrom] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [subject, setSubject] = useState<'rolle' | 'abteilung' | 'mitglied'>('rolle');
    const [roleType, setRoleType] = useState<string>('mitglied');
    const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? '');
    const [level, setLevel] = useState<DocLevel>('lesen');
    const [load, setLoad] = useState(0);

    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data: FolderPermissionEntry[]; inheritsFrom: string | null }>(`/documents/folders/${encodeURIComponent(folderId)}/permissions?${clubQuery(clubId)}`)
            .then((res) => {
                if (cancelled) return;
                setEntries(res.data);
                setInheritsFrom(res.inheritsFrom);
                setFailed(false);
            })
            .catch(() => !cancelled && setFailed(true));
        return () => {
            cancelled = true;
        };
    }, [clubId, folderId, load]);

    function add(entry: FolderPermissionEntry) {
        setSaved(false);
        setEntries((list) => [...(list ?? []).filter((e) => entryKey(e) !== entryKey(entry)), entry]);
    }

    async function save() {
        if (!entries) return;
        setSaving(true);
        setError(null);
        try {
            const body = {
                entries: entries.map((e) => ({
                    subjectType: e.subjectType,
                    level: e.level,
                    ...(e.subjectType === 'rolle' ? { roleType: e.roleType } : e.subjectType === 'abteilung' ? { departmentId: e.departmentId } : { clubMemberId: e.clubMemberId }),
                })),
            };
            await apiFetch(`/documents/folders/${encodeURIComponent(folderId)}/permissions?${clubQuery(clubId)}`, { method: 'PUT', body });
            setSaved(true);
            setLoad((n) => n + 1);
        } catch (err) {
            setError(t(documentErrorKey(err)));
        } finally {
            setSaving(false);
        }
    }

    const label = (e: FolderPermissionEntry) => (e.subjectType === 'rolle' ? t(`verein.role.${e.roleType}`) : (e.name ?? '—'));

    return (
        <Modal open onClose={onClose} title={t('docs.perm.title', { name: folderName })}>
            {failed ? (
                <LoadError onRetry={() => setLoad((n) => n + 1)} />
            ) : !entries ? (
                <LoadingText />
            ) : (
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">{t('docs.perm.intro')}</p>
                    {entries.length === 0 && <p className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">{t(inheritsFrom ? 'docs.perm.inherits' : 'docs.perm.none')}</p>}
                    <ul className="space-y-2">
                        {entries.map((e) => (
                            <li key={entryKey(e)} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                                <span className="min-w-0 truncate text-foreground">
                                    <span className="text-xs text-muted-foreground">{t(`docs.perm.subject.${e.subjectType}`)}: </span>
                                    {label(e)}
                                </span>
                                <span className="flex shrink-0 items-center gap-2">
                                    <select
                                        aria-label={t('docs.perm.level')}
                                        value={e.level}
                                        onChange={(ev) => add({ ...e, level: ev.target.value as DocLevel })}
                                        className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
                                    >
                                        {LEVELS.map((l) => (
                                            <option key={l} value={l}>
                                                {t(`docs.level.${l}`)}
                                            </option>
                                        ))}
                                    </select>
                                    <button type="button" aria-label={t('docs.perm.remove')} onClick={() => setEntries((list) => (list ?? []).filter((x) => entryKey(x) !== entryKey(e)))} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                </span>
                            </li>
                        ))}
                    </ul>

                    <fieldset className="space-y-3 rounded-lg border border-border p-3">
                        <legend className="px-1 text-xs font-medium text-muted-foreground">{t('docs.perm.add')}</legend>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <label className="block">
                                <span className="mb-1 block text-xs text-muted-foreground">{t('docs.perm.subject')}</span>
                                <select value={subject} onChange={(e) => setSubject(e.target.value as typeof subject)} className={inputClass}>
                                    {(['rolle', 'abteilung', 'mitglied'] as const).map((s) => (
                                        <option key={s} value={s}>
                                            {t(`docs.perm.subject.${s}`)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-xs text-muted-foreground">{t('docs.perm.level')}</span>
                                <select value={level} onChange={(e) => setLevel(e.target.value as DocLevel)} className={inputClass}>
                                    {LEVELS.map((l) => (
                                        <option key={l} value={l}>
                                            {t(`docs.level.${l}`)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            {subject === 'rolle' && (
                                <label className="block">
                                    <span className="mb-1 block text-xs text-muted-foreground">{t('docs.perm.subject.rolle')}</span>
                                    <select value={roleType} onChange={(e) => setRoleType(e.target.value)} className={inputClass}>
                                        {ROLES.map((r) => (
                                            <option key={r} value={r}>
                                                {t(`verein.role.${r}`)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}
                            {subject === 'abteilung' && (
                                <label className="block">
                                    <span className="mb-1 block text-xs text-muted-foreground">{t('docs.perm.subject.abteilung')}</span>
                                    <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputClass}>
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}
                        </div>
                        {subject === 'mitglied' ? (
                            <MemberPicker clubId={clubId} label={t('docs.perm.subject.mitglied')} onPick={(m) => add({ subjectType: 'mitglied', clubMemberId: m.id, name: m.name, level })} excludeIds={entries.map((e) => e.clubMemberId ?? '')} />
                        ) : (
                            <button
                                type="button"
                                className={secondaryButtonClass}
                                disabled={subject === 'abteilung' && !departmentId}
                                onClick={() => add(subject === 'rolle' ? { subjectType: 'rolle', roleType, level } : { subjectType: 'abteilung', departmentId, name: departments.find((d) => d.id === departmentId)?.name ?? null, level })}
                            >
                                {t('docs.perm.addButton')}
                            </button>
                        )}
                    </fieldset>

                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}
                    {saved && (
                        <p role="status" className="text-sm text-success">
                            {t('docs.perm.saved')}
                        </p>
                    )}
                    <div className="flex justify-end gap-2">
                        <button type="button" className={secondaryButtonClass} onClick={onClose}>
                            {t('docs.perm.close')}
                        </button>
                        <button type="button" className={primaryButtonClass} disabled={saving} onClick={() => void save()}>
                            {t('docs.common.save')}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
