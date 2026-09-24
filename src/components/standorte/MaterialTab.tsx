'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, MapPin, Package, Pencil, Plus, Search, Trash2, Wrench } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Location } from '@/components/standorte/StandorteTab';
import {
    Chip,
    ConfirmModal,
    EmptyState,
    Field,
    FormModal,
    SectionCard,
    errorMessage,
    formatDate,
    inputClass,
    primaryButtonClass,
    run,
    secondaryButtonClass,
    type T,
    type Tone,
} from '@/components/standorte/ui';

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
    // "ueberfaellig" is a live override computed by the backend, only displayed here.
    status: string;
}

type DamageStatus = 'gemeldet' | 'in_bearbeitung' | 'behoben';

interface InventoryDamageReport {
    id: string;
    itemId: string;
    reportedBy: string;
    description: string;
    photoUrl: string | null;
    status: DamageStatus;
    createdAt: string;
    resolvedAt: string | null;
}

interface ClubMember {
    id: string;
    name: string | null;
}

const DAMAGE_STATUSES: DamageStatus[] = ['gemeldet', 'in_bearbeitung', 'behoben'];
const damageTone: Record<DamageStatus, Tone> = { gemeldet: 'destructive', in_bearbeitung: 'warning', behoben: 'success' };
const damageText: Record<DamageStatus, string> = { gemeldet: 'text-destructive', in_bearbeitung: 'text-warning', behoben: 'text-success' };
const loanTone: Record<string, Tone> = { ueberfaellig: 'destructive', ausgeliehen: 'warning', zurueckgegeben: 'success' };

// Condition is free text; map common DE/EN words to a colour, unknown stays neutral.
function conditionTone(condition: string): Tone {
    const c = condition.toLowerCase();
    if (/defekt|kaputt|broken|unbrauchbar/.test(c)) return 'destructive';
    if (/besch|damaged|abgenutzt|worn|mäßig|fair/.test(c)) return 'warning';
    if (/gut|neu|good|new|sehr/.test(c)) return 'success';
    return 'muted';
}

