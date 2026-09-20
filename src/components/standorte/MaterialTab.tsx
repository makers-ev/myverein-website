'use client';

import { useEffect, useState } from 'react';

import { apiFetch, ApiError } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Location } from '@/components/standorte/StandorteTab';

export interface InventoryItem {
    id: string;
    clubId: string;
    name: string;
    category: string | null;
    condition: string;
    locationId: string | null;
    acquisitionValueCents: number | null;
    acquiredAt: string | null;
    maintenanceIntervalDays: number | null;
    lastMaintenanceAt: string | null;
    createdAt: string;
    updatedAt: string;
    // Server-derived, see backend's lib/inventory-status.ts -- never sent on write.
    maintenanceDue: boolean;
    maintenanceDueAt: string | null;
}

interface InventoryLoan {
    id: string;
    itemId: string;
    memberId: string;
    borrowedAt: string;
    dueAt: string | null;
    returnedAt: string | null;
    // Free text, "ueberfaellig" is a live override computed at read time --
    // never re-derived here, just displayed (see backend's effectiveLoanStatus).
    status: string;
}

interface InventoryDamageReport {
    id: string;
    itemId: string;
    reportedBy: string;
    description: string;
    photoUrl: string | null;
    status: 'gemeldet' | 'in_bearbeitung' | 'behoben';
    createdAt: string;
    resolvedAt: string | null;
}

interface ClubMember {
    id: string;
    name: string | null;
}

// Same local-copy pattern as TreffenPanel.tsx/StandorteTab.tsx.
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-bold text-foreground">{title}</h2>
            {children}
        </div>
    );
}

function MaintenanceDueBadge({ t }: { t: (key: string) => string }) {
    return (
        <span className="inline-flex items-center rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning">
            {t('standorte.material.badge.maintenanceDue')}
        </span>
    );
}

function OverdueBadge({ t }: { t: (key: string) => string }) {
    return (
        <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
            {t('standorte.material.badge.overdue')}
        </span>
    );
}

function DamageStatusBadge({ status, t }: { status: InventoryDamageReport['status']; t: (key: string) => string }) {
    const colorClass =
        status === 'behoben' ? 'bg-success/10 text-success' : status === 'in_bearbeitung' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning';
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}>{t(`standorte.damage-reports.status.${status}`)}</span>;
}

