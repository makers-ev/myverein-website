'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api-client';
import { useThrottledCallback } from '@/lib/useThrottledCallback';
import { memberErrorKey } from '@/lib/clubMembers';
import { type ClubTab, formsGate, visibleTabs } from '@/lib/clubPermissions';
import { useLanguage } from '@/contexts/LanguageContext';
import ApplicationsPanel from '@/components/verein/ApplicationsPanel';
import NoClubSection from '@/components/verein/NoClubSection';
import CategoriesPanel from '@/components/verein/CategoriesPanel';
import ClubSettingsPanel from '@/components/verein/ClubSettingsPanel';
import ClubStatsPanel from '@/components/verein/ClubStatsPanel';
import CustomFieldsPanel from '@/components/verein/CustomFieldsPanel';
import FormsPanel from '@/components/verein/FormsPanel';
import ExitQueuePanel from '@/components/verein/ExitQueuePanel';
import MemberList from '@/components/verein/MemberList';
import MemberAvatar from '@/components/verein/MemberAvatar';
import RoleBadge from '@/components/verein/RoleBadge';
import ProfilTab, { type OwnMembership } from '@/components/verein/ProfilTab';
import LoadingText from '@/components/LoadingText';
import { useConfirm } from '@/components/useConfirm';
import LoadError from '@/components/LoadError';

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
    /** Signed short-lived URL; only for own row / members:write / read_sensitive, else `null`. */
    photoUrl?: string | null;
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

type Tab = ClubTab;

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-bold text-foreground">{title}</h2>
            {children}
        </div>
    );
}