function formatEuros(cents: number | null): string {
    if (cents === null) return '—';
    return `${(cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function ItemChips({ item, t }: { item: InventoryItem; t: T }) {
    return (
        <div className="flex flex-wrap gap-1.5">
            <Chip tone={conditionTone(item.condition)}>{item.condition}</Chip>
            {item.maintenanceDue && (
                <Chip tone="warning">
                    <Wrench className="mr-1 h-3 w-3" />
                    {t('standorte.material.badge.maintenanceDue')}
                </Chip>
            )}
        </div>
    );
}

function MaintenanceOverview({ items, t, onSelect }: { items: InventoryItem[]; t: T; onSelect: (id: string) => void }) {
    const dueItems = items.filter((i) => i.maintenanceDue);

    return (
        <SectionCard title={t('standorte.material.overview.title')}>
            {dueItems.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-success">
                    <Wrench className="h-4 w-4" />
                    {t('standorte.material.overview.empty')}
                </p>
            ) : (
                <ul className="flex flex-wrap gap-2">
                    {dueItems.map((item) => (
                        <li key={item.id}>
                            <button
                                onClick={() => onSelect(item.id)}
                                className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/5 px-3 py-1.5 text-sm hover:bg-warning/10"
                            >
                                <Wrench className="h-4 w-4 text-warning" />
                                <span className="font-medium text-foreground">{item.name}</span>
                                {item.maintenanceDueAt && <span className="text-xs text-muted-foreground">{formatDate(item.maintenanceDueAt)}</span>}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </SectionCard>
    );
}

// --- Item create/edit -------------------------------------------------------------

function ItemFormModal({
    clubId,
    item,
    items,
    locations,
    t,
    onClose,
    onSaved,
}: {
    clubId: string;
    item: InventoryItem | null;
    items: InventoryItem[];
    locations: Location[];
    t: T;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [name, setName] = useState(item?.name ?? '');
    const [category, setCategory] = useState(item?.category ?? '');
    const [condition, setCondition] = useState(item?.condition ?? '');
    const [locationId, setLocationId] = useState(item?.locationId ?? '');
    const [valueEuros, setValueEuros] = useState(item?.acquisitionValueCents != null ? String(item.acquisitionValueCents / 100) : '');
    const [intervalDays, setIntervalDays] = useState(item?.maintenanceIntervalDays != null ? String(item.maintenanceIntervalDays) : '');
    const [lastMaintenanceAt, setLastMaintenanceAt] = useState(item?.lastMaintenanceAt ?? '');
    const [acquiredAt, setAcquiredAt] = useState(item?.acquiredAt ?? '');

    const categories = [...new Set(items.map((i) => i.category).filter((c): c is string => !!c))];
    // Create omits empty fields, edit clears them with null.
    const empty = item ? null : undefined;

    return (
        <FormModal
            open
            title={item ? t('standorte.items.detail.title') : t('standorte.items.new.title')}
            submitLabel={item ? t('standorte.items.detail.save') : t('standorte.items.new.submit')}
            cancelLabel={t('standorte.items.new.cancel')}
            canSubmit={!!name.trim() && !!condition.trim()}
            onClose={onClose}
            onSubmit={() =>
                run(async () => {
                    await apiFetch(item ? `/inventory-items/${item.id}?clubId=${clubId}` : `/inventory-items?clubId=${clubId}`, {
                        method: item ? 'PATCH' : 'POST',
                        body: {
                            name: name.trim(),
                            category: category.trim() || empty,
                            condition: condition.trim(),
                            locationId: locationId || empty,
                            // Euros in the form, integer cents at the API boundary.
                            acquisitionValueCents: valueEuros ? Math.round(Number(valueEuros) * 100) : empty,
                            maintenanceIntervalDays: intervalDays ? Number(intervalDays) : empty,
                            lastMaintenanceAt: lastMaintenanceAt || empty,
                            acquiredAt: acquiredAt || empty,
                        },
                    });
                    onSaved();
                })
            }
        >
            <Field label={t('standorte.items.table.name')}>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputClass} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('standorte.items.new.category')}>
                    <input type="text" list="standorte-categories" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} />
                    <datalist id="standorte-categories">
                        {categories.map((c) => (
                            <option key={c} value={c} />
                        ))}
                    </datalist>
                </Field>
                <Field label={t('standorte.items.table.condition')}>
                    <input
                        type="text"
                        list="standorte-conditions"
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                        required
                        placeholder={t('standorte.items.new.condition')}
                        className={inputClass}
                    />
                    <datalist id="standorte-conditions">
                        {['gut', 'beschädigt', 'defekt'].map((c) => (
                            <option key={c} value={c} />
                        ))}
                    </datalist>
                </Field>
                <Field label={t('standorte.items.table.location')}>
                    <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={inputClass}>
                        <option value="">{t('standorte.items.new.location.none')}</option>
                        {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                                {loc.name}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label={t('standorte.items.new.value')}>
                    <input type="number" step="0.01" min="0" value={valueEuros} onChange={(e) => setValueEuros(e.target.value)} className={inputClass} />
                </Field>
                <Field label={t('standorte.items.new.acquiredAt')}>
                    <input type="date" value={acquiredAt} onChange={(e) => setAcquiredAt(e.target.value)} className={inputClass} />
                </Field>
                <Field label={t('standorte.items.new.maintenanceInterval')}>
                    <input type="number" min="1" step="1" value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} className={inputClass} />
                </Field>
                <Field label={t('standorte.items.new.lastMaintenance')}>
                    <input type="date" value={lastMaintenanceAt} onChange={(e) => setLastMaintenanceAt(e.target.value)} className={inputClass} />
                </Field>
            </div>
        </FormModal>
    );
}

// --- Item list ------------------------------------------------------------------------

function ItemList({
    clubId,
    items,
    locations,
    canWrite,
    t,
    onChange,
    onSelect,
}: {
    clubId: string;
    items: InventoryItem[];
    locations: Location[];
    canWrite: boolean;
    t: T;
    onChange: () => void;
    onSelect: (id: string) => void;
}) {
    const [showCreate, setShowCreate] = useState(false);
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<string | null>(null);

    const categories = useMemo(() => [...new Set(items.map((i) => i.category).filter((c): c is string => !!c))].sort(), [items]);
    const locationName = (id: string | null) => (id ? (locations.find((l) => l.id === id)?.name ?? null) : null);

    const q = query.trim().toLowerCase();
    const visible = items.filter(
        (i) => (category === null || i.category === category) && (!q || i.name.toLowerCase().includes(q) || i.category?.toLowerCase().includes(q)),
    );

    const chipClass = (active: boolean) =>
        `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:text-foreground'
        }`;

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('standorte.items.search')}
                        className={`${inputClass} pl-9`}
                    />
                </div>
                {canWrite && (
                    <button onClick={() => setShowCreate(true)} className={`${primaryButtonClass} justify-center`}>
                        <Plus className="h-4 w-4" />
                        {t('standorte.items.new')}
                    </button>
                )}
            </div>

            {categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setCategory(null)} className={chipClass(category === null)}>
                        {t('standorte.items.filter.all')}
                    </button>
                    {categories.map((c) => (
                        <button key={c} onClick={() => setCategory(c)} className={chipClass(category === c)}>
                            {c}
                        </button>
                    ))}
                </div>
            )}

            {items.length === 0 ? (
                <EmptyState icon={<Package className="h-8 w-8" />} text={t('standorte.items.empty')} />
            ) : visible.length === 0 ? (
                <EmptyState icon={<Search className="h-8 w-8" />} text={t('standorte.items.no-match')} />
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {visible.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onSelect(item.id)}
                            className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary"
                        >
                            <div className="min-w-0">
                                <h3 className="truncate font-semibold text-foreground">{item.name}</h3>
                                {item.category && <p className="text-xs text-muted-foreground">{item.category}</p>}
                            </div>
                            <ItemChips item={item} t={t} />
                            <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span className="flex min-w-0 items-center gap-1">
                                    {locationName(item.locationId) && (
                                        <>
                                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">{locationName(item.locationId)}</span>
                                        </>
                                    )}
                                </span>
                                {item.acquisitionValueCents !== null && <span className="shrink-0">{formatEuros(item.acquisitionValueCents)}</span>}
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {showCreate && (
                <ItemFormModal clubId={clubId} item={null} items={items} locations={locations} t={t} onClose={() => setShowCreate(false)} onSaved={onChange} />
            )}
        </div>
    );
}

// --- Loans & damage reports -----------------------------------------------------------

function LoansSection({ itemId, clubId, t }: { itemId: string; clubId: string; t: T }) {
    const [loans, setLoans] = useState<InventoryLoan[] | null>(null);
    const [members, setMembers] = useState<ClubMember[]>([]);

    useEffect(() => {
        // State is set in the .then() callback, so no set-state-in-effect disable is needed.
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

    return (
        <SectionCard title={t('standorte.loans.title')}>
            {loans === null ? (
                <p className="text-sm text-muted-foreground">…</p>
            ) : loans.length === 0 ? (
                <EmptyState icon={<Package className="h-6 w-6" />} text={t('standorte.loans.empty')} />
            ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
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
                            {loans.map((loan) => (
                                <tr key={loan.id} className={`border-b border-border last:border-b-0 ${loan.status === 'ueberfaellig' ? 'bg-destructive/5' : ''}`}>
                                    <td className="whitespace-nowrap px-3 py-2 text-foreground">{nameFor(loan.memberId)}</td>
                                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatDate(loan.borrowedAt)}</td>
                                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatDate(loan.dueAt)}</td>
                                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatDate(loan.returnedAt)}</td>
                                    <td className="px-3 py-2">
                                        <Chip tone={loanTone[loan.status] ?? 'muted'}>{t(`standorte.loans.status.${loan.status}`)}</Chip>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </SectionCard>
    );
}

function DamageReportsSection({ itemId, clubId, canWrite, t }: { itemId: string; clubId: string; canWrite: boolean; t: T }) {
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

    async function handleTriage(reportId: string, status: DamageStatus) {
        setError(null);
        try {
            await apiFetch(`/inventory-items/${itemId}/damage-reports/${reportId}?clubId=${clubId}`, { method: 'PATCH', body: { status } });
            await load();
        } catch (err) {
            setError(errorMessage(err));
        }
    }

    return (
        <SectionCard title={t('standorte.damage-reports.title')}>
            {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
            {reports === null ? (
                <p className="text-sm text-muted-foreground">…</p>
            ) : reports.length === 0 ? (
                <EmptyState icon={<AlertTriangle className="h-6 w-6" />} text={t('standorte.damage-reports.empty')} />
            ) : (
                <ul className="space-y-3">
                    {reports.map((report) => (
                        <li key={report.id} className="rounded-lg border border-border bg-background p-3 text-sm">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="whitespace-pre-line text-foreground">{report.description}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {formatDate(report.createdAt)}
                                        {report.resolvedAt && ` → ${formatDate(report.resolvedAt)}`}
                                    </p>
                                    {report.photoUrl && (
                                        <a href={report.photoUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-primary hover:underline">
                                            {t('standorte.damage-reports.photo')}
                                        </a>
                                    )}
                                </div>
                                {!canWrite && <Chip tone={damageTone[report.status]}>{t(`standorte.damage-reports.status.${report.status}`)}</Chip>}
                            </div>
                            {canWrite && (
                                <div role="radiogroup" aria-label={t('standorte.loans.table.status')} className="mt-3 flex w-full rounded-lg bg-muted p-1 sm:w-auto sm:inline-flex">
                                    {DAMAGE_STATUSES.map((status) => {
                                        const active = report.status === status;
                                        return (
                                            <button
                                                key={status}
                                                role="radio"
                                                aria-checked={active}
                                                onClick={() => !active && void handleTriage(report.id, status)}
                                                className={`flex-1 rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                                                    active ? `bg-card shadow-sm ${damageText[status]}` : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                {t(`standorte.damage-reports.status.${status}`)}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </SectionCard>
    );
}

