'use client';

import { useEffect, useState } from 'react';

import { apiFetch, ApiError } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';

export interface Location {
    id: string;
    clubId: string;
    name: string;
    address: string | null;
    latitude: string | null;
    longitude: string | null;
    openingHours: string | null;
    photoUrl: string | null;
    contactPerson: string | null;
    accessNote: string | null;
    createdAt: string;
    updatedAt: string;
}

interface LocationKeyHolder {
    id: string;
    locationId: string;
    memberId: string;
}

interface LocationDetailData extends Location {
    keyHolders: LocationKeyHolder[];
}

interface WifiNetwork {
    id: string;
    locationId: string;
    label: string;
    ssid: string;
    password: string;
    visibleToGuests: boolean;
    createdAt: string;
}

interface LocationLink {
    id: string;
    locationId: string;
    title: string;
    url: string;
    icon: string | null;
    visibleToGuests: boolean;
    createdAt: string;
}

interface ClubMember {
    id: string;
    name: string | null;
}

// Same local-copy pattern as TreffenPanel.tsx -- each sub-panel file defines
// its own SectionCard instead of importing one from pageContent/Verein.tsx.
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-bold text-foreground">{title}</h2>
            {children}
        </div>
    );
}

function LocationList({
    clubId,
    locations,
    t,
    onChange,
    onSelect,
}: {
    clubId: string;
    locations: Location[];
    t: (key: string) => string;
    onChange: () => void;
    onSelect: (id: string) => void;
}) {
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            await apiFetch(`/locations?clubId=${clubId}`, {
                method: 'POST',
                body: { name: name.trim(), address: address.trim() || undefined },
            });
            setName('');
            setAddress('');
            setShowCreate(false);
            onChange();
        } catch (err) {
            // ForbiddenError surfaces here for a caller without
            // locations:write -- shown inline instead of a silent no-op,
            // same convention as AbteilungenTab's create form.
            setError(err instanceof ApiError ? err.message : 'Request failed');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm(t('standorte.locations.delete.confirm'))) return;
        setError(null);
        try {
            await apiFetch(`/locations/${id}?clubId=${clubId}`, { method: 'DELETE' });
            onChange();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    return (
        <SectionCard title={t('standorte.tab.standorte')}>
            {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

            {locations.length === 0 ? (
                <p className="mb-3 text-sm text-muted-foreground">{t('standorte.locations.empty')}</p>
            ) : (
                <div className="mb-3 overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                <th className="px-3 py-2">{t('standorte.locations.table.name')}</th>
                                <th className="px-3 py-2">{t('standorte.locations.table.address')}</th>
                                <th className="px-3 py-2">{t('standorte.locations.table.contact')}</th>
                                <th className="px-3 py-2">{t('standorte.locations.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {locations.map((loc) => (
                                <tr key={loc.id} className="border-b border-border last:border-b-0">
                                    <td className="px-3 py-2 font-medium text-foreground">{loc.name}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{loc.address ?? '—'}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{loc.contactPerson ?? '—'}</td>
                                    <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => onSelect(loc.id)} className="text-xs font-medium text-primary hover:underline">
                                                {t('standorte.locations.select')}
                                            </button>
                                            <button onClick={() => void handleDelete(loc.id)} className="text-xs font-medium text-destructive hover:underline">
                                                {t('standorte.locations.delete')}
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
                <form onSubmit={(e) => void handleCreate(e)} className="flex flex-wrap items-center gap-2">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('standorte.locations.new.name')}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    />
                    <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder={t('standorte.locations.new.address')}
                        className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={submitting || !name.trim()}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                        {t('standorte.locations.new.submit')}
                    </button>
                    <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-muted-foreground hover:text-foreground">
                        {t('standorte.locations.new.cancel')}
                    </button>
                </form>
            ) : (
                <button onClick={() => setShowCreate(true)} className="text-sm font-medium text-primary hover:underline">
                    {t('standorte.locations.new')}
                </button>
            )}
        </SectionCard>
    );
}

function KeyHoldersSection({
    location,
    members,
    clubId,
    t,
    onChange,
}: {
    location: LocationDetailData;
    members: ClubMember[];
    clubId: string;
    t: (key: string) => string;
    onChange: () => void;
}) {
    const [newMemberId, setNewMemberId] = useState('');
    const [error, setError] = useState<string | null>(null);

    const nameFor = (memberId: string) => members.find((m) => m.id === memberId)?.name ?? memberId;
    const availableMembers = members.filter((m) => !location.keyHolders.some((kh) => kh.memberId === m.id));

    async function handleAdd() {
        if (!newMemberId) return;
        setError(null);
        try {
            await apiFetch(`/locations/${location.id}/key-holders?clubId=${clubId}`, { method: 'POST', body: { memberId: newMemberId } });
            setNewMemberId('');
            onChange();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    async function handleRemove(memberId: string) {
        setError(null);
        try {
            await apiFetch(`/locations/${location.id}/key-holders/${memberId}?clubId=${clubId}`, { method: 'DELETE' });
            onChange();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    return (
        <SectionCard title={t('standorte.keyholders.title')}>
            {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
            {location.keyHolders.length === 0 ? (
                <p className="mb-2 text-sm text-muted-foreground">{t('standorte.keyholders.empty')}</p>
            ) : (
                <ul className="mb-2 space-y-1">
                    {location.keyHolders.map((kh) => (
                        <li key={kh.id} className="flex items-center justify-between text-sm">
                            <span className="text-foreground">{nameFor(kh.memberId)}</span>
                            <button onClick={() => void handleRemove(kh.memberId)} className="text-xs text-destructive hover:underline">
                                {t('standorte.keyholders.remove')}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <div className="flex items-center gap-2">
                <select
                    value={newMemberId}
                    onChange={(e) => setNewMemberId(e.target.value)}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                    <option value="">{t('standorte.keyholders.select')}</option>
                    {availableMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                            {m.name ?? m.id}
                        </option>
                    ))}
                </select>
                <button
                    onClick={() => void handleAdd()}
                    disabled={!newMemberId}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                >
                    {t('standorte.keyholders.add')}
                </button>
            </div>
        </SectionCard>
    );
}

function WifiSection({ locationId, clubId, t }: { locationId: string; clubId: string; t: (key: string) => string }) {
    const [networks, setNetworks] = useState<WifiNetwork[] | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [label, setLabel] = useState('');
    const [ssid, setSsid] = useState('');
    const [password, setPassword] = useState('');
    const [visibleToGuests, setVisibleToGuests] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function load() {
        const { data } = await apiFetch<{ data: WifiNetwork[] }>(`/locations/${locationId}/wifi?clubId=${clubId}`);
        setNetworks(data);
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locationId]);

    function resetForm() {
        setLabel('');
        setSsid('');
        setPassword('');
        setVisibleToGuests(false);
        setShowCreate(false);
        setEditingId(null);
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!label.trim() || !ssid.trim() || !password.trim()) return;
        setError(null);
        try {
            await apiFetch(`/locations/${locationId}/wifi?clubId=${clubId}`, {
                method: 'POST',
                body: { label: label.trim(), ssid: ssid.trim(), password: password.trim(), visibleToGuests },
            });
            resetForm();
            await load();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    function startEdit(network: WifiNetwork) {
        setEditingId(network.id);
        setLabel(network.label);
        setSsid(network.ssid);
        setPassword(network.password);
        setVisibleToGuests(network.visibleToGuests);
        setShowCreate(false);
    }

    async function handleSaveEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!editingId) return;
        setError(null);
        try {
            await apiFetch(`/locations/${locationId}/wifi/${editingId}?clubId=${clubId}`, {
                method: 'PATCH',
                body: { label: label.trim(), ssid: ssid.trim(), password: password.trim(), visibleToGuests },
            });
            resetForm();
            await load();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm(t('standorte.wifi.delete.confirm'))) return;
        setError(null);
        try {
            await apiFetch(`/locations/${locationId}/wifi/${id}?clubId=${clubId}`, { method: 'DELETE' });
            await load();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    if (networks === null) {
        return (
            <SectionCard title={t('standorte.wifi.title')}>
                <p className="text-sm text-muted-foreground">…</p>
            </SectionCard>
        );
    }

    const formOpen = showCreate || editingId !== null;

    return (
        <SectionCard title={t('standorte.wifi.title')}>
            <p className="mb-3 text-xs text-muted-foreground">{t('standorte.wifi.hint')}</p>
            {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

            {networks.length === 0 ? (
                <p className="mb-3 text-sm text-muted-foreground">{t('standorte.wifi.empty')}</p>
            ) : (
                <ul className="mb-3 space-y-2">
                    {networks.map((net) => (
                        <li key={net.id} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <p className="font-medium text-foreground">
                                        {net.label} {net.visibleToGuests && <span className="ml-1 text-xs text-muted-foreground">({t('standorte.wifi.visibleToGuests')})</span>}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {net.ssid} — {net.password}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => startEdit(net)} className="text-xs font-medium text-primary hover:underline">
                                        {t('standorte.wifi.edit')}
                                    </button>
                                    <button onClick={() => void handleDelete(net.id)} className="text-xs font-medium text-destructive hover:underline">
                                        {t('standorte.wifi.delete')}
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {formOpen ? (
                <form onSubmit={(e) => void (editingId ? handleSaveEdit(e) : handleCreate(e))} className="space-y-2 rounded-lg border border-border p-3">
                    <div className="flex flex-wrap gap-2">
                        <input
                            type="text"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder={t('standorte.wifi.label')}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                        <input
                            type="text"
                            value={ssid}
                            onChange={(e) => setSsid(e.target.value)}
                            placeholder={t('standorte.wifi.ssid')}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                        <input
                            type="text"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('standorte.wifi.password')}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" checked={visibleToGuests} onChange={(e) => setVisibleToGuests(e.target.checked)} />
                        {t('standorte.wifi.visibleToGuests')}
                    </label>
                    <div className="flex items-center gap-2">
                        <button
                            type="submit"
                            disabled={!label.trim() || !ssid.trim() || !password.trim()}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                        >
                            {editingId ? t('standorte.wifi.save') : t('standorte.wifi.submit')}
                        </button>
                        <button type="button" onClick={resetForm} className="text-sm text-muted-foreground hover:text-foreground">
                            {t('standorte.wifi.cancel')}
                        </button>
                    </div>
                </form>
            ) : (
                <button onClick={() => setShowCreate(true)} className="text-sm font-medium text-primary hover:underline">
                    {t('standorte.wifi.new')}
                </button>
            )}
        </SectionCard>
    );
}

function LinksSection({ locationId, clubId, t }: { locationId: string; clubId: string; t: (key: string) => string }) {
    const [links, setLinks] = useState<LocationLink[] | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [linkTitle, setLinkTitle] = useState('');
    const [url, setUrl] = useState('');
    const [icon, setIcon] = useState('');
    const [visibleToGuests, setVisibleToGuests] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function load() {
        const { data } = await apiFetch<{ data: LocationLink[] }>(`/locations/${locationId}/links?clubId=${clubId}`);
        setLinks(data);
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locationId]);

    function resetForm() {
        setLinkTitle('');
        setUrl('');
        setIcon('');
        setVisibleToGuests(false);
        setShowCreate(false);
        setEditingId(null);
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!linkTitle.trim() || !url.trim()) return;
        setError(null);
        try {
            await apiFetch(`/locations/${locationId}/links?clubId=${clubId}`, {
                method: 'POST',
                body: { title: linkTitle.trim(), url: url.trim(), icon: icon.trim() || undefined, visibleToGuests },
            });
            resetForm();
            await load();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    function startEdit(link: LocationLink) {
        setEditingId(link.id);
        setLinkTitle(link.title);
        setUrl(link.url);
        setIcon(link.icon ?? '');
        setVisibleToGuests(link.visibleToGuests);
        setShowCreate(false);
    }

    async function handleSaveEdit(e: React.FormEvent) {
        e.preventDefault();
        if (!editingId) return;
        setError(null);
        try {
            await apiFetch(`/locations/${locationId}/links/${editingId}?clubId=${clubId}`, {
                method: 'PATCH',
                body: { title: linkTitle.trim(), url: url.trim(), icon: icon.trim() || null, visibleToGuests },
            });
            resetForm();
            await load();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm(t('standorte.links.delete.confirm'))) return;
        setError(null);
        try {
            await apiFetch(`/locations/${locationId}/links/${id}?clubId=${clubId}`, { method: 'DELETE' });
            await load();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    if (links === null) {
        return (
            <SectionCard title={t('standorte.links.title')}>
                <p className="text-sm text-muted-foreground">…</p>
            </SectionCard>
        );
    }

    const formOpen = showCreate || editingId !== null;

    return (
        <SectionCard title={t('standorte.links.title')}>
            {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

            {links.length === 0 ? (
                <p className="mb-3 text-sm text-muted-foreground">{t('standorte.links.empty')}</p>
            ) : (
                <ul className="mb-3 space-y-2">
                    {links.map((link) => (
                        <li key={link.id} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <p className="font-medium text-foreground">
                                        {link.title} {link.visibleToGuests && <span className="ml-1 text-xs text-muted-foreground">({t('standorte.links.visibleToGuests')})</span>}
                                    </p>
                                    <a href={link.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                                        {link.url}
                                    </a>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => startEdit(link)} className="text-xs font-medium text-primary hover:underline">
                                        {t('standorte.links.edit')}
                                    </button>
                                    <button onClick={() => void handleDelete(link.id)} className="text-xs font-medium text-destructive hover:underline">
                                        {t('standorte.links.delete')}
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {formOpen ? (
                <form onSubmit={(e) => void (editingId ? handleSaveEdit(e) : handleCreate(e))} className="space-y-2 rounded-lg border border-border p-3">
                    <div className="flex flex-wrap gap-2">
                        <input
                            type="text"
                            value={linkTitle}
                            onChange={(e) => setLinkTitle(e.target.value)}
                            placeholder={t('standorte.links.link.title')}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder={t('standorte.links.link.url')}
                            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                        <input
                            type="text"
                            value={icon}
                            onChange={(e) => setIcon(e.target.value)}
                            placeholder={t('standorte.links.link.icon')}
                            className="w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" checked={visibleToGuests} onChange={(e) => setVisibleToGuests(e.target.checked)} />
                        {t('standorte.links.visibleToGuests')}
                    </label>
                    <div className="flex items-center gap-2">
                        <button
                            type="submit"
                            disabled={!linkTitle.trim() || !url.trim()}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                        >
                            {editingId ? t('standorte.links.save') : t('standorte.links.submit')}
                        </button>
                        <button type="button" onClick={resetForm} className="text-sm text-muted-foreground hover:text-foreground">
                            {t('standorte.links.cancel')}
                        </button>
                    </div>
                </form>
            ) : (
                <button onClick={() => setShowCreate(true)} className="text-sm font-medium text-primary hover:underline">
                    {t('standorte.links.new')}
                </button>
            )}
        </SectionCard>
    );
}

function LocationDetail({
    clubId,
    locationId,
    members,
    t,
    onBack,
    onLocationsChanged,
}: {
    clubId: string;
    locationId: string;
    members: ClubMember[];
    t: (key: string) => string;
    onBack: () => void;
    onLocationsChanged: () => void;
}) {
    const [location, setLocation] = useState<LocationDetailData | null>(null);
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [openingHours, setOpeningHours] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [accessNote, setAccessNote] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    async function load() {
        const { data } = await apiFetch<{ data: LocationDetailData }>(`/locations/${locationId}?clubId=${clubId}`);
        setLocation(data);
        setName(data.name);
        setAddress(data.address ?? '');
        setOpeningHours(data.openingHours ?? '');
        setContactPerson(data.contactPerson ?? '');
        setAccessNote(data.accessNote ?? '');
        setPhotoUrl(data.photoUrl ?? '');
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locationId]);

    async function handleSave() {
        setError(null);
        setSaved(false);
        try {
            await apiFetch(`/locations/${locationId}?clubId=${clubId}`, {
                method: 'PATCH',
                body: {
                    name: name.trim(),
                    address: address.trim() || null,
                    openingHours: openingHours.trim() || null,
                    contactPerson: contactPerson.trim() || null,
                    accessNote: accessNote.trim() || null,
                    photoUrl: photoUrl.trim() || null,
                },
            });
            setSaved(true);
            await load();
            onLocationsChanged();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    if (!location) return <p className="text-sm text-muted-foreground">…</p>;

    return (
        <div className="space-y-4">
            <button onClick={onBack} className="text-sm font-medium text-primary hover:underline">
                {t('standorte.locations.back')}
            </button>

            <SectionCard title={t('standorte.locations.detail.title')}>
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('standorte.locations.detail.name')}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder={t('standorte.locations.detail.address')}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <input
                            type="text"
                            value={openingHours}
                            onChange={(e) => setOpeningHours(e.target.value)}
                            placeholder={t('standorte.locations.detail.openingHours')}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                        <input
                            type="text"
                            value={contactPerson}
                            onChange={(e) => setContactPerson(e.target.value)}
                            placeholder={t('standorte.locations.detail.contactPerson')}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                    <input
                        type="text"
                        value={photoUrl}
                        onChange={(e) => setPhotoUrl(e.target.value)}
                        placeholder={t('standorte.locations.detail.photoUrl')}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                    />
                    <textarea
                        value={accessNote}
                        onChange={(e) => setAccessNote(e.target.value)}
                        placeholder={t('standorte.locations.detail.accessNote')}
                        rows={2}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                    />
                    <button onClick={() => void handleSave()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                        {t('standorte.locations.detail.save')}
                    </button>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    {saved && !error && <p className="text-xs text-success">{t('standorte.locations.detail.saved')}</p>}
                </div>
            </SectionCard>

            <KeyHoldersSection location={location} members={members} clubId={clubId} t={t} onChange={() => void load()} />
            <WifiSection locationId={locationId} clubId={clubId} t={t} />
            <LinksSection locationId={locationId} clubId={clubId} t={t} />
        </div>
    );
}

export default function StandorteTab({
    clubId,
    locations,
    onLocationsChanged,
}: {
    clubId: string;
    // Cross-tab data (MaterialTab's location dropdown needs it too) --
    // fetched once at the page level (pageContent/Standorte.tsx) and passed
    // down, rather than this tab duplicating the same /locations fetch.
    locations: Location[];
    onLocationsChanged: () => void;
}) {
    const { t } = useLanguage();
    const [members, setMembers] = useState<ClubMember[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        void apiFetch<{ data: ClubMember[] }>(`/club-members?clubId=${clubId}`).then(({ data }) => setMembers(data));
    }, [clubId]);

    return selectedId ? (
        <LocationDetail
            clubId={clubId}
            locationId={selectedId}
            members={members}
            t={t}
            onBack={() => setSelectedId(null)}
            onLocationsChanged={onLocationsChanged}
        />
    ) : (
        <LocationList clubId={clubId} locations={locations} t={t} onChange={onLocationsChanged} onSelect={setSelectedId} />
    );
}
