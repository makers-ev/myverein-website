'use client';

import { useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api-client';
import { type MemberCategory, type MemberListResponse } from '@/lib/clubMembers';
import { AUDIENCE_ROLE_TYPES, type Audience, type CommunicationGate } from '@/lib/communication';
import { useLanguage } from '@/contexts/LanguageContext';
import { inputClass } from '@/lib/clubMembers';

export interface PickerDepartment {
    id: string;
    name: string;
}

export interface PickedMember {
    id: string;
    name: string;
}

function toggle(list: readonly string[] | undefined, value: string): string[] {
    const current = list ?? [];
    return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
}

function CheckChip({ checked, onChange, children, disabled }: { checked: boolean; onChange: () => void; children: React.ReactNode; disabled?: boolean }) {
    return (
        <label
            className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors ${
                checked ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-foreground hover:bg-muted'
            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        >
            <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} className="sr-only" />
            {children}
        </label>
    );
}

function Group({ legend, children }: { legend: string; children: React.ReactNode }) {
    return (
        <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-muted-foreground">{legend}</legend>
            <div className="flex flex-wrap gap-2">{children}</div>
        </fieldset>
    );
}

/** Search and pick individual members (club-member ids). Only offered with club-wide authoring. */
function MemberSearch({ clubId, picked, onChange }: { clubId: string; picked: PickedMember[]; onChange: (next: PickedMember[]) => void }) {
    const { t } = useLanguage();
    const [input, setInput] = useState('');
    const [q, setQ] = useState('');
    const [results, setResults] = useState<{ q: string; items: PickedMember[] } | { q: string; error: true } | null>(null);

    useEffect(() => {
        const handle = setTimeout(() => setQ(input.trim()), 300);
        return () => clearTimeout(handle);
    }, [input]);

    useEffect(() => {
        if (q.length < 2) return;
        let cancelled = false;
        apiFetch<MemberListResponse>(`/club-members?clubId=${clubId}&q=${encodeURIComponent(q)}&pageSize=8&sort=name`)
            .then((res) => {
                if (!cancelled) setResults({ q, items: res.data.map((m) => ({ id: m.id, name: m.name ?? '—' })) });
            })
            .catch(() => {
                if (!cancelled) setResults({ q, error: true });
            });
        return () => {
            cancelled = true;
        };
    }, [clubId, q]);

    const current = results && results.q === q && q.length >= 2 ? results : null;
    const loading = q.length >= 2 && !current;

    return (
        <div className="space-y-2">
            {picked.length > 0 && (
                <ul className="flex flex-wrap gap-2" aria-label={t('mitteilungen.audience.members.picked')}>
                    {picked.map((m) => (
                        <li key={m.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                            {m.name}
                            <button type="button" onClick={() => onChange(picked.filter((p) => p.id !== m.id))} className="rounded-full px-1 hover:text-destructive" aria-label={t('mitteilungen.audience.members.remove', { name: m.name })}>
                                ×
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <input type="search" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('mitteilungen.audience.members.search')} className={inputClass} aria-label={t('mitteilungen.audience.members.search')} />
            {loading && (
                <p role="status" className="text-xs text-muted-foreground">
                    {t('common.loading')}
                </p>
            )}
            {current && 'error' in current && (
                <p role="alert" className="text-xs text-destructive">
                    {t('common.error')}
                </p>
            )}
            {current && 'items' in current && (current.items.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('mitteilungen.audience.members.none')}</p>
            ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                    {current.items.map((m) => {
                        const isPicked = picked.some((p) => p.id === m.id);
                        return (
                            <li key={m.id}>
                                <button
                                    type="button"
                                    disabled={isPicked}
                                    onClick={() => onChange([...picked, m])}
                                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-foreground hover:bg-muted disabled:opacity-50"
                                >
                                    <span>{m.name}</span>
                                    {isPicked && <span className="text-xs text-muted-foreground">{t('mitteilungen.audience.members.added')}</span>}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ))}
        </div>
    );
}

/**
 * Audience picker of the compose form (W1). Club-wide authors (`announcements:write`) get club, departments, roles,
 * categories and individuals; the department scope (`announcements:write_department`) only gets its own departments
 * (passed in already filtered). "Include guardians" applies to every selection.
 */
export default function AudiencePicker({
    clubId,
    gate,
    departments,
    value,
    pickedMembers,
    onChange,
    onPickedMembersChange,
}: {
    clubId: string;
    gate: CommunicationGate;
    departments: PickerDepartment[];
    value: Audience;
    pickedMembers: PickedMember[];
    onChange: (next: Audience) => void;
    onPickedMembersChange: (next: PickedMember[]) => void;
}) {
    const { t } = useLanguage();
    const [categories, setCategories] = useState<MemberCategory[] | null>(null);
    const [categoriesError, setCategoriesError] = useState(false);

    useEffect(() => {
        if (!gate.writeAll) return;
        let cancelled = false;
        apiFetch<{ data: MemberCategory[] }>(`/club-members/categories?clubId=${clubId}`)
            .then((res) => {
                if (!cancelled) setCategories(res.data.filter((c) => !c.archived));
            })
            .catch(() => {
                if (!cancelled) setCategoriesError(true);
            });
        return () => {
            cancelled = true;
        };
    }, [clubId, gate.writeAll]);

    const all = !!value.all;
    const set = (patch: Partial<Audience>) => onChange({ ...value, ...patch });

    return (
        <div className="space-y-4">
            {gate.writeAll && (
                <Group legend={t('mitteilungen.audience.club')}>
                    <CheckChip checked={all} onChange={() => set({ all: !all })}>
                        {t('mitteilungen.audience.all')}
                    </CheckChip>
                </Group>
            )}

            {!all && (
                <>
                    <Group legend={t('mitteilungen.audience.departments')}>
                        {departments.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t(gate.writeAll ? 'mitteilungen.audience.departments.empty' : 'mitteilungen.audience.departments.none-own')}</p>
                        ) : (
                            departments.map((d) => (
                                <CheckChip key={d.id} checked={!!value.departmentIds?.includes(d.id)} onChange={() => set({ departmentIds: toggle(value.departmentIds, d.id) })}>
                                    {d.name}
                                </CheckChip>
                            ))
                        )}
                    </Group>

                    {gate.writeAll && (
                        <>
                            <Group legend={t('mitteilungen.audience.roles')}>
                                {AUDIENCE_ROLE_TYPES.map((r) => (
                                    <CheckChip key={r} checked={!!value.roleTypes?.includes(r)} onChange={() => set({ roleTypes: toggle(value.roleTypes, r) })}>
                                        {t(`verein.role.${r}`)}
                                    </CheckChip>
                                ))}
                            </Group>

                            <Group legend={t('mitteilungen.audience.categories')}>
                                {categoriesError ? (
                                    <p role="alert" className="text-sm text-destructive">
                                        {t('common.error')}
                                    </p>
                                ) : categories === null ? (
                                    <p role="status" className="text-sm text-muted-foreground">
                                        {t('common.loading')}
                                    </p>
                                ) : categories.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">{t('mitteilungen.audience.categories.empty')}</p>
                                ) : (
                                    categories.map((c) => (
                                        <CheckChip key={c.id} checked={!!value.categoryKeys?.includes(c.key)} onChange={() => set({ categoryKeys: toggle(value.categoryKeys, c.key) })}>
                                            {c.name}
                                        </CheckChip>
                                    ))
                                )}
                            </Group>

                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground">{t('mitteilungen.audience.members')}</p>
                                <MemberSearch
                                    clubId={clubId}
                                    picked={pickedMembers}
                                    onChange={(next) => {
                                        onPickedMembersChange(next);
                                        set({ memberIds: next.map((m) => m.id) });
                                    }}
                                />
                            </div>
                        </>
                    )}
                </>
            )}

            <label className="flex items-start gap-2 text-sm text-foreground">
                <input type="checkbox" checked={value.includeGuardians ?? true} onChange={(e) => set({ includeGuardians: e.target.checked })} className="mt-0.5 h-4 w-4 accent-primary" />
                <span>
                    {t('mitteilungen.audience.guardians')}
                    <span className="block text-xs text-muted-foreground">{t('mitteilungen.audience.guardians.hint')}</span>
                </span>
            </label>
        </div>
    );
}