// --- Item detail ---------------------------------------------------------------------

function ItemDetail({
    clubId,
    itemId,
    items,
    locations,
    canWrite,
    t,
    onBack,
    onItemsChanged,
}: {
    clubId: string;
    itemId: string;
    items: InventoryItem[];
    locations: Location[];
    canWrite: boolean;
    t: T;
    onBack: () => void;
    onItemsChanged: () => void;
}) {
    const [item, setItem] = useState<InventoryItem | null>(null);
    const [editing, setEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);

    async function load() {
        const { data } = await apiFetch<{ data: InventoryItem }>(`/inventory-items/${itemId}?clubId=${clubId}`);
        setItem(data);
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemId]);

    if (!item) return <p className="text-sm text-muted-foreground">…</p>;

    const facts: [string, string][] = [
        [t('standorte.items.table.category'), item.category ?? '—'],
        [t('standorte.items.table.location'), locations.find((l) => l.id === item.locationId)?.name ?? '—'],
        [t('standorte.items.table.value'), formatEuros(item.acquisitionValueCents)],
        [t('standorte.items.new.acquiredAt'), formatDate(item.acquiredAt)],
        [t('standorte.items.new.maintenanceInterval'), item.maintenanceIntervalDays !== null ? String(item.maintenanceIntervalDays) : '—'],
        [t('standorte.items.new.lastMaintenance'), formatDate(item.lastMaintenanceAt)],
        [t('standorte.items.detail.maintenanceDueAt'), formatDate(item.maintenanceDueAt)],
    ];

    return (
        <div className="space-y-4">
            <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                <ArrowLeft className="h-4 w-4" />
                {t('standorte.items.back')}
            </button>

            <div className="space-y-4 rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-foreground">{item.name}</h2>
                        <ItemChips item={item} t={t} />
                    </div>
                    {canWrite && (
                        <div className="flex gap-2">
                            <button onClick={() => setEditing(true)} className={secondaryButtonClass}>
                                <Pencil className="h-4 w-4" />
                                {t('standorte.items.edit')}
                            </button>
                            <button onClick={() => setDeleting(true)} className={`${secondaryButtonClass} text-destructive hover:bg-destructive/10`}>
                                <Trash2 className="h-4 w-4" />
                                {t('standorte.items.delete')}
                            </button>
                        </div>
                    )}
                </div>
                <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                    {facts.map(([label, value]) => (
                        <div key={label}>
                            <dt className="text-xs text-muted-foreground">{label}</dt>
                            <dd className="text-sm font-medium text-foreground">{value}</dd>
                        </div>
                    ))}
                </dl>
            </div>

            <DamageReportsSection itemId={itemId} clubId={clubId} canWrite={canWrite} t={t} />
            <LoansSection itemId={itemId} clubId={clubId} t={t} />

            {editing && (
                <ItemFormModal
                    clubId={clubId}
                    item={item}
                    items={items}
                    locations={locations}
                    t={t}
                    onClose={() => setEditing(false)}
                    onSaved={() => {
                        void load();
                        onItemsChanged();
                    }}
                />
            )}
            <ConfirmModal
                open={deleting}
                title={t('standorte.items.delete')}
                message={t('standorte.items.delete.confirm')}
                confirmLabel={t('standorte.items.delete')}
                cancelLabel={t('standorte.items.new.cancel')}
                onClose={() => setDeleting(false)}
                onConfirm={() =>
                    run(async () => {
                        await apiFetch(`/inventory-items/${itemId}?clubId=${clubId}`, { method: 'DELETE' });
                        onItemsChanged();
                        onBack();
                    })
                }
            />
        </div>
    );
}

export default function MaterialTab({ clubId, locations, canWrite }: { clubId: string; locations: Location[]; canWrite: boolean }) {
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
            <MaintenanceOverview items={items} t={t} onSelect={setSelectedId} />

            {selectedId ? (
                <ItemDetail
                    key={selectedId}
                    clubId={clubId}
                    itemId={selectedId}
                    items={items}
                    locations={locations}
                    canWrite={canWrite}
                    t={t}
                    onBack={() => setSelectedId(null)}
                    onItemsChanged={() => void loadItems()}
                />
            ) : (
                <ItemList clubId={clubId} items={items} locations={locations} canWrite={canWrite} t={t} onChange={() => void loadItems()} onSelect={setSelectedId} />
            )}
        </div>
    );
}
