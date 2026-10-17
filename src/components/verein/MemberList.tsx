'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Eye, Pencil, Search, Upload, UserPlus, X } from 'lucide-react';

import MemberAvatar from '@/components/verein/MemberAvatar';
import MemberExportDialog from '@/components/verein/MemberExportDialog';
import MemberDetailDialog from '@/components/verein/MemberDetailDialog';
import MemberFormModal from '@/components/verein/MemberFormModal';
import MemberImportDialog from '@/components/verein/MemberImportDialog';
import MemberRoleCell from '@/components/verein/MemberRoleCell';
import TransitionSuggestions from '@/components/verein/TransitionSuggestions';
import { useThrottledCallback } from '@/lib/useThrottledCallback';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiError, apiFetch } from '@/lib/api-client';
import { type CustomFieldDefinition, hasVisibleFields } from '@/lib/customFields';
import {
    categoryLabel,
    currentDepartments,
    formatDate,
    hasPendingExit,
    inputClass,
    MEMBER_STATUSES,
    memberErrorKey,
    primaryButtonClass,
    secondaryButtonClass,
    statusChipClass,
    type ClubMember,
    type MemberCategory,
    type MemberListResponse,
} from '@/lib/clubMembers';

type SortKey = 'name' | 'joinedAt' | 'memberNumber';

interface Filters {
    status: string;
    category: string;
    departmentId: string;
    hasAccount: '' | 'true' | 'false';
    ageMin: string;
    ageMax: string;
}

const EMPTY_FILTERS: Filters = { status: '', category: '', departmentId: '', hasAccount: '', ageMin: '', ageMax: '' };
const PAGE_SIZES = [25, 50, 100];

/** Result of one list request; `key` ties it to the query it answered so stale answers are never shown as current. */
type Outcome = { key: string; res: MemberListResponse; error?: undefined } | { key: string; error: unknown; res?: undefined };