function formatEuros(cents: number | null): string {
    if (cents === null) return '—';
    return `${(cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function MaintenanceOverview({ items, t }: { items: InventoryItem[]; t: (key: string) => string }) {
    const dueItems = items.filter((i) => i.maintenanceDue);

    return (
        <SectionCard title={t('standorte.material.overview.title')}>
            {dueItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('standorte.material.overview.empty')}</p>
            ) : (
                <ul className="flex flex-wrap gap-2">
                    {dueItems.map((item) => (
                        <li key={item.id} className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/5 px-3 py-1.5 text-sm">
                            <span className="font-medium text-foreground">{item.name}</span>
                            <MaintenanceDueBadge t={t} />
                        </li>
                    ))}
                </ul>
            )}
        </SectionCard>
    );
}

function ItemList({
    clubId,
    items,
    locations,
    t,
    onChange,
    onSelect,
}: {
    clubId: string;
    items: InventoryItem[];
    locations: Location[];
    t: (key: string) => string;
    onChange: () => void;
    onSelect: (id: string) => void;
}) {
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [condition, setCondition] = useState('');
    const [locationId, setLocationId] = useState('');
    const [valueEuros, setValueEuros] = useState('');
    const [maintenanceIntervalDays, setMaintenanceIntervalDays] = useState('');
    const [lastMaintenanceAt, setLastMaintenanceAt] = useState('');
    const [acquiredAt, setAcquiredAt] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const locationName = (id: string | null) => (id ? locations.find((l) => l.id === id)?.name ?? id : t('standorte.items.no-location'));

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || !condition.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            await apiFetch(`/inventory-items?clubId=${clubId}`, {
                method: 'POST',
                body: {
                    name: name.trim(),
                    category: category.trim() || undefined,
                    condition: condition.trim(),
                    locationId: locationId || undefined,
                    // Integer cents at the API boundary -- this repo's inputs
                    // are whole-currency-unit euros, the backend stores cents.
                    acquisitionValueCents: valueEuros ? Math.round(Number(valueEuros) * 100) : undefined,
                    maintenanceIntervalDays: maintenanceIntervalDays ? Number(maintenanceIntervalDays) : undefined,
                    lastMaintenanceAt: lastMaintenanceAt || undefined,
                    acquiredAt: acquiredAt || undefined,
                },
            });
            setName('');
            setCategory('');
            setCondition('');
            setLocationId('');
            setValueEuros('');
            setMaintenanceIntervalDays('');
            setLastMaintenanceAt('');
            setAcquiredAt('');
            setShowCreate(false);
            onChange();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm(t('standorte.items.delete.confirm'))) return;
        setError(null);
        try {
            await apiFetch(`/inventory-items/${id}?clubId=${clubId}`, { method: 'DELETE' });
            onChange();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    return (
        <SectionCard title={t('standorte.tab.material')}>
            {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

            {items.length === 0 ? (
                <p className="mb-3 text-sm text-muted-foreground">{t('standorte.items.empty')}</p>
            ) : (
                <div className="mb-3 overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                <th className="px-3 py-2">{t('standorte.items.table.name')}</th>
                                <th className="px-3 py-2">{t('standorte.items.table.category')}</th>
                                <th className="px-3 py-2">{t('standorte.items.table.condition')}</th>
                                <th className="px-3 py-2">{t('standorte.items.table.location')}</th>
                                <th className="px-3 py-2">{t('standorte.items.table.value')}</th>
                                <th className="px-3 py-2">{t('standorte.items.table.maintenance')}</th>
                                <th className="px-3 py-2">{t('standorte.items.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <tr key={item.id} className="border-b border-border last:border-b-0">
                                    <td className="px-3 py-2 font-medium text-foreground">{item.name}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{item.category ?? '—'}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{item.condition}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{locationName(item.locationId)}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{formatEuros(item.acquisitionValueCents)}</td>
                                    <td className="px-3 py-2">{item.maintenanceDue && <MaintenanceDueBadge t={t} />}</td>
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => onSelect(item.id)} className="text-xs font-medium text-primary hover:underline">
                                                {t('standorte.items.select')}
                                            </button>
                                            <button onClick={() => void handleDelete(item.id)} className="text-xs font-medium text-destructive hover:underline">
                                                {t('standorte.items.delete')}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showCreate ? (
                <form onSubmit={(e) => void handleCreate(e)} className="space-y-2 rounded-lg border border-border p-3">
                    <div className="flex flex-wrap gap-2">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('standorte.items.new.name')}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder={t('standorte.items.new.category')}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                        <input
                            type="text"
                            value={condition}
                            onChange={(e) => setCondition(e.target.value)}
                            placeholder={t('standorte.items.new.condition')}
                            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={locationId}
                            onChange={(e) => setLocationId(e.target.value)}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                        >
                            <option value="">{t('standorte.items.new.location.none')}</option>
                            {locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                    {loc.name}
                                </option>
                            ))}
                        </select>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={valueEuros}
                            onChange={(e) => setValueEuros(e.target.value)}
                            placeholder={t('standorte.items.new.value')}
                            className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            type="number"
                            min="1"
                            value={maintenanceIntervalDays}
                            onChange={(e) => setMaintenanceIntervalDays(e.target.value)}
                            placeholder={t('standorte.items.new.maintenanceInterval')}
                            className="w-48 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                        <label className="text-xs text-muted-foreground">
                            {t('standorte.items.new.lastMaintenance')}
                            <input
                                type="date"
                                value={lastMaintenanceAt}
                                onChange={(e) => setLastMaintenanceAt(e.target.value)}
                                className="ml-2 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                            />
                        </label>
                        <label className="text-xs text-muted-foreground">
                            {t('standorte.items.new.acquiredAt')}
                            <input
                                type="date"
                                value={acquiredAt}
                                onChange={(e) => setAcquiredAt(e.target.value)}
                                className="ml-2 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                            />
                        </label>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="submit"
                            disabled={submitting || !name.trim() || !condition.trim()}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                        >
                            {t('standorte.items.new.submit')}
                        </button>
                        <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-muted-foreground hover:text-foreground">
                            {t('standorte.items.new.cancel')}
                        </button>
                    </div>
                </form>
            ) : (
                <button onClick={() => setShowCreate(true)} className="text-sm font-medium text-primary hover:underline">
                    {t('standorte.items.new')}
                </button>
            )}
        </SectionCard>
    );
}

function LoansSection({ itemId, clubId, t }: { itemId: string; clubId: string; t: (key: string) => string }) {
    const [loans, setLoans] = useState<InventoryLoan[] | null>(null);
    const [members, setMembers] = useState<ClubMember[]>([]);

    useEffect(() => {
        // setLoans/setMembers run inside the .then() callback, not
        // synchronously in the effect body, so this doesn't need the
        // react-hooks/set-state-in-effect disable comment other effects in
        // this file need (see Verein.tsx's initial /my-clubs fetch for the
        // same distinction).
        void Promise.all([
            apiFetch<{ data: InventoryLoan[] }>(`/inventory-items/${itemId}/loans?clubId=${clubId}`),
            apiFetch<{ data: ClubMember[] }>(`/club-members?clubId=${clubId}`),
        ]).then(([loansRes, membersRes]) => {
            setLoans(loansRes.data);
            setMembers(membersRes.data);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemId]);

    const nameFor = (memberId: string) => members.find((m) => m.id === memberId)?.name ?? memberId;

    if (loans === null) {
        return (
            <SectionCard title={t('standorte.loans.title')}>
                <p className="text-sm text-muted-foreground">…</p>
            </SectionCard>
        );
    }

    return (
        <SectionCard title={t('standorte.loans.title')}>
            {loans.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('standorte.loans.empty')}</p>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                <th className="px-3 py-2">{t('standorte.loans.table.member')}</th>
                                <th className="px-3 py-2">{t('standorte.loans.table.borrowedAt')}</th>
                                <th className="px-3 py-2">{t('standorte.loans.table.dueAt')}</th>
                                <th className="px-3 py-2">{t('standorte.loans.table.returnedAt')}</th>
                                <th className="px-3 py-2">{t('standorte.loans.table.status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loans.map((loan) => {
                                const overdue = loan.status === 'ueberfaellig';
                                return (
                                    <tr key={loan.id} className={`border-b border-border last:border-b-0 ${overdue ? 'bg-destructive/5' : ''}`}>
                                        <td className="px-3 py-2 text-foreground">{nameFor(loan.memberId)}</td>
                                        <td className="px-3 py-2 text-muted-foreground">{new Date(loan.borrowedAt).toLocaleDateString('de-DE')}</td>
                                        <td className="px-3 py-2 text-muted-foreground">{loan.dueAt ? new Date(loan.dueAt).toLocaleDateString('de-DE') : '—'}</td>
                                        <td className="px-3 py-2 text-muted-foreground">{loan.returnedAt ? new Date(loan.returnedAt).toLocaleDateString('de-DE') : '—'}</td>
                                        <td className="px-3 py-2">
                                            {overdue ? (
                                                <OverdueBadge t={t} />
                                            ) : (
                                                <span className="text-xs text-muted-foreground">{t(`standorte.loans.status.${loan.status}`)}</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </SectionCard>
    );
}

function DamageReportsSection({ itemId, clubId, t }: { itemId: string; clubId: string; t: (key: string) => string }) {
    const [reports, setReports] = useState<InventoryDamageReport[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function load() {
        const { data } = await apiFetch<{ data: InventoryDamageReport[] }>(`/inventory-items/${itemId}/damage-reports?clubId=${clubId}`);
        setReports(data);
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemId]);

    async function handleTriage(reportId: string, nextStatus: 'in_bearbeitung' | 'behoben') {
        setError(null);
        try {
            await apiFetch(`/inventory-items/${itemId}/damage-reports/${reportId}?clubId=${clubId}`, {
                method: 'PATCH',
                body: { status: nextStatus },
            });
            await load();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    if (reports === null) {
        return (
            <SectionCard title={t('standorte.damage-reports.title')}>
                <p className="text-sm text-muted-foreground">…</p>
            </SectionCard>
        );
    }

    return (
        <SectionCard title={t('standorte.damage-reports.title')}>
            {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
            {reports.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('standorte.damage-reports.empty')}</p>
            ) : (
                <ul className="space-y-2">
                    {reports.map((report) => (
                        <li key={report.id} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <p className="text-foreground">{report.description}</p>
                                    <p className="text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleDateString('de-DE')}</p>
                                </div>
                                <DamageStatusBadge status={report.status} t={t} />
                            </div>
                            {report.status !== 'behoben' && (
                                <button
                                    onClick={() => void handleTriage(report.id, report.status === 'gemeldet' ? 'in_bearbeitung' : 'behoben')}
                                    className="mt-2 text-xs font-medium text-primary hover:underline"
                                >
                                    {t(`standorte.damage-reports.triage.${report.status}`)}
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </SectionCard>
    );
}

function ItemDetail({
    clubId,
    itemId,
    locations,
    t,
    onBack,
    onItemsChanged,
}: {
    clubId: string;
    itemId: string;
    locations: Location[];
    t: (key: string) => string;
    onBack: () => void;
    onItemsChanged: () => void;
}) {
    const [item, setItem] = useState<InventoryItem | null>(null);
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [condition, setCondition] = useState('');
    const [locationId, setLocationId] = useState('');
    const [valueEuros, setValueEuros] = useState('');
    const [maintenanceIntervalDays, setMaintenanceIntervalDays] = useState('');
    const [lastMaintenanceAt, setLastMaintenanceAt] = useState('');
    const [acquiredAt, setAcquiredAt] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    async function load() {
        const { data } = await apiFetch<{ data: InventoryItem }>(`/inventory-items/${itemId}?clubId=${clubId}`);
        setItem(data);
        setName(data.name);
        setCategory(data.category ?? '');
        setCondition(data.condition);
        setLocationId(data.locationId ?? '');
        setValueEuros(data.acquisitionValueCents !== null ? String(data.acquisitionValueCents / 100) : '');
        setMaintenanceIntervalDays(data.maintenanceIntervalDays !== null ? String(data.maintenanceIntervalDays) : '');
        setLastMaintenanceAt(data.lastMaintenanceAt ?? '');
        setAcquiredAt(data.acquiredAt ?? '');
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemId]);

    async function handleSave() {
        setError(null);
        setSaved(false);
        try {
            await apiFetch(`/inventory-items/${itemId}?clubId=${clubId}`, {
                method: 'PATCH',
                body: {
                    name: name.trim(),
                    category: category.trim() || null,
                    condition: condition.trim(),
                    locationId: locationId || null,
                    acquisitionValueCents: valueEuros ? Math.round(Number(valueEuros) * 100) : null,
                    maintenanceIntervalDays: maintenanceIntervalDays ? Number(maintenanceIntervalDays) : null,
                    lastMaintenanceAt: lastMaintenanceAt || null,
                    acquiredAt: acquiredAt || null,
                },
            });
            setSaved(true);
            await load();
            onItemsChanged();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    if (!item) return <p className="text-sm text-muted-foreground">…</p>;

    return (
        <div className="space-y-4">
            <button onClick={onBack} className="text-sm font-medium text-primary hover:underline">
                {t('standorte.items.back')}
            </button>

            <SectionCard title={t('standorte.items.detail.title')}>
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('standorte.items.new.name')}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder={t('standorte.items.new.category')}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                        <input
                            type="text"
                            value={condition}
                            onChange={(e) => setCondition(e.target.value)}
                            placeholder={t('standorte.items.new.condition')}
                            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={locationId}
                            onChange={(e) => setLocationId(e.target.value)}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                        >
                            <option value="">{t('standorte.items.new.location.none')}</option>
                            {locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                    {loc.name}
                                </option>
                            ))}
                        </select>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={valueEuros}
                            onChange={(e) => setValueEuros(e.target.value)}
                            placeholder={t('standorte.items.new.value')}
                            className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            type="number"
                            min="1"
                            value={maintenanceIntervalDays}
                            onChange={(e) => setMaintenanceIntervalDays(e.target.value)}
                            placeholder={t('standorte.items.new.maintenanceInterval')}
                            className="w-48 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                        <label className="text-xs text-muted-foreground">
                            {t('standorte.items.new.lastMaintenance')}
                            <input
                                type="date"
                                value={lastMaintenanceAt}
                                onChange={(e) => setLastMaintenanceAt(e.target.value)}
                                className="ml-2 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                            />
                        </label>
                        <label className="text-xs text-muted-foreground">
                            {t('standorte.items.new.acquiredAt')}
                            <input
                                type="date"
                                value={acquiredAt}
                                onChange={(e) => setAcquiredAt(e.target.value)}
                                className="ml-2 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                            />
                        </label>
                    </div>

                    {item.maintenanceDue && (
                        <div className="flex items-center gap-2">
                            <MaintenanceDueBadge t={t} />
                            {item.maintenanceDueAt && (
                                <span className="text-xs text-muted-foreground">
                                    {t('standorte.items.detail.maintenanceDueAt')}: {new Date(item.maintenanceDueAt).toLocaleDateString('de-DE')}
                                </span>
                            )}
                        </div>
                    )}

                    <button onClick={() => void handleSave()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                        {t('standorte.items.detail.save')}
                    </button>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    {saved && !error && <p className="text-xs text-success">{t('standorte.items.detail.saved')}</p>}
                </div>
            </SectionCard>

            <DamageReportsSection itemId={itemId} clubId={clubId} t={t} />
            <LoansSection itemId={itemId} clubId={clubId} t={t} />
        </div>
    );
}

export default function MaterialTab({ clubId, locations }: { clubId: string; locations: Location[] }) {
    const { t } = useLanguage();
    const [items, setItems] = useState<InventoryItem[] | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    async function loadItems() {
        const { data } = await apiFetch<{ data: InventoryItem[] }>(`/inventory-items?clubId=${clubId}`);
        setItems(data);
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId]);

    if (items === null) return <p className="text-sm text-muted-foreground">…</p>;

    return (
        <div className="space-y-4">
            <MaintenanceOverview items={items} t={t} />

            {selectedId ? (
                <ItemDetail
                    clubId={clubId}
                    itemId={selectedId}
                    locations={locations}
                    t={t}
                    onBack={() => setSelectedId(null)}
                    onItemsChanged={() => void loadItems()}
                />
            ) : (
                <ItemList clubId={clubId} items={items} locations={locations} t={t} onChange={() => void loadItems()} onSelect={setSelectedId} />
            )}
        </div>
    );
}
