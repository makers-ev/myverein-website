'use client';

import { useEffect, useState } from 'react';

import { apiFetch, ApiError } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';

interface MyClub {
    clubId: string;
    memberId: string;
    clubName: string | null;
    orgRole: string;
}

interface BoardMember {
    memberId: string;
    name: string | null;
    roleType: string;
    termEndsAt: string | null;
}

interface Department {
    id: string;
    clubId: string;
    name: string;
    leadMemberId: string | null;
}

interface ClubInfoPage {
    id: string;
    clubId: string;
    slug: string;
    title: string;
}

interface ClubInfo {
    board: BoardMember[];
    departments: Department[];
    pages: ClubInfoPage[];
}

interface ClubMemberRole {
    id: string;
    roleType: string;
    departmentId: string | null;
    termEndsAt: string | null;
}

interface ClubMember {
    id: string;
    userId: string;
    name: string | null;
    email: string | null;
    category: string | null;
    joinedAt: string | null;
    roles: ClubMemberRole[];
}

type Tab = 'info' | 'mitglieder' | 'abteilungen';

function RoleBadge({ roleType }: { roleType: string }) {
    const { t } = useLanguage();
    return (
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {t(`verein.role.${roleType}`)}
        </span>
    );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-bold text-foreground">{title}</h2>
            {children}
        </div>
    );
}

function VereinsinfoTab({ info, t }: { info: ClubInfo; t: (key: string) => string }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <SectionCard title={t('verein.info.board')}>
                {info.board.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('verein.info.board.empty')}</p>
                ) : (
                    <ul className="space-y-2">
                        {info.board.map((m) => (
                            <li key={m.memberId} className="flex items-center justify-between gap-2">
                                <span className="text-sm text-foreground">{m.name ?? '—'}</span>
                                <RoleBadge roleType={m.roleType} />
                            </li>
                        ))}
                    </ul>
                )}
            </SectionCard>

            <SectionCard title={t('verein.info.pages')}>
                {info.pages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('verein.info.pages.empty')}</p>
                ) : (
                    <ul className="space-y-2">
                        {info.pages.map((p) => (
                            <li key={p.id} className="text-sm text-foreground">
                                {p.title}
                            </li>
                        ))}
                    </ul>
                )}
            </SectionCard>
        </div>
    );
}

function MitgliederTab({ members, t }: { members: ClubMember[]; t: (key: string) => string }) {
    if (members.length === 0) {
        return <p className="text-sm text-muted-foreground">{t('verein.members.empty')}</p>;
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2">{t('verein.members.table.name')}</th>
                        <th className="px-3 py-2">{t('verein.members.table.category')}</th>
                        <th className="px-3 py-2">{t('verein.members.table.roles')}</th>
                        <th className="px-3 py-2">{t('verein.members.table.joined')}</th>
                    </tr>
                </thead>
                <tbody>
                    {members.map((m) => (
                        <tr key={m.id} className="border-b border-border last:border-b-0">
                            <td className="px-3 py-2 text-foreground">{m.name ?? '—'}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                                {m.category ? t(`verein.category.${m.category}`) : '—'}
                            </td>
                            <td className="px-3 py-2">
                                <div className="flex flex-wrap gap-1">
                                    {m.roles.map((r) => (
                                        <RoleBadge key={r.id} roleType={r.roleType} />
                                    ))}
                                </div>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                                {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('de-DE') : '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function AbteilungenTab({
    departments,
    clubId,
    t,
    onChange,
}: {
    departments: Department[];
    clubId: string;
    t: (key: string) => string;
    onChange: () => void;
}) {
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            await apiFetch(`/departments?clubId=${clubId}`, { method: 'POST', body: { name: name.trim() } });
            setName('');
            onChange();
        } catch (err) {
            // ForbiddenError surfaces here for a caller without
            // departments:write -- shown inline instead of a silent no-op,
            // so a non-board member understands why the form didn't work.
            setError(err instanceof ApiError ? err.message : 'Request failed');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="space-y-4">
            <form onSubmit={(e) => void handleCreate(e)} className="flex gap-2">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('verein.departments.new.placeholder')}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={submitting || !name.trim()}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                    {t('verein.departments.new.submit')}
                </button>
            </form>
            {error && <p className="text-sm text-destructive">{error}</p>}

            {departments.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('verein.departments.empty')}</p>
            ) : (
                <ul className="space-y-2">
                    {departments.map((d) => (
                        <li key={d.id} className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground">
                            {d.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function VereinPageContent() {
    const { t } = useLanguage();
    const [clubs, setClubs] = useState<MyClub[] | null>(null);
    const [info, setInfo] = useState<ClubInfo | null>(null);
    const [members, setMembers] = useState<ClubMember[] | null>(null);
    const [tab, setTab] = useState<Tab>('info');

    const activeClub = clubs?.[0] ?? null;

    useEffect(() => {
        // setClubs runs inside the .then() callback, not synchronously in
        // the effect body, so this doesn't need the same disable comment
        // the synchronous refreshClubData effect below does.
        void apiFetch<{ data: MyClub[] }>('/my-clubs').then(({ data }) => setClubs(data));
    }, []);

    async function refreshClubData(clubId: string) {
        const [infoRes, membersRes] = await Promise.all([
            apiFetch<{ data: ClubInfo }>(`/club-info?clubId=${clubId}`),
            apiFetch<{ data: ClubMember[] }>(`/club-members?clubId=${clubId}`),
        ]);
        setInfo(infoRes.data);
        setMembers(membersRes.data);
    }

    useEffect(() => {
        if (!activeClub) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void refreshClubData(activeClub.clubId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeClub?.clubId]);

    return (
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-foreground">
                {activeClub?.clubName ?? t('verein.page.title')}
            </h1>

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
                        {(['info', 'mitglieder', 'abteilungen'] as const).map((value) => (
                            <button
                                key={value}
                                onClick={() => setTab(value)}
                                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                                    tab === value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {t(`verein.tab.${value}`)}
                            </button>
                        ))}
                    </div>

                    <div className="mt-4">
                        {tab === 'info' && (info ? <VereinsinfoTab info={info} t={t} /> : <p className="text-sm text-muted-foreground">…</p>)}
                        {tab === 'mitglieder' && (members ? <MitgliederTab members={members} t={t} /> : <p className="text-sm text-muted-foreground">…</p>)}
                        {tab === 'abteilungen' &&
                            (info ? (
                                <AbteilungenTab
                                    departments={info.departments}
                                    clubId={activeClub.clubId}
                                    t={t}
                                    onChange={() => void refreshClubData(activeClub.clubId)}
                                />
                            ) : (
                                <p className="text-sm text-muted-foreground">…</p>
                            ))}
                    </div>
                </>
            )}
        </div>
    );
}
