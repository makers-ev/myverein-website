'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Camera, Check, Clock, Copy, ExternalLink, Link as LinkIcon, MapPin, Pencil, Plus, QrCode, Trash2, User, Wifi } from 'lucide-react';

import { ApiError, apiFetch } from '@/lib/api-client';
import { LOCATION_PHOTO_OUTPUT_SIZE, MEDIA_IMAGE_MAX_BYTES, mediaErrorKey, uploadMediaImage } from '@/lib/mediaUpload';
import { useThrottledCallback } from '@/lib/useThrottledCallback';
import { LOCATION_VISIBILITIES, visibilityOf, type LocationVisibility } from '@/lib/locationVisibility';
import { securityOf, WIFI_SECURITIES, wifiNeedsPassword, wifiPasswordFor, wifiQrValue, type WifiSecurity } from '@/lib/wifiQr';
import { useLanguage } from '@/contexts/LanguageContext';
import { Modal } from '@/components/Modal';
import MemberPhotoDialog from '@/components/verein/MemberPhotoDialog';
import KeyManagement, { type LocationKeyHolder } from '@/components/standorte/KeyManagement';
import {
    Chip,
    ConfirmModal,
    EmptyState,
    Field,
    errorMessage,
    FormModal,
    SectionCard,
    iconButtonClass,
    inputClass,
    primaryButtonClass,
    useRun,
    secondaryButtonClass,
    type T,
} from '@/components/standorte/ui';
import LoadingText from '@/components/LoadingText';
import LoadError from '@/components/LoadError';

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
    /** `true` when the caller lacks `locations:write`/`locations:read_access`: access note and key holders are withheld. */
    accessRestricted?: boolean;
    createdAt: string;
    updatedAt: string;
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
    /** `open | wpa | wep | wpa3` (Wave 7 B14); absent on an older backend. */
    security?: string;
    /** Ready-made `WIFI:` string for the QR code, built by the backend. */
    qrPayload?: string;
    visibility?: string;
    visibleToGuests: boolean;
    createdAt: string;
}

interface LocationLink {
    id: string;
    locationId: string;
    title: string;
    url: string;
    icon: string | null;
    visibility?: string;
    visibleToGuests: boolean;
    createdAt: string;
}

function LocationPhoto({ url, className, onExpired }: { url: string | null; className: string; onExpired?: () => void }) {
    // A signed URL can have expired or the file may be gone: fall back to the placeholder instead of a broken image and
    // ask the parent (throttled there) to refetch the resource that carried the URL.
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const refetched = useRef(false);
    if (!url || failedUrl === url) {
        return (
            <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}>
                <MapPin className="h-8 w-8" aria-hidden="true" />
            </div>
        );
    }
    return (
        // Signed media URL on the backend origin (CSP img-src); next/image would proxy it through this server.
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={url}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => {
                refetched.current = false;
            }}
            onError={() => {
                setFailedUrl(url);
                if (!refetched.current) {
                    refetched.current = true;
                    onExpired?.();
                }
            }}
            className={`object-cover ${className}`}
        />
    );
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

type LocationDraft = Record<'name' | 'address' | 'openingHours' | 'contactPerson' | 'accessNote', string>;

