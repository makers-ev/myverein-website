'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api-client';
import { type AgendaItem, type AssemblyRules, type ParticipationMode, assemblyErrorKey } from '@/lib/assembly';
import { useLanguage } from '@/contexts/LanguageContext';
import { dangerBtn } from '@/components/kalender/calendarTypes';
import { SectionCard } from '@/components/standorte/ui';
import AssemblyCockpit from '@/components/assembly/AssemblyCockpit';
import AssemblyPlanning from '@/components/assembly/AssemblyPlanning';
import MinutesPanel from '@/components/assembly/MinutesPanel';
import { OnlineJoin, ParticipationCard } from '@/components/assembly/OnlineParticipation';
import { ErrorText, MemberPicker, Notice, type PickedMember } from '@/components/assembly/shared';
import LoadingText from '@/components/LoadingText';

interface ProxyRow {
    id: string;
    grantorClubMemberId: string | null;
    grantorName: string | null;
    holderClubMemberId: string | null;
    holderName: string | null;
}

interface RollMe {
    frozen: boolean;
    asOf: string;
    eligible: boolean;
    basis: string;
}

/** What every member sees of an assembly: their voting right, the announced agenda, their proxy and the online link. */
function MemberView({ clubId, meetingId, ownClubMemberId, status, mode, onlineUrl, scheduledAt }: { clubId: string; meetingId: string; ownClubMemberId: string | null; status: string; mode: ParticipationMode; onlineUrl: string | null; scheduledAt: string | null }) {
    const { t } = useLanguage();
    const [roll, setRoll] = useState<RollMe | null>(null);
    const [agenda, setAgenda] = useState<AgendaItem[] | null>(null);
    const [proxies, setProxies] = useState<ProxyRow[]>([]);
    const [rules, setRules] = useState<AssemblyRules | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        const base = `/meetings/${meetingId}`;
        const [r, a, p, ru] = await Promise.allSettled([
            apiFetch<{ data: RollMe }>(`${base}/voting-roll/me?clubId=${clubId}`),
            apiFetch<{ data: AgendaItem[] }>(`${base}/agenda-items?clubId=${clubId}`),
            apiFetch<{ data: ProxyRow[] }>(`${base}/proxies?clubId=${clubId}`),
            apiFetch<{ data: { rules: AssemblyRules } }>(`/club-settings/assembly?clubId=${clubId}`),
        ]);
        setRoll(r.status === 'fulfilled' ? r.value.data : null);
        setAgenda(a.status === 'fulfilled' ? a.value.data : []);
        setProxies(p.status === 'fulfilled' ? p.value.data : []);
        setRules(ru.status === 'fulfilled' ? ru.value.data.rules : null);
    }, [clubId, meetingId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    if (!agenda) return <LoadingText />;

    const given = proxies.find((p) => p.grantorClubMemberId === ownClubMemberId);
    const held = proxies.filter((p) => p.holderClubMemberId === ownClubMemberId);
    const over = ['abgehalten', 'protokolliert', 'abgesagt'].includes(status);

    async function run(action: () => Promise<unknown>) {
        setBusy(true);
        setError(null);
        try {
            await action();
            await load();
        } catch (err) {
            setError(t(assemblyErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-4">
            <SectionCard title={t('assembly.member.right.title')}>
                {roll ? (
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">{t(roll.eligible ? 'assembly.member.right.yes' : 'assembly.member.right.no')}</p>
                        <p className="text-xs text-muted-foreground">{t(`assembly.basis.${roll.basis}`)}</p>
                        {!roll.frozen && <p className="text-xs text-muted-foreground">{t('assembly.member.right.preliminary')}</p>}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">{t('assembly.member.right.unknown')}</p>
                )}
            </SectionCard>

            {agenda.length > 0 && (
                <SectionCard title={t('assembly.member.agenda')}>
                    <ol className="space-y-1 text-sm text-foreground">
                        {agenda.map((a) => (
                            <li key={a.id}>
                                {a.position}. {a.title}
                                {a.voteKind !== 'none' && <span className="ml-2 text-xs text-muted-foreground">({t(`assembly.voteKind.${a.voteKind}`)})</span>}
                            </li>
                        ))}
                    </ol>
                </SectionCard>
            )}

            {rules?.proxyAllowed === true && !over && (
                <SectionCard title={t('assembly.member.proxy.title')}>
                    <div className="space-y-3">
                        {error && <ErrorText>{error}</ErrorText>}
                        {given ? (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm text-foreground">{t('assembly.member.proxy.given', { name: given.holderName ?? '—' })}</p>
                                <button type="button" disabled={busy || !ownClubMemberId} onClick={() => void run(() => apiFetch(`/meetings/${meetingId}/proxies/${ownClubMemberId}?clubId=${clubId}`, { method: 'DELETE' }))} className={`${dangerBtn} !px-3 !py-1.5`}>
                                    {t('assembly.proxy.revoke')}
                                </button>
                            </div>
                        ) : (
                            <>
                                <Notice>{t('assembly.member.proxy.hint')}</Notice>
                                <MemberPicker
                                    clubId={clubId}
                                    label={t('assembly.member.proxy.pick')}
                                    disabled={busy}
                                    excludeIds={ownClubMemberId ? [ownClubMemberId] : []}
                                    onPick={(m: PickedMember) => void run(() => apiFetch(`/meetings/${meetingId}/proxies?clubId=${clubId}`, { method: 'POST', body: { holderClubMemberId: m.id } }))}
                                />
                            </>
                        )}
                        {held.length > 0 && <p className="text-sm text-foreground">{t('assembly.member.proxy.held', { names: held.map((h) => h.grantorName ?? '—').join(', ') })}</p>}
                    </div>
                </SectionCard>
            )}

            <OnlineJoin clubId={clubId} meetingId={meetingId} mode={mode} onlineUrl={onlineUrl} scheduledAt={scheduledAt} />
            <MinutesPanel clubId={clubId} meetingId={meetingId} canWrite={false} canAssembly={false} />
        </div>
    );
}

type ManageTab = 'planen' | 'durchfuehrung' | 'protokoll';

/**
 * Everything the general assembly adds to a meeting (Wave 11): planning + invitation, the running assembly (cockpit) and the minutes for
 * `assembly:manage`; voting right, agenda, proxy and online link for every other member.
 */
export default function AssemblyMeetingSections({
    clubId,
    meeting,
    canManage,
    canWriteMeetings,
    canSensitive,
    ownClubMemberId,
    onChanged,
    onOpenRules,
}: {
    clubId: string;
    meeting: { id: string; status: string; scheduledAt: string | null; participationMode?: ParticipationMode; onlineUrl?: string | null };
    canManage: boolean;
    canWriteMeetings: boolean;
    canSensitive: boolean;
    ownClubMemberId: string | null;
    onChanged: () => void;
    onOpenRules?: () => void;
}) {
    const { t } = useLanguage();
    const [tab, setTab] = useState<ManageTab>('planen');
    const mode = meeting.participationMode ?? 'praesenz';

    if (!canManage) {
        return <MemberView clubId={clubId} meetingId={meeting.id} ownClubMemberId={ownClubMemberId} status={meeting.status} mode={mode} onlineUrl={meeting.onlineUrl ?? null} scheduledAt={meeting.scheduledAt} />;
    }

    const tabs: ManageTab[] = ['planen', 'durchfuehrung', 'protokoll'];
    return (
        <div className="space-y-4">
            <div role="tablist" aria-label={t('assembly.manage.title')} className="flex gap-2 overflow-x-auto border-b border-border">
                {tabs.map((value) => (
                    <button
                        key={value}
                        id={`am-tab-${value}`}
                        type="button"
                        role="tab"
                        aria-selected={tab === value}
                        aria-controls="am-panel"
                        onClick={() => setTab(value)}
                        className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${tab === value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        {t(`assembly.manage.tab.${value}`)}
                    </button>
                ))}
            </div>
            <div id="am-panel" role="tabpanel" aria-labelledby={`am-tab-${tab}`} className="space-y-4">
                {tab === 'planen' && (
                    <>
                        <AssemblyPlanning clubId={clubId} meetingId={meeting.id} status={meeting.status} canSensitive={canSensitive} onOpenRules={onOpenRules} />
                        <ParticipationCard key={`${mode}-${meeting.onlineUrl ?? ''}`} clubId={clubId} meetingId={meeting.id} mode={mode} onlineUrl={meeting.onlineUrl ?? null} onSaved={onChanged} />
                    </>
                )}
                {tab === 'durchfuehrung' && <AssemblyCockpit clubId={clubId} meetingId={meeting.id} canManage={canManage} />}
                {tab === 'protokoll' && <MinutesPanel clubId={clubId} meetingId={meeting.id} canWrite={canManage || canWriteMeetings} canAssembly={canManage} />}
            </div>
        </div>
    );
}
