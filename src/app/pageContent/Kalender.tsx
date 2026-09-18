'use client';

import { useEffect, useMemo, useState } from 'react';

import { apiFetch, ApiError } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { getDepartmentColor } from '@/theme/departmentColors';
import TreffenPanel from '@/components/kalender/TreffenPanel';

interface MyClub {
    clubId: string;
    memberId: string;
    clubName: string | null;
    orgRole: string;
}

interface Department {
    id: string;
    clubId: string;
    name: string;
    leadMemberId: string | null;
}

interface Calendar {
    id: string;
    clubId: string;
    departmentId: string | null;
    name: string;
    isDefault: boolean;
    icalImportUrl: string | null;
}

interface CalendarVisibility {
    id: string;
    calendarId: string;
    memberId: string | null;
    roleType: string | null;
    departmentId: string | null;
}

interface CalendarEvent {
    id: string;
    calendarId: string;
    title: string;
    description: string | null;
    startsAt: string;
    endsAt: string;
    category: string | null;
    capacity: number | null;
}

type Tab = 'termine' | 'treffen';

const CLUB_ROLE_TYPES = [
    'vorsitz',
    'stellv_vorsitz',
    'kassenwart',
    'schriftfuehrer',
    'beisitzer',
    'abteilungsleitung',
    'trainer',
    'erziehungsberechtigt',
] as const;

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-bold text-foreground">{title}</h2>
            {children}
        </div>
    );
}

function VisibilityRow({
    grant,
    departments,
    t,
    onRemove,
}: {
    grant: CalendarVisibility;
    departments: Department[];
    t: (key: string) => string;
    onRemove: () => void;
}) {
    const label = grant.memberId
        ? `${t('kalender.calendars.visibility.member')}: ${grant.memberId}`
        : grant.roleType
          ? `${t('kalender.calendars.visibility.role')}: ${t(`verein.role.${grant.roleType}`)}`
          : `${t('kalender.calendars.visibility.department')}: ${departments.find((d) => d.id === grant.departmentId)?.name ?? grant.departmentId}`;

    return (
        <li className="flex items-center justify-between gap-2 text-xs text-foreground">
            <span>{label}</span>
            <button onClick={onRemove} className="text-destructive hover:underline">
                {t('kalender.calendars.visibility.remove')}
            </button>
        </li>
    );
}