function LocationFormModal({ clubId, location, t, onClose, onSaved }: { clubId: string; location: Location | null; t: T; onClose: () => void; onSaved: () => void }) {
    const [draft, setDraft] = useState<LocationDraft>({
        name: location?.name ?? '',
        address: location?.address ?? '',
        openingHours: location?.openingHours ?? '',
        contactPerson: location?.contactPerson ?? '',
        accessNote: location?.accessNote ?? '',
    });
    const set = (key: keyof LocationDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft({ ...draft, [key]: e.target.value });

    // Photo: `undefined` = unchanged, a key = uploaded in this dialog (claimed on save), `null` = remove.
    const [photoKey, setPhotoKey] = useState<string | null | undefined>(undefined);
    const [preview, setPreview] = useState<string | null>(null);
    const [pickingPhoto, setPickingPhoto] = useState(false);
    useEffect(() => () => {
        if (preview) URL.revokeObjectURL(preview);
    }, [preview]);
    const shownPhoto = photoKey === null ? null : (preview ?? location?.photoUrl ?? null);

    async function uploadPhoto(jpeg: Blob) {
        try {
            const key = await uploadMediaImage(clubId, jpeg, 'location.jpg');
            setPhotoKey(key);
            setPreview(URL.createObjectURL(jpeg));
        } catch (err) {
            throw new Error(t(mediaErrorKey(err)));
        }
    }

    // Create omits empty fields, edit clears them with null.
    const empty = location ? null : undefined;
    const body = {
        name: draft.name.trim(),
        address: draft.address.trim() || empty,
        openingHours: draft.openingHours.trim() || empty,
        contactPerson: draft.contactPerson.trim() || empty,
        accessNote: draft.accessNote.trim() || empty,
        ...(photoKey !== undefined && (photoKey !== null || location) ? { photoKey } : {}),
    };

    return (
        <FormModal
            open
            title={location ? t('standorte.locations.detail.title') : t('standorte.locations.new.title')}
            submitLabel={location ? t('standorte.locations.detail.save') : t('standorte.locations.new.submit')}
            cancelLabel={t('standorte.locations.new.cancel')}
            canSubmit={!!draft.name.trim()}
            onClose={onClose}
            onSubmit={async () => {
                try {
                    await apiFetch(location ? `/locations/${location.id}?clubId=${clubId}` : `/locations?clubId=${clubId}`, {
                        method: location ? 'PATCH' : 'POST',
                        body,
                    });
                } catch (err) {
                    // A rejected photo key (quota, already used, foreign) is explained as such; everything else as usual.
                    return typeof photoKey === 'string' && err instanceof ApiError && err.status === 422 ? t(mediaErrorKey(err)) : errorMessage(err, t);
                }
                onSaved();
                return null;
            }}
        >
            <div className="flex flex-wrap items-center gap-3">
                <LocationPhoto url={shownPhoto} className="h-20 w-28 shrink-0 overflow-hidden rounded-lg" />
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setPickingPhoto(true)} className={secondaryButtonClass}>
                        <Camera className="h-4 w-4" aria-hidden="true" />
                        {shownPhoto ? t('standorte.locations.photo.change') : t('standorte.locations.photo.add')}
                    </button>
                    {shownPhoto && (
                        <button type="button" onClick={() => { setPhotoKey(null); setPreview(null); }} className={secondaryButtonClass}>
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            {t('standorte.locations.photo.remove')}
                        </button>
                    )}
                </div>
                {!shownPhoto && <p className="w-full text-xs text-muted-foreground">{t('standorte.locations.photo.none')}</p>}
            </div>
            {pickingPhoto && (
                <MemberPhotoDialog
                    title={t('standorte.locations.photo.title')}
                    hint={t('standorte.locations.photo.hint')}
                    round={false}
                    maxBytes={MEDIA_IMAGE_MAX_BYTES}
                    outputSize={LOCATION_PHOTO_OUTPUT_SIZE}
                    onClose={() => setPickingPhoto(false)}
                    onSave={uploadPhoto}
                />
            )}
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
    const photoExpired = useThrottledCallback(onChange);

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
                            <LocationPhoto url={loc.photoUrl} className="h-36 w-full" onExpired={photoExpired} />
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

// --- WiFi ---------------------------------------------------------------------------

function WifiQrModal({ network, t, onClose }: { network: WifiNetwork; t: T; onClose: () => void }) {
    const security = securityOf(network);
    return (
        <Modal open onClose={onClose} title={network.label}>
            <div className="flex flex-col items-center gap-4">
                {/* White quiet zone keeps the code scannable in dark mode. The code is drawn in the browser, the payload goes nowhere else. */}
                <div className="rounded-xl bg-white p-4" role="img" aria-label={t('standorte.wifi.qr.alt', { name: network.ssid })}>
                    <QRCodeSVG value={wifiQrValue(network)} size={240} marginSize={0} />
                </div>
                <Chip tone={security === 'open' ? 'warning' : 'primary'}>{t(`standorte.wifi.security.${security}`)}</Chip>
                <p className="text-center text-xs text-muted-foreground">{t('standorte.wifi.qr.hint')}</p>
                <dl className="w-full space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
                        <dt className="text-muted-foreground">{t('standorte.wifi.ssid')}</dt>
                        <dd className="flex min-w-0 items-center gap-1 font-medium text-foreground">
                            <span className="truncate">{network.ssid}</span>
                            <CopyButton value={network.ssid} t={t} />
                        </dd>
                    </div>
                    {wifiNeedsPassword(security) && network.password && (
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

function VisibilityField({ value, onChange, t }: { value: LocationVisibility; onChange: (value: LocationVisibility) => void; t: T }) {
    return (
        <Field label={t('standorte.visibility.label')}>
            <select value={value} onChange={(e) => onChange(e.target.value as LocationVisibility)} className={inputClass}>
                {LOCATION_VISIBILITIES.map((v) => (
                    <option key={v} value={v}>
                        {t(`standorte.visibility.${v}`)}
                    </option>
                ))}
            </select>
            <span className="mt-1 block text-xs font-normal text-muted-foreground">{t(`standorte.visibility.${value}.hint`)}</span>
        </Field>
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
    const run = useRun();
    const [label, setLabel] = useState(network?.label ?? '');
    const [ssid, setSsid] = useState(network?.ssid ?? '');
    const [security, setSecurity] = useState<WifiSecurity>(network ? securityOf(network) : 'wpa');
    const [password, setPassword] = useState(network?.password ?? '');
    const needsPassword = wifiNeedsPassword(security);
    const [visibility, setVisibility] = useState<LocationVisibility>(network ? visibilityOf(network) : 'mitglied');

    return (
        <FormModal
            open
            title={network ? t('standorte.wifi.edit.title') : t('standorte.wifi.new.title')}
            submitLabel={network ? t('standorte.wifi.save') : t('standorte.wifi.submit')}
            cancelLabel={t('standorte.wifi.cancel')}
            canSubmit={!!label.trim() && !!ssid.trim() && (!needsPassword || !!password.trim())}
            onClose={onClose}
            onSubmit={() =>
                run(async () => {
                    await apiFetch(network ? `/locations/${locationId}/wifi/${network.id}?clubId=${clubId}` : `/locations/${locationId}/wifi?clubId=${clubId}`, {
                        method: network ? 'PATCH' : 'POST',
                        body: { label: label.trim(), ssid: ssid.trim(), security, password: wifiPasswordFor(security, password), visibility },
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
                <Field label={t('standorte.wifi.security')}>
                    <select value={security} onChange={(e) => setSecurity(e.target.value as WifiSecurity)} className={inputClass}>
                        {WIFI_SECURITIES.map((s) => (
                            <option key={s} value={s}>
                                {t(`standorte.wifi.security.${s}`)}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>
            {needsPassword ? (
                <Field label={t('standorte.wifi.password')}>
                    <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} required className={`${inputClass} font-mono`} />
                </Field>
            ) : (
                <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">{t('standorte.wifi.security.open.hint')}</p>
            )}
            <VisibilityField value={visibility} onChange={setVisibility} t={t} />
            <p className="text-xs text-muted-foreground">{t('standorte.wifi.hint')}</p>
        </FormModal>
    );
}

function WifiSection({ locationId, clubId, canWrite, t }: { locationId: string; clubId: string; canWrite: boolean; t: T }) {
    const run = useRun();
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
                <LoadingText />
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
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        <Chip tone={securityOf(net) === 'open' ? 'warning' : 'muted'}>{t(`standorte.wifi.security.${securityOf(net)}`)}</Chip>
                                        {canWrite && <Chip tone="primary">{t(`standorte.visibility.${visibilityOf(net)}`)}</Chip>}
                                    </div>
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
                                {wifiNeedsPassword(securityOf(net)) && (
                                    <div className="flex items-center justify-between gap-2">
                                        <dt className="text-muted-foreground">{t('standorte.wifi.password')}</dt>
                                        <dd className="flex min-w-0 items-center gap-1 font-mono text-foreground">
                                            <span className="truncate">{net.password}</span>
                                            <CopyButton value={net.password} t={t} />
                                        </dd>
                                    </div>
                                )}
                            </dl>
                            <button
                                onClick={() => setQrFor(net)}
                                disabled={wifiNeedsPassword(securityOf(net)) && !net.password}
                                className={`${secondaryButtonClass} mt-3 w-full justify-center`}
                            >
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
    const run = useRun();
    const [title, setTitle] = useState(link?.title ?? '');
    const [url, setUrl] = useState(link?.url ?? '');
    const [icon, setIcon] = useState(link?.icon ?? '');
    const [visibility, setVisibility] = useState<LocationVisibility>(link ? visibilityOf(link) : 'mitglied');

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
                        body: { title: title.trim(), url: url.trim(), icon: icon.trim() || (link ? null : undefined), visibility },
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
            <VisibilityField value={visibility} onChange={setVisibility} t={t} />
        </FormModal>
    );
}

function LinksSection({ locationId, clubId, canWrite, t }: { locationId: string; clubId: string; canWrite: boolean; t: T }) {
    const run = useRun();
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
                <LoadingText />
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
                                {canWrite && <Chip tone="primary">{t(`standorte.visibility.${visibilityOf(link)}`)}</Chip>}
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
    canWrite,
    t,
    onBack,
    onLocationsChanged,
}: {
    clubId: string;
    locationId: string;
    canWrite: boolean;
    t: T;
    onBack: () => void;
    onLocationsChanged: () => void;
}) {
    const run = useRun();
    const [location, setLocation] = useState<LocationDetailData | null>(null);
    const [editing, setEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [loadFailed, setLoadFailed] = useState(false);

    async function load() {
        try {
            const { data } = await apiFetch<{ data: LocationDetailData }>(`/locations/${locationId}?clubId=${clubId}`);
            setLocation(data);
            setLoadFailed(false);
        } catch {
            setLoadFailed(true);
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locationId]);
    const photoExpired = useThrottledCallback(load);

    if (!location)
        return (
            <div className="space-y-4">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    {t('standorte.locations.back')}
                </button>
                {loadFailed ? <LoadError onRetry={() => void load()} /> : <LoadingText />}
            </div>
        );

    return (
        <div className="space-y-4">
            <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                <ArrowLeft className="h-4 w-4" />
                {t('standorte.locations.back')}
            </button>

            <div className="overflow-hidden rounded-xl border border-border bg-card">
                {location.photoUrl && <LocationPhoto url={location.photoUrl} className="h-48 w-full sm:h-64" onExpired={photoExpired} />}
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
                    {location.accessRestricted && !location.accessNote && (
                        <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">{t('standorte.locations.accessRestricted')}</p>
                    )}
                    {location.accessNote && (
                        <div className="rounded-lg bg-muted/50 p-3">
                            <p className="text-xs font-medium text-muted-foreground">{t('standorte.locations.detail.accessNote')}</p>
                            <p className="mt-1 whitespace-pre-line text-sm text-foreground">{location.accessNote}</p>
                        </div>
                    )}
                </div>
            </div>

            <WifiSection locationId={locationId} clubId={clubId} canWrite={canWrite} t={t} />
            {!location.accessRestricted && <KeyManagement key={location.id} location={location} clubId={clubId} canWrite={canWrite} t={t} onChange={() => void load()} />}
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
    const [selectedId, setSelectedId] = useState<string | null>(null);

    return selectedId ? (
        <LocationDetail
            clubId={clubId}
            locationId={selectedId}
            canWrite={canWrite}
            t={t}
            onBack={() => setSelectedId(null)}
            onLocationsChanged={onLocationsChanged}
        />
    ) : (
        <LocationGrid clubId={clubId} locations={locations} canWrite={canWrite} t={t} onChange={onLocationsChanged} onSelect={setSelectedId} />
    );
}
