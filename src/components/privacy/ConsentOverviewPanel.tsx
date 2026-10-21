'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type ConsentOverview, type ConsentState, type OverviewFilter, OVERVIEW_PAGE_SIZE, overviewQuery, stashReminder } from '@/lib/consents';
import { communicationGate } from '@/lib/communication';
import { inputClass, secondaryButtonClass } from '@/lib/clubMembers';
import { Chip, EmptyState, SectionCard, errorMessage, type Tone } from '@/components/standorte/ui';
import LoadingText from '@/components/LoadingText';

const STATES: ConsentState[] = ['granted', 'revoked', 'none'];

function cellTone(state: ConsentState, requested: boolean): Tone {
    if (state === 'granted') return 'success';
    if (state === 'revoked') return 'muted';
    return requested ? 'warning' : 'muted';
}

/**
 * Overview matrix (Wave 10 W1, `privacy:read`): members x purposes with the current state, counters per purpose and the filters
 * name, purpose and state. "Offen" only means "asked for and not decided yet" and is never a deficit of the person. With a
 * purpose and the state "noch nicht entschieden" selected, the open ones can be reminded through the announcement composer
 * (Wave 9): the composer opens pre-filled and the author reviews and sends it, nothing is sent from here.
 */
export default function ConsentOverviewPanel({ clubId, permissions, onOpenAudit }: { clubId: string; permissions: readonly string[]; onOpenAudit?: (clubMemberId: string, name: string) => void }) {
    const { t } = useLanguage();
    const router = useRouter();
    const [filter, setFilter] = useState<OverviewFilter>({ q: '', purposeId: '', state: '', page: 1 });
    const [search, setSearch] = useState('');
    const [result, setResult] = useState<ConsentOverview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const canRemind = communicationGate(permissions).canAuthor;

    const load = useCallback(async () => {
        setError(null);
        try {
            setResult(await apiFetch<ConsentOverview>(`/consents/overview?${overviewQuery(clubId, filter)}`));
        } catch (err) {
            setResult(null);
            setError(errorMessage(err, t));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId, filter]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    const purposes = result?.data.purposes ?? [];
    const members = result?.data.members ?? [];
    const total = result?.meta.total ?? 0;
    const pages = Math.max(1, Math.ceil(total / OVERVIEW_PAGE_SIZE));
    const chosen = purposes.find((p) => p.id === filter.purposeId);
    const reminderTargets = chosen && filter.state === 'none' ? members : [];

    function remind() {
        if (!chosen) return;
        const ok = stashReminder({
            title: t('privacy.reminder.title', { name: chosen.name }),
            body: t('privacy.reminder.body', { name: chosen.name }),
            members: reminderTargets.map((m) => ({ id: m.clubMemberId, name: m.displayName })),
        });
        if (!ok) {
            setNotice(t('privacy.reminder.storageFailed'));
            return;
        }
        router.push('/mitteilungen');
    }

    return (
        <SectionCard title={t('privacy.overview.title')}>
            <p className="mb-3 text-sm text-muted-foreground">{t('privacy.overview.intro')}</p>
            <form
                className="mb-4 flex flex-wrap items-end gap-3"
                onSubmit={(e) => {
                    e.preventDefault();
                    setFilter({ ...filter, q: search, page: 1 });
                }}
            >
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('privacy.overview.search')}</span>
                    <span className="relative block">
                        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputClass} pl-8`} />
                    </span>
                </label>
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('privacy.overview.purpose')}</span>
                    <select value={filter.purposeId} onChange={(e) => setFilter({ ...filter, purposeId: e.target.value, state: e.target.value ? filter.state : '', page: 1 })} className={inputClass}>
                        <option value="">{t('privacy.overview.allPurposes')}</option>
                        {purposes.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('privacy.overview.state')}</span>
                    <select value={filter.state} disabled={!filter.purposeId} onChange={(e) => setFilter({ ...filter, state: e.target.value as ConsentState | '', page: 1 })} className={inputClass}>
                        <option value="">{t('privacy.overview.allStates')}</option>
                        {STATES.map((s) => (
                            <option key={s} value={s}>
                                {t(`privacy.state.${s}`)}
                            </option>
                        ))}
                    </select>
                </label>
                <button type="submit" className={secondaryButtonClass}>
                    {t('privacy.overview.apply')}
                </button>
            </form>

            {error ? (
                <p role="alert" className="text-sm text-destructive">
                    {error}{' '}
                    <button type="button" onClick={() => void load()} className="font-semibold underline">
                        {t('common.retry')}
                    </button>
                </p>
            ) : !result ? (
                <LoadingText />
            ) : (
                <>
                    {purposes.length > 0 && (
                        <ul className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {purposes.map((p) => (
                                <li key={p.id} className="rounded-lg border border-border p-3 text-sm">
                                    <p className="font-semibold text-foreground">{p.name}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {t('privacy.overview.counts', { granted: p.counts.granted, revoked: p.counts.revoked, none: p.counts.none })}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}

                    {chosen && filter.state === 'none' && canRemind && (
                        <div className="mb-4 rounded-lg bg-muted/50 p-3 text-sm">
                            <p className="text-foreground">{t('privacy.reminder.hint', { count: reminderTargets.length })}</p>
                            <button type="button" disabled={reminderTargets.length === 0} onClick={remind} className={`mt-2 ${secondaryButtonClass}`}>
                                {t('privacy.reminder.action')}
                            </button>
                            {notice && (
                                <p role="alert" className="mt-2 text-xs text-destructive">
                                    {notice}
                                </p>
                            )}
                        </div>
                    )}

                    {members.length === 0 ? (
                        <EmptyState icon={<Search className="h-6 w-6" aria-hidden />} text={t('privacy.overview.empty')} />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="px-3 py-2">{t('privacy.overview.member')}</th>
                                        {purposes.map((p) => (
                                            <th key={p.id} className="px-3 py-2">
                                                {p.name}
                                            </th>
                                        ))}
                                        {onOpenAudit && <th className="px-3 py-2" />}
                                    </tr>
                                </thead>
                                <tbody>
                                    {members.map((m) => (
                                        <tr key={m.clubMemberId} className="border-t border-border text-foreground">
                                            <td className="px-3 py-2 font-medium">{m.displayName}</td>
                                            {purposes.map((p) => {
                                                const cell = m.states[p.id] ?? { state: 'none' as const, needsGuardian: false };
                                                return (
                                                    <td key={p.id} className="px-3 py-2">
                                                        <Chip tone={cellTone(cell.state, p.requested)}>{t(`privacy.cell.${cell.state}`)}</Chip>
                                                        {cell.needsGuardian && cell.state === 'none' && <span className="ml-1 text-xs text-muted-foreground">{t('privacy.cell.needsGuardian')}</span>}
                                                    </td>
                                                );
                                            })}
                                            {onOpenAudit && (
                                                <td className="px-3 py-2 text-right">
                                                    <button type="button" onClick={() => onOpenAudit(m.clubMemberId, m.displayName)} className="text-xs font-medium text-primary underline">
                                                        {t('privacy.overview.openAudit')}
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {pages > 1 && (
                        <div className="mt-4 flex items-center justify-between text-sm">
                            <button type="button" disabled={filter.page <= 1} onClick={() => setFilter({ ...filter, page: filter.page - 1 })} className={secondaryButtonClass}>
                                {t('privacy.paging.prev')}
                            </button>
                            <span className="text-muted-foreground">{t('privacy.paging.of', { page: filter.page, pages, total })}</span>
                            <button type="button" disabled={filter.page >= pages} onClick={() => setFilter({ ...filter, page: filter.page + 1 })} className={secondaryButtonClass}>
                                {t('privacy.paging.next')}
                            </button>
                        </div>
                    )}
                </>
            )}
        </SectionCard>
    );
}