function CalendarCard({
    calendar,
    departments,
    clubId,
    t,
    colorIndex,
}: {
    calendar: Calendar;
    departments: Department[];
    clubId: string;
    t: (key: string) => string;
    colorIndex: number;
}) {
    const [visibility, setVisibility] = useState<CalendarVisibility[] | null>(null);
    const [showVisibility, setShowVisibility] = useState(false);
    const [grantType, setGrantType] = useState<'role' | 'department'>('role');
    const [roleType, setRoleType] = useState<(typeof CLUB_ROLE_TYPES)[number]>('vorsitz');
    const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? '');
    const [error, setError] = useState<string | null>(null);

    async function loadVisibility() {
        try {
            const { data } = await apiFetch<{ data: CalendarVisibility[] }>(`/calendars/${calendar.id}/visibility?clubId=${clubId}`);
            setVisibility(data);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    async function handleAddGrant() {
        setError(null);
        try {
            const body = grantType === 'role' ? { roleType } : { departmentId };
            await apiFetch(`/calendars/${calendar.id}/visibility?clubId=${clubId}`, { method: 'POST', body });
            await loadVisibility();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    async function handleRemoveGrant(id: string) {
        setError(null);
        try {
            await apiFetch(`/calendars/${calendar.id}/visibility/${id}?clubId=${clubId}`, { method: 'DELETE' });
            await loadVisibility();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    return (
        <li className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getDepartmentColor(colorIndex) }} />
                    <span className="font-medium text-foreground">{calendar.name}</span>
                    {calendar.isDefault && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            {t('kalender.calendars.default')}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => {
                        setShowVisibility((v) => !v);
                        if (!visibility) void loadVisibility();
                    }}
                    className="text-xs font-medium text-primary hover:underline"
                >
                    {t('kalender.calendars.visibility.title')}
                </button>
            </div>

            {showVisibility && (
                <div className="mt-2 border-t border-border pt-2">
                    {visibility === null ? (
                        <p className="text-xs text-muted-foreground">…</p>
                    ) : visibility.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t('kalender.calendars.visibility.everyone')}</p>
                    ) : (
                        <ul className="space-y-1">
                            {visibility.map((v) => (
                                <VisibilityRow key={v.id} grant={v} departments={departments} t={t} onRemove={() => void handleRemoveGrant(v.id)} />
                            ))}
                        </ul>
                    )}

                    <div className="mt-2 flex items-center gap-1.5">
                        <select
                            value={grantType}
                            onChange={(e) => setGrantType(e.target.value as 'role' | 'department')}
                            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                        >
                            <option value="role">{t('kalender.calendars.visibility.role')}</option>
                            <option value="department">{t('kalender.calendars.visibility.department')}</option>
                        </select>
                        {grantType === 'role' ? (
                            <select
                                value={roleType}
                                onChange={(e) => setRoleType(e.target.value as (typeof CLUB_ROLE_TYPES)[number])}
                                className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                            >
                                {CLUB_ROLE_TYPES.map((rt) => (
                                    <option key={rt} value={rt}>
                                        {t(`verein.role.${rt}`)}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <select
                                value={departmentId}
                                onChange={(e) => setDepartmentId(e.target.value)}
                                className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                            >
                                {departments.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                        )}
                        <button
                            onClick={() => void handleAddGrant()}
                            disabled={grantType === 'department' && !departmentId}
                            className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                        >
                            {t('kalender.calendars.visibility.add')}
                        </button>
                    </div>
                    {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
                </div>
            )}
        </li>
    );
}

function CalendarManager({
    calendars,
    departments,
    clubId,
    t,
    onChange,
}: {
    calendars: Calendar[];
    departments: Department[];
    clubId: string;
    t: (key: string) => string;
    onChange: () => void;
}) {
    const [name, setName] = useState('');
    const [departmentId, setDepartmentId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            await apiFetch(`/calendars?clubId=${clubId}`, {
                method: 'POST',
                body: { name: name.trim(), ...(departmentId ? { departmentId } : {}) },
            });
            setName('');
            setDepartmentId('');
            onChange();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <SectionCard title={t('kalender.calendars.title')}>
            <form onSubmit={(e) => void handleCreate(e)} className="mb-3 flex flex-wrap items-center gap-2">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('kalender.calendars.new.name')}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                    <option value="">{t('kalender.calendars.new.department.none')}</option>
                    {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                            {d.name}
                        </option>
                    ))}
                </select>
                <button
                    type="submit"
                    disabled={submitting || !name.trim()}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                    {t('kalender.calendars.new.submit')}
                </button>
            </form>
            {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

            {calendars.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('kalender.calendars.empty')}</p>
            ) : (
                <ul className="space-y-2">
                    {calendars.map((cal) => {
                        const index = cal.departmentId ? departments.findIndex((d) => d.id === cal.departmentId) : -1;
                        return (
                            <CalendarCard
                                key={cal.id}
                                calendar={cal}
                                departments={departments}
                                clubId={clubId}
                                t={t}
                                colorIndex={index}
                            />
                        );
                    })}
                </ul>
            )}
        </SectionCard>
    );
}

function EventsList({
    events,
    calendars,
    departments,
    clubId,
    t,
    onChange,
}: {
    events: CalendarEvent[];
    calendars: Calendar[];
    departments: Department[];
    clubId: string;
    t: (key: string) => string;
    onChange: () => void;
}) {
    const [showCreate, setShowCreate] = useState(false);
    const [calendarId, setCalendarId] = useState(calendars[0]?.id ?? '');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [startsAt, setStartsAt] = useState('');
    const [endsAt, setEndsAt] = useState('');
    const [capacity, setCapacity] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [rsvpState, setRsvpState] = useState<Record<string, 'angemeldet' | 'warteliste'>>({});

    const colorByCalendarId = useMemo(() => {
        const map = new Map<string, string>();
        for (const cal of calendars) {
            const index = cal.departmentId ? departments.findIndex((d) => d.id === cal.departmentId) : -1;
            map.set(cal.id, getDepartmentColor(index === -1 ? null : index));
        }
        return map;
    }, [calendars, departments]);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!calendarId || !title.trim() || !startsAt) return;
        setSubmitting(true);
        setError(null);
        try {
            await apiFetch(`/events?clubId=${clubId}`, {
                method: 'POST',
                body: {
                    calendarId,
                    title: title.trim(),
                    description: description.trim() || undefined,
                    category: category.trim() || undefined,
                    startsAt: new Date(startsAt).toISOString(),
                    endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
                    capacity: capacity ? Number(capacity) : undefined,
                },
            });
            setTitle('');
            setDescription('');
            setCategory('');
            setStartsAt('');
            setEndsAt('');
            setCapacity('');
            setShowCreate(false);
            onChange();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleRsvp(eventId: string) {
        setError(null);
        try {
            const { status } = await apiFetch<{ status: 'angemeldet' | 'warteliste' }>(`/events/${eventId}/rsvp?clubId=${clubId}`, {
                method: 'POST',
            });
            setRsvpState((prev) => ({ ...prev, [eventId]: status }));
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    async function handleCancel(eventId: string) {
        setError(null);
        try {
            await apiFetch(`/events/${eventId}/rsvp?clubId=${clubId}`, { method: 'DELETE' });
            setRsvpState((prev) => {
                const next = { ...prev };
                delete next[eventId];
                return next;
            });
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Request failed');
        }
    }

    return (
        <SectionCard title={t('kalender.events.title')}>
            {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

            {events.length === 0 ? (
                <p className="mb-3 text-sm text-muted-foreground">{t('kalender.events.empty')}</p>
            ) : (
                <ul className="mb-3 space-y-2">
                    {events.map((ev) => (
                        <li
                            key={ev.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                            style={{ borderLeftWidth: 4, borderLeftColor: colorByCalendarId.get(ev.calendarId) }}
                        >
                            <div>
                                <p className="font-medium text-foreground">{ev.title}</p>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(ev.startsAt).toLocaleString('de-DE')}
                                    {ev.category ? ` · ${ev.category}` : ''}
                                    {ev.capacity != null ? ` · ${ev.capacity}` : ''}
                                </p>
                            </div>
                            {rsvpState[ev.id] ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-success">
                                        {rsvpState[ev.id] === 'angemeldet' ? t('kalender.events.rsvp.confirmed') : t('kalender.events.rsvp.waitlist')}
                                    </span>
                                    <button onClick={() => void handleCancel(ev.id)} className="text-xs text-destructive hover:underline">
                                        {t('kalender.events.rsvp.cancel')}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => void handleRsvp(ev.id)}
                                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                                >
                                    {t('kalender.events.rsvp')}
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {showCreate ? (
                <form onSubmit={(e) => void handleCreate(e)} className="space-y-2 rounded-lg border border-border p-3">
                    <div className="flex flex-wrap gap-2">
                        <select
                            value={calendarId}
                            onChange={(e) => setCalendarId(e.target.value)}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                        >
                            {calendars.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('kalender.events.new.title')}
                            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('kalender.events.new.description')}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                    />
                    <div className="flex flex-wrap gap-2">
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder={t('kalender.events.new.category')}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                        <input
                            type="number"
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value)}
                            placeholder={t('kalender.events.new.capacity')}
                            className="w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="text-xs text-muted-foreground">
                            {t('kalender.events.new.startsAt')}
                            <input
                                type="datetime-local"
                                value={startsAt}
                                onChange={(e) => setStartsAt(e.target.value)}
                                className="ml-2 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                            />
                        </label>
                        <label className="text-xs text-muted-foreground">
                            {t('kalender.events.new.endsAt')}
                            <input
                                type="datetime-local"
                                value={endsAt}
                                onChange={(e) => setEndsAt(e.target.value)}
                                className="ml-2 rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground"
                            />
                        </label>
                        <button
                            type="submit"
                            disabled={submitting || !calendarId || !title.trim() || !startsAt}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                        >
                            {t('kalender.events.new.submit')}
                        </button>
                    </div>
                </form>
            ) : (
                calendars.length > 0 && (
                    <button onClick={() => setShowCreate(true)} className="text-sm font-medium text-primary hover:underline">
                        {t('kalender.events.new')}
                    </button>
                )
            )}
        </SectionCard>
    );
}

export default function KalenderPageContent() {
    const { t } = useLanguage();
    const [clubs, setClubs] = useState<MyClub[] | null>(null);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [calendars, setCalendars] = useState<Calendar[] | null>(null);
    const [events, setEvents] = useState<CalendarEvent[] | null>(null);
    const [tab, setTab] = useState<Tab>('termine');

    const activeClub = clubs?.[0] ?? null;

    useEffect(() => {
        void apiFetch<{ data: MyClub[] }>('/my-clubs').then(({ data }) => setClubs(data));
    }, []);

    async function refreshData(clubId: string) {
        const [infoRes, calendarsRes, eventsRes] = await Promise.all([
            apiFetch<{ data: { departments: Department[] } }>(`/club-info?clubId=${clubId}`),
            apiFetch<{ data: Calendar[] }>(`/calendars?clubId=${clubId}`),
            apiFetch<{ data: CalendarEvent[] }>(`/events?clubId=${clubId}`),
        ]);
        setDepartments(infoRes.data.departments);
        setCalendars(calendarsRes.data);
        setEvents(eventsRes.data);
    }

    useEffect(() => {
        if (!activeClub) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void refreshData(activeClub.clubId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeClub?.clubId]);

    return (
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-foreground">{t('kalender.page.title')}</h1>

            {clubs === null ? (
                <p className="mt-6 text-sm text-muted-foreground">…</p>
            ) : !activeClub ? (
                <div className="mt-6 rounded-xl border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">{t('verein.no-club.title')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t('verein.no-club.body')}</p>
                </div>
            ) : (
                <>
                    <div className="mt-6 flex gap-2 border-b border-border">
                        {(['termine', 'treffen'] as const).map((value) => (
                            <button
                                key={value}
                                onClick={() => setTab(value)}
                                className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                                    tab === value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {t(`kalender.tab.${value}`)}
                            </button>
                        ))}
                    </div>

                    <div className="mt-4 space-y-4">
                        {tab === 'termine' &&
                            (calendars && events ? (
                                <>
                                    <CalendarManager
                                        calendars={calendars}
                                        departments={departments}
                                        clubId={activeClub.clubId}
                                        t={t}
                                        onChange={() => void refreshData(activeClub.clubId)}
                                    />
                                    <EventsList
                                        events={events}
                                        calendars={calendars}
                                        departments={departments}
                                        clubId={activeClub.clubId}
                                        t={t}
                                        onChange={() => void refreshData(activeClub.clubId)}
                                    />
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">…</p>
                            ))}
                        {tab === 'treffen' && <TreffenPanel clubId={activeClub.clubId} />}
                    </div>
                </>
            )}
        </div>
    );
}