function pageWindow(page: number, pages: number): number[] {
    const start = Math.max(1, Math.min(page - 2, pages - 4));
    const end = Math.min(pages, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Member list of the club (Wave 7 W1): server-side search (debounced), filters, sorting and paging over
 * GET /club-members, with age-transition proposals and the create/edit form for `members:write`.
 *
 * The list is paged by the backend (default 50): the whole component works from `total`, never assumes it has every
 * member. Sensitive columns/filters (member number, age) appear only for `members:read_sensitive`; the backend would
 * answer 403 for them otherwise.
 */
export default function MemberList({
    clubId,
    permissions,
    departments,
    reloadToken,
}: {
    clubId: string;
    permissions: string[];
    departments: { id: string; name: string }[];
    /** Bump from the parent to reload (e.g. after an application was decided). */
    reloadToken: number;
}) {
    const { t, language } = useLanguage();
    const canWrite = permissions.includes('members:write');
    const canRoles = permissions.includes('roles:write');
    const canSensitive = permissions.includes('members:read_sensitive');
    // Plain members only get live members (probe/aktiv/ruhend) from the backend, so other statuses are not offered.
    const statusOptions = canWrite || canSensitive ? MEMBER_STATUSES : MEMBER_STATUSES.filter((s) => s === 'probe' || s === 'aktiv' || s === 'ruhend');

    const [searchInput, setSearchInput] = useState('');
    const [q, setQ] = useState('');
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [sort, setSort] = useState<SortKey>('name');
    const [order, setOrder] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [localReload, setLocalReload] = useState(0);
    const [ageInput, setAgeInput] = useState({ min: '', max: '' });

    const [outcome, setOutcome] = useState<Outcome | null>(null);
    const [categories, setCategories] = useState<MemberCategory[]>([]);
    const [editing, setEditing] = useState<ClubMember | null>(null);
    const [creating, setCreating] = useState(false);
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    // Read-only details (custom fields) for people without members:write; offered only if the club has fields they may see.
    const [detail, setDetail] = useState<ClubMember | null>(null);
    const [hasCustomFields, setHasCustomFields] = useState(false);

    const reload = () => setLocalReload((n) => n + 1);

    useEffect(() => {
        if (canWrite) return;
        let cancelled = false;
        apiFetch<{ data: CustomFieldDefinition[] }>(`/member-fields?clubId=${clubId}`)
            .then((res) => {
                if (!cancelled) setHasCustomFields(hasVisibleFields(res.data));
            })
            .catch(() => {
                if (!cancelled) setHasCustomFields(false);
            });
        return () => {
            cancelled = true;
        };
    }, [canWrite, clubId]);

    // Signed photo URLs expire: a failed image load refetches the list once (all avatars fail together, so debounce).
    const onPhotoExpired = useThrottledCallback(() => setLocalReload((n) => n + 1));

    // Debounce the search box; a new search always starts on page 1.
    useEffect(() => {
        const handle = setTimeout(() => {
            setQ(searchInput.trim());
            setPage(1);
        }, 350);
        return () => clearTimeout(handle);
    }, [searchInput]);

    // Debounce the age range; an inverted range (min > max) is reported instead of sent (the backend would answer 422).
    const ageInvalid = ageInput.min !== '' && ageInput.max !== '' && Number(ageInput.min) > Number(ageInput.max);
    useEffect(() => {
        if (ageInvalid) return;
        const handle = setTimeout(() => {
            setFilters((f) => (f.ageMin === ageInput.min && f.ageMax === ageInput.max ? f : { ...f, ageMin: ageInput.min, ageMax: ageInput.max }));
            setPage(1);
        }, 400);
        return () => clearTimeout(handle);
    }, [ageInput, ageInvalid]);

    // Categories (also used for the filter and the form); every member may read them.
    useEffect(() => {
        let cancelled = false;
        apiFetch<{ data: MemberCategory[] }>(`/club-members/categories?clubId=${clubId}`)
            .then((res) => {
                if (!cancelled) setCategories(res.data);
            })
            .catch(() => {
                if (!cancelled) setCategories([]);
            });
        return () => {
            cancelled = true;
        };
    }, [clubId, reloadToken, localReload]);

    const query = useMemo(() => {
        const p = new URLSearchParams({ clubId, page: String(page), pageSize: String(pageSize), sort, order });
        if (q) p.set('q', q);
        if (filters.status) p.set('status', filters.status);
        if (filters.category) p.set('category', filters.category);
        if (filters.departmentId) p.set('departmentId', filters.departmentId);
        if (filters.hasAccount) p.set('hasAccount', filters.hasAccount);
        if (canSensitive && filters.ageMin !== '') p.set('ageMin', filters.ageMin);
        if (canSensitive && filters.ageMax !== '') p.set('ageMax', filters.ageMax);
        return p.toString();
    }, [clubId, page, pageSize, sort, order, q, filters, canSensitive]);

    const requestKey = `${query}#${reloadToken}#${localReload}`;

    useEffect(() => {
        let cancelled = false;
        apiFetch<MemberListResponse>(`/club-members?${query}`)
            .then((res) => {
                if (!cancelled) setOutcome({ key: requestKey, res });
            })
            .catch((error) => {
                if (!cancelled) setOutcome({ key: requestKey, error });
            });
        return () => {
            cancelled = true;
        };
    }, [query, requestKey]);

    const loading = outcome?.key !== requestKey;
    const lastList = outcome?.res ?? null;
    const failed = !loading && outcome?.error !== undefined;
    // 403: the role may not read the list at all (e.g. guardians) -- retrying cannot help.
    const forbidden = failed && outcome?.error instanceof ApiError && outcome.error.status === 403;
    const rows = lastList?.data ?? [];
    const total = lastList?.total ?? 0;
    const pages = Math.max(1, Math.ceil(total / pageSize));

    // A reload (or shrinking result) can leave the current page past the end: jump to the last page.
    useEffect(() => {
        if (!loading && lastList && lastList.data.length === 0 && lastList.total > 0 && page > 1) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPage(Math.max(1, Math.ceil(lastList.total / pageSize)));
        }
    }, [loading, lastList, page, pageSize]);

    function changeFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
        setFilters((f) => ({ ...f, [key]: value }));
        setPage(1);
    }

    function toggleSort(key: SortKey) {
        if (sort === key) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
        else {
            setSort(key);
            setOrder('asc');
        }
        setPage(1);
    }

    function resetAll() {
        setFilters(EMPTY_FILTERS);
        setAgeInput({ min: '', max: '' });
        setSearchInput('');
        setQ('');
        setPage(1);
    }

    const chips: { id: string; label: string; clear: () => void }[] = [];
    if (q) chips.push({ id: 'q', label: t('verein.members.chip.q', { q }), clear: () => { setSearchInput(''); setQ(''); setPage(1); } });
    if (filters.status) chips.push({ id: 'status', label: t('verein.members.chip.status', { value: t(`verein.status.${filters.status}`) }), clear: () => changeFilter('status', '') });
    if (filters.category) {
        const c = categories.find((x) => x.key === filters.category);
        chips.push({ id: 'category', label: t('verein.members.chip.category', { value: c?.name ?? filters.category }), clear: () => changeFilter('category', '') });
    }
    if (filters.departmentId) {
        const d = departments.find((x) => x.id === filters.departmentId);
        chips.push({ id: 'department', label: t('verein.members.chip.department', { value: d?.name ?? '—' }), clear: () => changeFilter('departmentId', '') });
    }
    if (filters.hasAccount) {
        chips.push({
            id: 'account',
            label: filters.hasAccount === 'true' ? t('verein.members.chip.account.yes') : t('verein.members.chip.account.no'),
            clear: () => changeFilter('hasAccount', ''),
        });
    }
    if (canSensitive && (filters.ageMin !== '' || filters.ageMax !== '')) {
        chips.push({
            id: 'age',
            label: t('verein.members.chip.age', { min: filters.ageMin === '' ? '0' : filters.ageMin, max: filters.ageMax === '' ? '∞' : filters.ageMax }),
            clear: () => {
                setAgeInput({ min: '', max: '' });
                setFilters((f) => ({ ...f, ageMin: '', ageMax: '' }));
            },
        });
    }

    function sortHeader(label: string, sortKey: SortKey) {
        const active = sort === sortKey;
        return (
            <th key={sortKey} className="px-3 py-2" aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button type="button" onClick={() => toggleSort(sortKey)} className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground">
                    {label}
                    {active && (order === 'asc' ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : <ArrowDown className="h-3 w-3" aria-hidden="true" />)}
                </button>
            </th>
        );
    }

    const filtered = chips.length > 0;
    const selectClass = `${inputClass} sm:w-auto`;

    return (
        <div>
            {canWrite && canSensitive && (
                <TransitionSuggestions clubId={clubId} reloadToken={reloadToken + localReload} onApplied={reload} />
            )}

            <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="relative min-w-[12rem] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <input
                        type="search"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        maxLength={100}
                        placeholder={canSensitive ? t('verein.members.search.placeholder.sensitive') : t('verein.members.search.placeholder')}
                        aria-label={t('verein.members.search.label')}
                        className={`${inputClass} pl-9`}
                    />
                </div>
                {canWrite && (
                    <button type="button" onClick={() => setImporting(true)} className={`${secondaryButtonClass} inline-flex items-center gap-1.5 !px-3 !py-2`}>
                        <Upload className="h-4 w-4" aria-hidden="true" />
                        {t('verein.import.open')}
                    </button>
                )}
                {(canWrite || canSensitive) && (
                    <button type="button" onClick={() => setExporting(true)} className={`${secondaryButtonClass} inline-flex items-center gap-1.5 !px-3 !py-2`}>
                        <Download className="h-4 w-4" aria-hidden="true" />
                        {t('verein.export.open')}
                    </button>
                )}
                {canWrite && (
                    <button type="button" onClick={() => setCreating(true)} className={`${primaryButtonClass} inline-flex items-center gap-1.5`}>
                        <UserPlus className="h-4 w-4" aria-hidden="true" />
                        {t('verein.members.create')}
                    </button>
                )}
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
                <select value={filters.status} onChange={(e) => changeFilter('status', e.target.value)} aria-label={t('verein.members.filter.status')} className={selectClass}>
                    <option value="">{t('verein.members.filter.status.all')}</option>
                    {statusOptions.map((s) => (
                        <option key={s} value={s}>
                            {t(`verein.status.${s}`)}
                        </option>
                    ))}
                </select>
                <select value={filters.category} onChange={(e) => changeFilter('category', e.target.value)} aria-label={t('verein.members.filter.category')} className={selectClass}>
                    <option value="">{t('verein.members.filter.category.all')}</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.key}>
                            {c.name}
                        </option>
                    ))}
                </select>
                {departments.length > 0 && (
                    <select value={filters.departmentId} onChange={(e) => changeFilter('departmentId', e.target.value)} aria-label={t('verein.members.filter.department')} className={selectClass}>
                        <option value="">{t('verein.members.filter.department.all')}</option>
                        {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </select>
                )}
                <select
                    value={filters.hasAccount}
                    onChange={(e) => changeFilter('hasAccount', e.target.value as Filters['hasAccount'])}
                    aria-label={t('verein.members.filter.account')}
                    className={selectClass}
                >
                    <option value="">{t('verein.members.filter.account.all')}</option>
                    <option value="true">{t('verein.members.filter.account.yes')}</option>
                    <option value="false">{t('verein.members.filter.account.no')}</option>
                </select>
                {canSensitive && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {t('verein.members.filter.age')}
                        <input
                            type="number"
                            min={0}
                            max={150}
                            value={ageInput.min}
                            onChange={(e) => setAgeInput((a) => ({ ...a, min: e.target.value }))}
                            aria-invalid={ageInvalid}
                            aria-label={t('verein.members.filter.ageMin')}
                            className={`${inputClass} w-16`}
                        />
                        –
                        <input
                            type="number"
                            min={0}
                            max={150}
                            value={ageInput.max}
                            onChange={(e) => setAgeInput((a) => ({ ...a, max: e.target.value }))}
                            aria-invalid={ageInvalid}
                            aria-label={t('verein.members.filter.ageMax')}
                            className={`${inputClass} w-16`}
                        />
                        {ageInvalid && (
                            <span role="alert" className="text-destructive">
                                {t('verein.err.ageRange')}
                            </span>
                        )}
                    </span>
                )}
            </div>

            {filtered && (
                <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label={t('verein.members.chips.label')}>
                    {chips.map((c) => (
                        <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-0.5 pl-2.5 pr-1 text-xs font-semibold text-primary">
                            {c.label}
                            <button type="button" onClick={c.clear} aria-label={t('verein.members.chip.remove')} className="rounded-full p-0.5 hover:bg-primary/20">
                                <X className="h-3 w-3" aria-hidden="true" />
                            </button>
                        </span>
                    ))}
                    <button type="button" onClick={resetAll} className="text-xs font-medium text-primary hover:underline">
                        {t('verein.members.reset')}
                    </button>
                </div>
            )}

            {failed ? (
                <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
                    <p className="text-destructive">{forbidden ? t('verein.members.forbidden') : t(memberErrorKey(outcome?.error))}</p>
                    {!forbidden && (
                        <button type="button" onClick={reload} className={`${secondaryButtonClass} mt-3`}>
                            {t('verein.create.retry')}
                        </button>
                    )}
                </div>
            ) : !lastList ? (
                <p className="text-sm text-muted-foreground" role="status">
                    {t('verein.members.loading')}
                </p>
            ) : rows.length === 0 && !loading ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                    <p className="text-sm text-muted-foreground">{filtered ? t('verein.members.empty.filtered') : t('verein.members.empty')}</p>
                    {filtered ? (
                        <button type="button" onClick={resetAll} className={`${secondaryButtonClass} mt-3`}>
                            {t('verein.members.reset')}
                        </button>
                    ) : (
                        canWrite && (
                            <button type="button" onClick={() => setCreating(true)} className={`${primaryButtonClass} mt-3`}>
                                {t('verein.members.create')}
                            </button>
                        )
                    )}
                </div>
            ) : (
                <>
                    <div className={`relative overflow-x-auto rounded-xl border border-border transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                                    {sortHeader(t('verein.members.table.name'), 'name')}
                                    <th className="px-3 py-2 uppercase tracking-wide">{t('verein.members.table.category')}</th>
                                    <th className="px-3 py-2 uppercase tracking-wide">{t('verein.members.table.status')}</th>
                                    <th className="px-3 py-2 uppercase tracking-wide">{t('verein.members.table.account')}</th>
                                    <th className="px-3 py-2 uppercase tracking-wide">{t('verein.members.table.departments')}</th>
                                    <th className="px-3 py-2 uppercase tracking-wide">{t('verein.members.table.roles')}</th>
                                    {sortHeader(t('verein.members.table.joined'), 'joinedAt')}
                                    {canSensitive && sortHeader(t('verein.members.table.number'), 'memberNumber')}
                                    {(canWrite || hasCustomFields) && <th className="px-3 py-2"><span className="sr-only">{t('forms.cf.detail.column')}</span></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((m) => {
                                    const left = m.effectiveStatus === 'ausgetreten' || m.effectiveStatus === 'ausgeschlossen' || m.effectiveStatus === 'verstorben';
                                    const depts = currentDepartments(m);
                                    return (
                                        <tr key={m.id} className={`border-b border-border align-top last:border-b-0 ${left ? 'opacity-70' : ''}`}>
                                            <td className="px-3 py-2 text-foreground">
                                                <span className="flex items-center gap-2">
                                                    <MemberAvatar name={m.name} photoUrl={m.photoUrl} onExpired={onPhotoExpired} />
                                                    <span>{m.name ?? '—'}</span>
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">{categoryLabel(m, t)}</td>
                                            <td className="px-3 py-2">
                                                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusChipClass(m.effectiveStatus)}`}>
                                                    {t(`verein.status.${m.effectiveStatus}`)}
                                                </span>
                                                {hasPendingExit(m) && (
                                                    <span className="mt-0.5 block text-xs text-muted-foreground">{t('verein.status.pendingExit.short', { date: formatDate(m.leftAt, language) })}</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">{m.hasAccount ? t('verein.members.account.yes') : t('verein.members.account.no')}</td>
                                            <td className="px-3 py-2 text-muted-foreground">{depts.length > 0 ? depts.map((d) => d.name).join(', ') : '—'}</td>
                                            <td className="px-3 py-2">
                                                {m.hasAccount ? (
                                                    <MemberRoleCell memberId={m.id} roles={m.roles} clubId={clubId} canEdit={canRoles && !left} onChange={reload} />
                                                ) : (
                                                    <span className="text-muted-foreground" title={t('verein.members.roles.noAccount')}>
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">{formatDate(m.joinedAt, language)}</td>
                                            {canSensitive && <td className="px-3 py-2 text-muted-foreground">{m.memberNumber ?? '—'}</td>}
                                            {!canWrite && hasCustomFields && (
                                                <td className="px-3 py-2 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => setDetail(m)}
                                                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                        aria-label={t('forms.cf.detail.open', { name: m.name ?? '—' })}
                                                    >
                                                        <Eye className="h-4 w-4" aria-hidden="true" />
                                                    </button>
                                                </td>
                                            )}
                                            {canWrite && (
                                                <td className="px-3 py-2 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditing(m)}
                                                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                        aria-label={t('verein.members.edit')}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                        <p role="status">
                            {t('verein.members.total', { count: total })} · {t('verein.members.pageOf', { page: Math.min(page, pages), pages })}
                        </p>
                        <div className="flex flex-wrap items-center gap-1">
                            <label className="mr-2 inline-flex items-center gap-1">
                                {t('verein.members.pageSize')}
                                <select
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setPage(1);
                                    }}
                                    className="rounded-md border border-border bg-background px-1.5 py-1 text-xs text-foreground"
                                >
                                    {PAGE_SIZES.map((n) => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                aria-label={t('verein.members.prev')}
                                className="rounded-md border border-border p-1 hover:bg-muted disabled:opacity-40"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            {pageWindow(Math.min(page, pages), pages).map((n) => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setPage(n)}
                                    aria-current={n === page ? 'page' : undefined}
                                    className={`min-w-[1.75rem] rounded-md border px-2 py-1 ${n === page ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:bg-muted'}`}
                                >
                                    {n}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                                disabled={page >= pages}
                                aria-label={t('verein.members.next')}
                                className="rounded-md border border-border p-1 hover:bg-muted disabled:opacity-40"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </>
            )}

            {(creating || editing) && (
                <MemberFormModal
                    key={editing?.id ?? 'new'}
                    mode={editing ? 'edit' : 'create'}
                    member={editing}
                    clubId={clubId}
                    categories={categories}
                    departments={departments}
                    canReadSensitive={canSensitive}
                    canManageAccount={canWrite}
                    onClose={() => {
                        setEditing(null);
                        setCreating(false);
                    }}
                    onChanged={reload}
                />
            )}
            {detail && !canWrite && <MemberDetailDialog clubId={clubId} memberId={detail.id} name={detail.name} onClose={() => setDetail(null)} />}
            {importing && canWrite && <MemberImportDialog clubId={clubId} categories={categories} onClose={() => setImporting(false)} onImported={reload} />}
            {exporting && (canWrite || canSensitive) && (
                <MemberExportDialog clubId={clubId} permissions={permissions} categories={categories} departments={departments} onClose={() => setExporting(false)} />
            )}
        </div>
    );
}
