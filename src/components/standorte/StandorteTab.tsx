'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Check, Clock, Copy, ExternalLink, KeyRound, Link as LinkIcon, MapPin, Pencil, Plus, QrCode, Trash2, User, Wifi } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { buildWifiQrPayload } from '@/lib/wifiQr';
import { useLanguage } from '@/contexts/LanguageContext';
import { Modal } from '@/components/Modal';
import {
    Chip,
    ConfirmModal,
    EmptyState,
    Field,
    FormModal,
    SectionCard,
    Toggle,
    errorMessage,
    iconButtonClass,
    inputClass,
    primaryButtonClass,
    run,
    secondaryButtonClass,
    type T,
} from '@/components/standorte/ui';

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

function LocationPhoto({ url, className }: { url: string | null; className: string }) {
    if (!url) {
        return (
            <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}>
                <MapPin className="h-8 w-8" />
            </div>
        );
    }
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary external URLs, next/image would need remotePatterns.
    return <img src={url} alt="" className={`object-cover ${className}`} />;
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-0.5 shrink-0">{icon}</span>
            <span className="min-w-0 break-words">{children}</span>
        </p>
    );
}

function CopyButton({ value, t }: { value: string; t: T }) {
    const [copied, setCopied] = useState(false);

    async function copy() {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    return (
        <button type="button" onClick={() => void copy()} className={iconButtonClass} aria-label={t('standorte.wifi.copy')} title={t('standorte.wifi.copy')}>
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </button>
    );
}

// --- Location create/edit ------------------------------------------------------

type LocationDraft = Record<'name' | 'address' | 'openingHours' | 'contactPerson' | 'photoUrl' | 'accessNote', string>;

function LocationFormModal({ clubId, location, t, onClose, onSaved }: { clubId: string; location: Location | null; t: T; onClose: () => void; onSaved: () => void }) {
    const [draft, setDraft] = useState<LocationDraft>({
        name: location?.name ?? '',
        address: location?.address ?? '',
        openingHours: location?.openingHours ?? '',
        contactPerson: location?.contactPerson ?? '',
        photoUrl: location?.photoUrl ?? '',
        accessNote: location?.accessNote ?? '',
    });
    const set = (key: keyof LocationDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft({ ...draft, [key]: e.target.value });

    // Create omits empty fields, edit clears them with null.
    const empty = location ? null : undefined;
    const body = {
        name: draft.name.trim(),
        address: draft.address.trim() || empty,
        openingHours: draft.openingHours.trim() || empty,
        contactPerson: draft.contactPerson.trim() || empty,
        photoUrl: draft.photoUrl.trim() || empty,
        accessNote: draft.accessNote.trim() || empty,
    };

    return (
        <FormModal
            open
            title={location ? t('standorte.locations.detail.title') : t('standorte.locations.new.title')}
            submitLabel={location ? t('standorte.locations.detail.save') : t('standorte.locations.new.submit')}
            cancelLabel={t('standorte.locations.new.cancel')}
            canSubmit={!!draft.name.trim()}
            onClose={onClose}
            onSubmit={() =>
                run(async () => {
                    await apiFetch(location ? `/locations/${location.id}?clubId=${clubId}` : `/locations?clubId=${clubId}`, {
                        method: location ? 'PATCH' : 'POST',
                        body,
                    });
                    onSaved();
                })
            }
        >
            <Field label={t('standorte.locations.detail.name')}>
                <input type="text" value={draft.name} onChange={set('name')} required className={inputClass} />
            </Field>
            <Field label={t('standorte.locations.detail.address')}>
                <input type="text" value={draft.address} onChange={set('address')} className={inputClass} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('standorte.locations.detail.openingHours')}>
                    <input type="text" value={draft.openingHours} onChange={set('openingHours')} className={inputClass} />
                </Field>
                <Field label={t('standorte.locations.detail.contactPerson')}>
                    <input type="text" value={draft.contactPerson} onChange={set('contactPerson')} className={inputClass} />
                </Field>
            </div>
            <Field label={t('standorte.locations.detail.photoUrl')}>
                <input type="url" value={draft.photoUrl} onChange={set('photoUrl')} placeholder="https://…" className={inputClass} />
            </Field>
            <Field label={t('standorte.locations.detail.accessNote')}>
                <textarea value={draft.accessNote} onChange={set('accessNote')} rows={3} className={inputClass} />
            </Field>
        </FormModal>
    );
}

// --- Location grid ---------------------------------------------------------------

function LocationGrid({
    clubId,
    locations,
    canWrite,
    t,
    onChange,
    onSelect,
}: {
    clubId: string;
    locations: Location[];
    canWrite: boolean;
    t: T;
    onChange: () => void;
    onSelect: (id: string) => void;
}) {
    const [showCreate, setShowCreate] = useState(false);

    return (
        <div className="space-y-4">
            {canWrite && (
                <div className="flex justify-end">
                    <button onClick={() => setShowCreate(true)} className={primaryButtonClass}>
                        <Plus className="h-4 w-4" />
                        {t('standorte.locations.new')}
                    </button>
                </div>
            )}

            {locations.length === 0 ? (
                <EmptyState icon={<MapPin className="h-8 w-8" />} text={t('standorte.locations.empty')} />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {locations.map((loc) => (
                        <button
                            key={loc.id}
                            onClick={() => onSelect(loc.id)}
                            className="overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-primary"
                        >
                            <LocationPhoto url={loc.photoUrl} className="h-36 w-full" />
                            <div className="space-y-1.5 p-4">
                                <h3 className="font-semibold text-foreground">{loc.name}</h3>
                                {loc.address && <InfoRow icon={<MapPin className="h-4 w-4" />}>{loc.address}</InfoRow>}
                                {loc.openingHours && <InfoRow icon={<Clock className="h-4 w-4" />}>{loc.openingHours}</InfoRow>}
                                {loc.contactPerson && <InfoRow icon={<User className="h-4 w-4" />}>{loc.contactPerson}</InfoRow>}
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {showCreate && <LocationFormModal clubId={clubId} location={null} t={t} onClose={() => setShowCreate(false)} onSaved={onChange} />}
        </div>
    );
}

// --- Key holders -------------------------------------------------------------------

function KeyHoldersSection({
    location,
    members,
    clubId,
    canWrite,
    t,
    onChange,
}: {
    location: LocationDetailData;
    members: ClubMember[];
    clubId: string;
    canWrite: boolean;
    t: T;
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
            setError(errorMessage(err));
        }
    }

    async function handleRemove(memberId: string) {
        setError(null);
        try {
            await apiFetch(`/locations/${location.id}/key-holders/${memberId}?clubId=${clubId}`, { method: 'DELETE' });
            onChange();
        } catch (err) {
            setError(errorMessage(err));
        }
    }

    return (
        <SectionCard title={t('standorte.keyholders.title')}>
            {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
            {location.keyHolders.length === 0 ? (
                <EmptyState icon={<KeyRound className="h-6 w-6" />} text={t('standorte.keyholders.empty')} />
            ) : (
                <ul className="flex flex-wrap gap-2">
                    {location.keyHolders.map((kh) => (
                        <li key={kh.id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background py-1 pl-3 pr-1.5 text-sm text-foreground">
                            <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                            {nameFor(kh.memberId)}
                            {canWrite && (
                                <button
                                    onClick={() => void handleRemove(kh.memberId)}
                                    className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    aria-label={t('standorte.keyholders.remove')}
                                    title={t('standorte.keyholders.remove')}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {canWrite && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <select value={newMemberId} onChange={(e) => setNewMemberId(e.target.value)} className={`${inputClass} sm:flex-1`}>
                        <option value="">{t('standorte.keyholders.select')}</option>
                        {availableMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.name ?? m.id}
                            </option>
                        ))}
                    </select>
                    <button onClick={() => void handleAdd()} disabled={!newMemberId} className={primaryButtonClass}>
                        <Plus className="h-4 w-4" />
                        {t('standorte.keyholders.add')}
                    </button>
                </div>
            )}
        </SectionCard>
    );
}

// --- WiFi ---------------------------------------------------------------------------

function WifiQrModal({ network, t, onClose }: { network: WifiNetwork; t: T; onClose: () => void }) {
    return (
        <Modal open onClose={onClose} title={network.label}>
            <div className="flex flex-col items-center gap-4">
                {/* White quiet zone keeps the code scannable in dark mode. */}
                <div className="rounded-xl bg-white p-4">
                    <QRCodeSVG value={buildWifiQrPayload(network.ssid, network.password)} size={240} marginSize={0} />
                </div>
                <p className="text-center text-xs text-muted-foreground">{t('standorte.wifi.qr.hint')}</p>
                <dl className="w-full space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
                        <dt className="text-muted-foreground">{t('standorte.wifi.ssid')}</dt>
                        <dd className="flex min-w-0 items-center gap-1 font-medium text-foreground">
                            <span className="truncate">{network.ssid}</span>
                            <CopyButton value={network.ssid} t={t} />
                        </dd>
                    </div>
                    {network.password && (
                        <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
                            <dt className="text-muted-foreground">{t('standorte.wifi.password')}</dt>
                            <dd className="flex min-w-0 items-center gap-1 font-mono text-foreground">
                                <span className="truncate">{network.password}</span>
                                <CopyButton value={network.password} t={t} />
                            </dd>
                        </div>
                    )}
                </dl>
            </div>
        </Modal>
    );
}

function WifiFormModal({
    locationId,
    clubId,
    network,
    t,
    onClose,
    onSaved,
}: {
    locationId: string;
    clubId: string;
    network: WifiNetwork | null;
    t: T;
    onClose: () => void;
    onSaved: () => Promise<void>;
}) {
    const [label, setLabel] = useState(network?.label ?? '');
    const [ssid, setSsid] = useState(network?.ssid ?? '');
    const [password, setPassword] = useState(network?.password ?? '');
    const [visibleToGuests, setVisibleToGuests] = useState(network?.visibleToGuests ?? false);

    return (
        <FormModal
            open
            title={network ? t('standorte.wifi.edit.title') : t('standorte.wifi.new.title')}
            submitLabel={network ? t('standorte.wifi.save') : t('standorte.wifi.submit')}
            cancelLabel={t('standorte.wifi.cancel')}
            canSubmit={!!label.trim() && !!ssid.trim()}
            onClose={onClose}
            onSubmit={() =>
                run(async () => {
                    await apiFetch(network ? `/locations/${locationId}/wifi/${network.id}?clubId=${clubId}` : `/locations/${locationId}/wifi?clubId=${clubId}`, {
                        method: network ? 'PATCH' : 'POST',
                        body: { label: label.trim(), ssid: ssid.trim(), password: password.trim(), visibleToGuests },
                    });
                    await onSaved();
                })
            }
        >
            <Field label={t('standorte.wifi.label')}>
                <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} required className={inputClass} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('standorte.wifi.ssid')}>
                    <input type="text" value={ssid} onChange={(e) => setSsid(e.target.value)} required className={inputClass} />
                </Field>
                <Field label={t('standorte.wifi.password')}>
                    <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} font-mono`} />
                </Field>
            </div>
            <Toggle checked={visibleToGuests} onChange={setVisibleToGuests} label={t('standorte.wifi.visibleToGuests')} />
            <p className="text-xs text-muted-foreground">{t('standorte.wifi.hint')}</p>
        </FormModal>
    );
}

function WifiSection({ locationId, clubId, canWrite, t }: { locationId: string; clubId: string; canWrite: boolean; t: T }) {
    const [networks, setNetworks] = useState<WifiNetwork[] | null>(null);
    // undefined = closed, null = create, network = edit
    const [editing, setEditing] = useState<WifiNetwork | null | undefined>(undefined);
    const [deleting, setDeleting] = useState<WifiNetwork | null>(null);
    const [qrFor, setQrFor] = useState<WifiNetwork | null>(null);

    async function load() {
        const { data } = await apiFetch<{ data: WifiNetwork[] }>(`/locations/${locationId}/wifi?clubId=${clubId}`);
        setNetworks(data);
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locationId]);

    return (
        <SectionCard
            title={t('standorte.wifi.title')}
            action={
                canWrite && (
                    <button onClick={() => setEditing(null)} className={secondaryButtonClass}>
                        <Plus className="h-4 w-4" />
                        {t('standorte.wifi.new')}
                    </button>
                )
            }
        >
            {networks === null ? (
                <p className="text-sm text-muted-foreground">…</p>
            ) : networks.length === 0 ? (
                <EmptyState icon={<Wifi className="h-6 w-6" />} text={t('standorte.wifi.empty')} />
            ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                    {networks.map((net) => (
                        <li key={net.id} className="rounded-lg border border-border bg-background p-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="flex items-center gap-2 font-medium text-foreground">
                                        <Wifi className="h-4 w-4 shrink-0 text-primary" />
                                        <span className="truncate">{net.label}</span>
                                    </p>
                                    {canWrite && net.visibleToGuests && (
                                        <div className="mt-1">
                                            <Chip tone="primary">{t('standorte.wifi.visibleToGuests')}</Chip>
                                        </div>
                                    )}
                                </div>
                                {canWrite && (
                                    <div className="flex shrink-0">
                                        <button onClick={() => setEditing(net)} className={iconButtonClass} aria-label={t('standorte.wifi.edit')} title={t('standorte.wifi.edit')}>
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => setDeleting(net)} className={iconButtonClass} aria-label={t('standorte.wifi.delete')} title={t('standorte.wifi.delete')}>
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <dl className="mt-2 space-y-1 text-sm">
                                <div className="flex items-center justify-between gap-2">
                                    <dt className="text-muted-foreground">{t('standorte.wifi.ssid')}</dt>
                                    <dd className="truncate text-foreground">{net.ssid}</dd>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <dt className="text-muted-foreground">{t('standorte.wifi.password')}</dt>
                                    <dd className="flex min-w-0 items-center gap-1 font-mono text-foreground">
                                        <span className="truncate">{net.password}</span>
                                        <CopyButton value={net.password} t={t} />
                                    </dd>
                                </div>
                            </dl>
                            <button onClick={() => setQrFor(net)} className={`${secondaryButtonClass} mt-3 w-full justify-center`}>
                                <QrCode className="h-4 w-4" />
                                {t('standorte.wifi.qr')}
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {editing !== undefined && (
                <WifiFormModal locationId={locationId} clubId={clubId} network={editing} t={t} onClose={() => setEditing(undefined)} onSaved={load} />
            )}
            {qrFor && <WifiQrModal network={qrFor} t={t} onClose={() => setQrFor(null)} />}
            <ConfirmModal
                open={deleting !== null}
                title={t('standorte.wifi.delete')}
                message={t('standorte.wifi.delete.confirm')}
                confirmLabel={t('standorte.wifi.delete')}
                cancelLabel={t('standorte.wifi.cancel')}
                onClose={() => setDeleting(null)}
                onConfirm={() =>
                    run(async () => {
                        await apiFetch(`/locations/${locationId}/wifi/${deleting!.id}?clubId=${clubId}`, { method: 'DELETE' });
                        await load();
                    })
                }
            />
        </SectionCard>
    );
}

// --- Links --------------------------------------------------------------------------

function LinkFormModal({
    locationId,
    clubId,
    link,
    t,
    onClose,
    onSaved,
}: {
    locationId: string;
    clubId: string;
    link: LocationLink | null;
    t: T;
    onClose: () => void;
    onSaved: () => Promise<void>;
}) {
    const [title, setTitle] = useState(link?.title ?? '');
    const [url, setUrl] = useState(link?.url ?? '');
    const [icon, setIcon] = useState(link?.icon ?? '');
    const [visibleToGuests, setVisibleToGuests] = useState(link?.visibleToGuests ?? false);

    return (
        <FormModal
            open
            title={link ? t('standorte.links.edit.title') : t('standorte.links.new.title')}
            submitLabel={link ? t('standorte.links.save') : t('standorte.links.submit')}
            cancelLabel={t('standorte.links.cancel')}
            canSubmit={!!title.trim() && !!url.trim()}
            onClose={onClose}
            onSubmit={() =>
                run(async () => {
                    await apiFetch(link ? `/locations/${locationId}/links/${link.id}?clubId=${clubId}` : `/locations/${locationId}/links?clubId=${clubId}`, {
                        method: link ? 'PATCH' : 'POST',
                        body: { title: title.trim(), url: url.trim(), icon: icon.trim() || (link ? null : undefined), visibleToGuests },
                    });
                    await onSaved();
                })
            }
        >
            <Field label={t('standorte.links.link.title')}>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} />
            </Field>
            <Field label={t('standorte.links.link.url')}>
                <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="https://…" className={inputClass} />
            </Field>
            <Field label={t('standorte.links.link.icon')}>
                <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} className={inputClass} />
            </Field>
            <Toggle checked={visibleToGuests} onChange={setVisibleToGuests} label={t('standorte.links.visibleToGuests')} />
        </FormModal>
    );
}

function LinksSection({ locationId, clubId, canWrite, t }: { locationId: string; clubId: string; canWrite: boolean; t: T }) {
    const [links, setLinks] = useState<LocationLink[] | null>(null);
    // undefined = closed, null = create, link = edit
    const [editing, setEditing] = useState<LocationLink | null | undefined>(undefined);
    const [deleting, setDeleting] = useState<LocationLink | null>(null);

    async function load() {
        const { data } = await apiFetch<{ data: LocationLink[] }>(`/locations/${locationId}/links?clubId=${clubId}`);
        setLinks(data);
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locationId]);

    return (
        <SectionCard
            title={t('standorte.links.title')}
            action={
                canWrite && (
                    <button onClick={() => setEditing(null)} className={secondaryButtonClass}>
                        <Plus className="h-4 w-4" />
                        {t('standorte.links.new')}
                    </button>
                )
            }
        >
            {links === null ? (
                <p className="text-sm text-muted-foreground">…</p>
            ) : links.length === 0 ? (
                <EmptyState icon={<LinkIcon className="h-6 w-6" />} text={t('standorte.links.empty')} />
            ) : (
                <ul className="divide-y divide-border">
                    {links.map((link) => (
                        <li key={link.id} className="flex items-center justify-between gap-2 py-2">
                            <a href={link.url} target="_blank" rel="noreferrer" className="group flex min-w-0 items-center gap-2">
                                <span className="shrink-0 text-lg leading-none">{link.icon || <ExternalLink className="h-4 w-4 text-primary" />}</span>
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium text-foreground group-hover:text-primary">{link.title}</span>
                                    <span className="block truncate text-xs text-muted-foreground">{link.url}</span>
                                </span>
                            </a>
                            <div className="flex shrink-0 items-center gap-1">
                                {canWrite && link.visibleToGuests && <Chip tone="primary">{t('standorte.links.visibleToGuests')}</Chip>}
                                {canWrite && (
                                    <>
                                        <button onClick={() => setEditing(link)} className={iconButtonClass} aria-label={t('standorte.links.edit')} title={t('standorte.links.edit')}>
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => setDeleting(link)} className={iconButtonClass} aria-label={t('standorte.links.delete')} title={t('standorte.links.delete')}>
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {editing !== undefined && (
                <LinkFormModal locationId={locationId} clubId={clubId} link={editing} t={t} onClose={() => setEditing(undefined)} onSaved={load} />
            )}
            <ConfirmModal
                open={deleting !== null}
                title={t('standorte.links.delete')}
                message={t('standorte.links.delete.confirm')}
                confirmLabel={t('standorte.links.delete')}
                cancelLabel={t('standorte.links.cancel')}
                onClose={() => setDeleting(null)}
                onConfirm={() =>
                    run(async () => {
                        await apiFetch(`/locations/${locationId}/links/${deleting!.id}?clubId=${clubId}`, { method: 'DELETE' });
                        await load();
                    })
                }
            />
        </SectionCard>
    );
}

// --- Location detail ---------------------------------------------------------------

function LocationDetail({
    clubId,
    locationId,
    members,
    canWrite,
    t,
    onBack,
    onLocationsChanged,
}: {
    clubId: string;
    locationId: string;
    members: ClubMember[];
    canWrite: boolean;
    t: T;
    onBack: () => void;
    onLocationsChanged: () => void;
}) {
    const [location, setLocation] = useState<LocationDetailData | null>(null);
    const [editing, setEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);

    async function load() {
        const { data } = await apiFetch<{ data: LocationDetailData }>(`/locations/${locationId}?clubId=${clubId}`);
        setLocation(data);
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locationId]);

    if (!location) return <p className="text-sm text-muted-foreground">…</p>;

    return (
        <div className="space-y-4">
            <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                <ArrowLeft className="h-4 w-4" />
                {t('standorte.locations.back')}
            </button>

            <div className="overflow-hidden rounded-xl border border-border bg-card">
                {location.photoUrl && <LocationPhoto url={location.photoUrl} className="h-48 w-full sm:h-64" />}
                <div className="space-y-3 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <h2 className="text-xl font-bold text-foreground">{location.name}</h2>
                        {canWrite && (
                            <div className="flex gap-2">
                                <button onClick={() => setEditing(true)} className={secondaryButtonClass}>
                                    <Pencil className="h-4 w-4" />
                                    {t('standorte.locations.edit')}
                                </button>
                                <button
                                    onClick={() => setDeleting(true)}
                                    className={`${secondaryButtonClass} text-destructive hover:bg-destructive/10`}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    {t('standorte.locations.delete')}
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {location.address && <InfoRow icon={<MapPin className="h-4 w-4" />}>{location.address}</InfoRow>}
                        {location.openingHours && <InfoRow icon={<Clock className="h-4 w-4" />}>{location.openingHours}</InfoRow>}
                        {location.contactPerson && <InfoRow icon={<User className="h-4 w-4" />}>{location.contactPerson}</InfoRow>}
                    </div>
                    {location.accessNote && (
                        <div className="rounded-lg bg-muted/50 p-3">
                            <p className="text-xs font-medium text-muted-foreground">{t('standorte.locations.detail.accessNote')}</p>
                            <p className="mt-1 whitespace-pre-line text-sm text-foreground">{location.accessNote}</p>
                        </div>
                    )}
                </div>
            </div>

            <WifiSection locationId={locationId} clubId={clubId} canWrite={canWrite} t={t} />
            <KeyHoldersSection location={location} members={members} clubId={clubId} canWrite={canWrite} t={t} onChange={() => void load()} />
            <LinksSection locationId={locationId} clubId={clubId} canWrite={canWrite} t={t} />

            {editing && (
                <LocationFormModal
                    clubId={clubId}
                    location={location}
                    t={t}
                    onClose={() => setEditing(false)}
                    onSaved={() => {
                        void load();
                        onLocationsChanged();
                    }}
                />
            )}
            <ConfirmModal
                open={deleting}
                title={t('standorte.locations.delete')}
                message={t('standorte.locations.delete.confirm')}
                confirmLabel={t('standorte.locations.delete')}
                cancelLabel={t('standorte.locations.new.cancel')}
                onClose={() => setDeleting(false)}
                onConfirm={() =>
                    run(async () => {
                        await apiFetch(`/locations/${locationId}?clubId=${clubId}`, { method: 'DELETE' });
                        onLocationsChanged();
                        onBack();
                    })
                }
            />
        </div>
    );
}

export default function StandorteTab({
    clubId,
    locations,
    canWrite,
    onLocationsChanged,
}: {
    clubId: string;
    // Fetched once in pageContent/Standorte.tsx, MaterialTab needs it too.
    locations: Location[];
    // locations:write -- hides management UI only, the backend enforces it.
    canWrite: boolean;
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
            canWrite={canWrite}
            t={t}
            onBack={() => setSelectedId(null)}
            onLocationsChanged={onLocationsChanged}
        />
    ) : (
        <LocationGrid clubId={clubId} locations={locations} canWrite={canWrite} t={t} onChange={onLocationsChanged} onSelect={setSelectedId} />
    );
}