function VereinsinfoTab({ info, t, onPhotoExpired }: { info: ClubInfo; t: (key: string) => string; onPhotoExpired: () => void }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <SectionCard title={t('verein.info.board')}>
                {info.board.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('verein.info.board.empty')}</p>
                ) : (
                    <ul className="space-y-2">
                        {info.board.map((m) => (
                            <li key={m.memberId} className="flex items-center justify-between gap-2">
                                <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                                    <MemberAvatar name={m.name} photoUrl={m.photoUrl} onExpired={onPhotoExpired} />
                                    <span className="truncate">{m.name ?? '—'}</span>
                                </span>
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

function AbteilungenTab({
    departments,
    clubId,
    canEdit,
    t,
    onChange,
}: {
    departments: Department[];
    clubId: string;
    canEdit: boolean;
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
            setError(t(memberErrorKey(err)));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="space-y-4">
            {canEdit && (
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
            )}
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
    const [clubsError, setClubsError] = useState(false);
    const [info, setInfo] = useState<ClubInfo | null>(null);
    const [me, setMe] = useState<OwnMembership | null>(null);
    const [tab, setTab] = useState<Tab>('info');
    // Number of open applications (badge on the "Mitglieder" tab); the panel itself pages through them.
    const [applicationsTotal, setApplicationsTotal] = useState<number | null>(null);
    // Open exit requests (badge on the "Austritte" tab); null = unknown / no permission.
    const [exitPending, setExitPending] = useState<number | null>(null);
    // Bumped whenever the member list must reload (an application was decided, ...).
    const [membersReload, setMembersReload] = useState(0);
    // The form editor holds unsaved changes (guards the tab switch).
    const [formsDirty, setFormsDirty] = useState(false);
    const onFormsDirty = useCallback((dirty: boolean) => setFormsDirty(dirty), []);
    // Own custom field edits in "Mein Profil" (separate save button).
    const [profilDirty, setProfilDirty] = useState(false);
    const onProfilDirty = useCallback((dirty: boolean) => setProfilDirty(dirty), []);
    const { confirm, dialog: confirmDialog } = useConfirm();

    const activeClub = clubs?.[0] ?? null;

    // Signed photo URLs expire: a failed image load refetches only the resource that carried the URL, throttled.
    const refetchBoardPhotos = useThrottledCallback(async () => {
        if (!activeClub) return;
        const res = await apiFetch<{ data: ClubInfo }>(`/club-info?clubId=${activeClub.clubId}`);
        setInfo(res.data);
    });
    const refetchOwnPhoto = useThrottledCallback(async () => {
        if (!activeClub) return;
        const res = await apiFetch<{ data: OwnMembership }>(`/club-members/me?clubId=${activeClub.clubId}`);
        setMe(res.data);
    });

    function loadClubs() {
        apiFetch<{ data: MyClub[] }>('/my-clubs')
            .then(({ data }) => {
                setClubs(data);
                setClubsError(false);
            })
            .catch(() => setClubsError(true));
    }

    // setClubs runs inside the .then() callback, not synchronously in the effect body.
    useEffect(loadClubs, []);

    async function refreshClubData(clubId: string) {
        const [infoRes, meRes] = await Promise.all([
            apiFetch<{ data: ClubInfo }>(`/club-info?clubId=${clubId}`),
            apiFetch<{ data: OwnMembership }>(`/club-members/me?clubId=${clubId}`),
        ]);
        setInfo(infoRes.data);
        setMe(meRes.data);
        setMembersReload((n) => n + 1);
        // Open applications are only readable with members:write.
        if (meRes.data.permissions.includes('members:write')) {
            try {
                const appsRes = await apiFetch<{ total: number }>(`/club-applications?clubId=${clubId}&pageSize=1`);
                setApplicationsTotal(appsRes.total);
            } catch {
                setApplicationsTotal(null);
            }
            try {
                const exitRes = await apiFetch<{ total: number }>(`/club-exit-requests?clubId=${clubId}&status=pending&pageSize=1`);
                setExitPending(exitRes.total);
            } catch {
                setExitPending(null);
            }
        } else {
            setApplicationsTotal(null);
            setExitPending(null);
        }
    }

    useEffect(() => {
        if (!activeClub) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void refreshClubData(activeClub.clubId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeClub?.clubId]);

    const permissions = me?.permissions ?? [];
    const gate = formsGate(permissions);
    // Every tab beyond the basics hangs on a permission from GET /club-members/me (the backend enforces them too).
    // Guardians (external role) have no right to the member list; hide the tab instead of showing a 403.
    const tabs: Tab[] = visibleTabs(permissions, me?.roles ?? []);
    const currentTab: Tab = tabs.includes(tab) ? tab : 'info';

    async function selectTab(next: Tab) {
        // Unsaved edits (form editor, own custom fields) survive only inside their tab: leaving it needs a confirmation.
        const unsaved = next !== currentTab && ((currentTab === 'formulare' && formsDirty) || (currentTab === 'profil' && profilDirty));
        if (unsaved && !(await confirm({ title: t('forms.editor.leave.title'), body: t(currentTab === 'formulare' ? 'forms.editor.leaveConfirm' : 'forms.cf.values.leaveConfirm'), confirmLabel: t('forms.editor.leave.confirm'), danger: true }))) return;
        setTab(next);
    }

    return (
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-foreground">
                {activeClub?.clubName ?? t('verein.page.title')}
            </h1>

            {clubsError ? (
                <LoadError className="mt-6" onRetry={loadClubs} />
            ) : clubs === null ? (
                <LoadingText className="mt-6" />
            ) : !activeClub ? (
                <NoClubSection onRefreshClubs={loadClubs} />
            ) : (
                <>
                    <div className="mt-6 flex gap-2 overflow-x-auto border-b border-border">
                        {tabs.map((value) => (
                            <button
                                key={value}
                                type="button"
                                aria-current={currentTab === value ? 'page' : undefined}
                                onClick={() => void selectTab(value)}
                                className={`whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                                    currentTab === value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {t(`verein.tab.${value}`)}
                                {value === 'austritte' && exitPending !== null && exitPending > 0 && (
                                    <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                                        {exitPending}
                                    </span>
                                )}
                                {value === 'mitglieder' && applicationsTotal !== null && applicationsTotal > 0 && (
                                    <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                                        {applicationsTotal}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="mt-4">
                        {currentTab === 'info' && (info ? <VereinsinfoTab info={info} t={t} onPhotoExpired={refetchBoardPhotos} /> : <LoadingText />)}
                        {currentTab === 'profil' &&
                            (me ? (
                                <ProfilTab me={me} clubId={activeClub.clubId} onDirtyChange={onProfilDirty} onSaved={() => void refreshClubData(activeClub.clubId)} onPhotoExpired={refetchOwnPhoto} />
                            ) : (
                                <LoadingText />
                            ))}
                        {currentTab === 'mitglieder' && permissions.includes('members:write') && (
                            <ApplicationsPanel
                                clubId={activeClub.clubId}
                                onDecided={() => refreshClubData(activeClub.clubId)}
                            />
                        )}
                        {currentTab === 'mitglieder' &&
                            (me && info ? (
                                <MemberList
                                    clubId={activeClub.clubId}
                                    permissions={permissions}
                                    departments={info.departments.map((d) => ({ id: d.id, name: d.name }))}
                                    reloadToken={membersReload}
                                />
                            ) : (
                                <LoadingText />
                            ))}
                        {currentTab === 'austritte' && permissions.includes('members:write') && (
                            <ExitQueuePanel
                                clubId={activeClub.clubId}
                                ownMemberId={me?.memberId ?? null}
                                ownClubMemberId={me?.clubMemberId ?? null}
                                canProtectedExit={permissions.includes('roles:write')}
                                onChanged={() => void refreshClubData(activeClub.clubId)}
                            />
                        )}
                        {currentTab === 'abteilungen' &&
                            (info ? (
                                <AbteilungenTab
                                    departments={info.departments}
                                    clubId={activeClub.clubId}
                                    canEdit={permissions.includes('departments:write')}
                                    t={t}
                                    onChange={() => void refreshClubData(activeClub.clubId)}
                                />
                            ) : (
                                <LoadingText />
                            ))}
                        {currentTab === 'kennzahlen' && <ClubStatsPanel clubId={activeClub.clubId} />}
                        {currentTab === 'formulare' && gate.manage && <FormsPanel clubId={activeClub.clubId} permissions={permissions} onDirtyChange={onFormsDirty} />}
                        {currentTab === 'zusatzfelder' && gate.manage && <CustomFieldsPanel clubId={activeClub.clubId} permissions={permissions} />}
                        {currentTab === 'einstellungen' && (
                            <div className="space-y-6">
                                <ClubSettingsPanel clubId={activeClub.clubId} />
                                <CategoriesPanel clubId={activeClub.clubId} onChanged={() => setMembersReload((n) => n + 1)} />
                            </div>
                        )}
                    </div>
                </>
            )}
            {confirmDialog}
        </div>
    );
}
