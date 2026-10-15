'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, History, KeyRound, Plus, Undo2 } from 'lucide-react';

import { ApiError, apiFetch } from '@/lib/api-client';
import { useAccountMembers } from '@/lib/useAccountMembers';
import { formatBerlinDateTime, keyHistoryQuery, KEY_HISTORY_PAGE_SIZE, pageCount, type KeyHistoryResponse } from '@/lib/keyHistory';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    Chip,
    EmptyState,
    Field,
    FormModal,
    SectionCard,
    errorMessage,
    iconButtonClass,
    inputClass,
    secondaryButtonClass,
    useRun,
    type T,
} from '@/components/standorte/ui';

export interface LocationKeyHolder {
    id: string;
    locationId: string;
    memberId: string;
    keyLabel?: string | null;
}

interface KeyLocation {
    id: string;
    keyHolders: LocationKeyHolder[];
}

/**
 * Key management of a location (Wave 7 W11): current holders with issue/return and the handover history. The caller
 * only renders this for people who may see access info (`locations:write` / `locations:read_access`); issuing and
 * returning additionally need `locations:write` (`canWrite`). The backend enforces both.
 */
export default function KeyManagement({
    location,
    clubId,
    canWrite,
    t,
    onChange,
}: {
    location: KeyLocation;
    clubId: string;
    canWrite: boolean;
    t: T;
    onChange: () => void;
}) {
    // Bumped after every issue/return so the history reloads without waiting for the parent's refetch.
    const [historyVersion, setHistoryVersion] = useState(0);
    const changed = () => {
        setHistoryVersion((n) => n + 1);
        onChange();
    };

    return (
        <>
            <KeyHoldersSection location={location} clubId={clubId} canWrite={canWrite} t={t} onChange={changed} />
            <KeyHistorySection locationId={location.id} clubId={clubId} version={historyVersion} t={t} />
        </>
    );
}

function KeyHoldersSection({
    location,
    clubId,
    canWrite,
    t,
    onChange,
}: {
    location: KeyLocation;
    clubId: string;
    canWrite: boolean;
    t: T;
    onChange: () => void;
}) {
    const [issuing, setIssuing] = useState(false);
    const [returning, setReturning] = useState<LocationKeyHolder | null>(null);

    const { members, error: directoryError } = useAccountMembers(clubId);
    const nameFor = (memberId: string) => members.find((m) => m.id === memberId)?.name ?? '—';

    return (
        <SectionCard
            title={t('standorte.keyholders.title')}
            action={
                canWrite && (
                    <button type="button" onClick={() => setIssuing(true)} className={secondaryButtonClass}>
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        {t('standorte.keys.issue')}
                    </button>
                )
            }
        >
            {directoryError && <p className="mb-2 text-sm text-destructive">{t('verein.directory.error')}</p>}
            {location.keyHolders.length === 0 ? (
                <EmptyState icon={<KeyRound className="h-6 w-6" />} text={t('standorte.keyholders.empty')} />
            ) : (
                <ul className="divide-y divide-border">
                    {location.keyHolders.map((kh) => (
                        <li key={kh.id} className="flex items-center justify-between gap-2 py-2">
                            <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                                <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                <span className="truncate font-medium">{nameFor(kh.memberId)}</span>
                                {kh.keyLabel && <Chip tone="muted">{kh.keyLabel}</Chip>}
                            </span>
                            {canWrite && (
                                <button
                                    type="button"
                                    onClick={() => setReturning(kh)}
                                    className={`${iconButtonClass} inline-flex items-center gap-1 text-xs`}
                                    aria-label={t('standorte.keys.return.for', { name: nameFor(kh.memberId) })}
                                    title={t('standorte.keys.return')}
                                >
                                    <Undo2 className="h-4 w-4" aria-hidden="true" />
                                    {t('standorte.keys.return')}
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {issuing && <IssueKeyModal location={location} clubId={clubId} members={members} t={t} onClose={() => setIssuing(false)} onDone={onChange} />}
            {returning && (
                <ReturnKeyModal
                    locationId={location.id}
                    clubId={clubId}
                    holder={returning}
                    name={nameFor(returning.memberId)}
                    t={t}
                    onClose={() => setReturning(null)}
                    onDone={onChange}
                />
            )}
        </SectionCard>
    );
}

function IssueKeyModal({
    location,
    clubId,
    members,
    t,
    onClose,
    onDone,
}: {
    location: KeyLocation;
    clubId: string;
    members: { id: string; name: string | null; left: boolean }[];
    t: T;
    onClose: () => void;
    onDone: () => void;
}) {
    const run = useRun();
    const [memberId, setMemberId] = useState('');
    const [keyLabel, setKeyLabel] = useState('');
    const [note, setNote] = useState('');
    // Former members and current holders are not offered.
    const available = members.filter((m) => !m.left && !location.keyHolders.some((kh) => kh.memberId === m.id));

    return (
        <FormModal
            open
            title={t('standorte.keys.issue.title')}
            submitLabel={t('standorte.keys.issue.submit')}
            cancelLabel={t('standorte.locations.new.cancel')}
            canSubmit={!!memberId}
            onClose={onClose}
            onSubmit={() =>
                run(async () => {
                    await apiFetch(`/locations/${location.id}/key-holders?clubId=${clubId}`, {
                        method: 'POST',
                        body: { memberId, ...(keyLabel.trim() ? { keyLabel: keyLabel.trim() } : {}), ...(note.trim() ? { note: note.trim() } : {}) },
                    });
                    onDone();
                })
            }
        >
            <Field label={t('standorte.keys.member')}>
                <select value={memberId} onChange={(e) => setMemberId(e.target.value)} required className={inputClass}>
                    <option value="">{t('standorte.keyholders.select')}</option>
                    {available.map((m) => (
                        <option key={m.id} value={m.id}>
                            {m.name ?? m.id}
                        </option>
                    ))}
                </select>
            </Field>
            <Field label={t('standorte.keys.keyLabel')}>
                <input type="text" value={keyLabel} onChange={(e) => setKeyLabel(e.target.value)} maxLength={120} placeholder={t('standorte.keys.keyLabel.placeholder')} className={inputClass} />
            </Field>
            <Field label={t('standorte.keys.note')}>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} className={inputClass} />
            </Field>
        </FormModal>
    );
}

function ReturnKeyModal({
    locationId,
    clubId,
    holder,
    name,
    t,
    onClose,
    onDone,
}: {
    locationId: string;
    clubId: string;
    holder: LocationKeyHolder;
    name: string;
    t: T;
    onClose: () => void;
    onDone: () => void;
}) {
    const run = useRun();
    const [note, setNote] = useState('');

    return (
        <FormModal
            open
            title={t('standorte.keys.return.title')}
            submitLabel={t('standorte.keys.return.submit')}
            cancelLabel={t('standorte.locations.new.cancel')}
            canSubmit
            onClose={onClose}
            onSubmit={() =>
                run(async () => {
                    await apiFetch(`/locations/${locationId}/key-holders/${holder.memberId}?clubId=${clubId}`, {
                        method: 'DELETE',
                        ...(note.trim() ? { body: { note: note.trim() } } : {}),
                    });
                    onDone();
                })
            }
        >
            <p className="text-sm text-foreground">
                {t('standorte.keys.return.message', { name })}
                {holder.keyLabel ? ` (${holder.keyLabel})` : ''}
            </p>
            <Field label={t('standorte.keys.note')}>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} className={inputClass} />
            </Field>
        </FormModal>
    );
}

type HistoryState = ({ key: string; res: KeyHistoryResponse; error?: undefined } | { key: string; error: unknown; res?: undefined }) & { locationId: string };

function KeyHistorySection({ locationId, clubId, version, t }: { locationId: string; clubId: string; version: number; t: T }) {
    const { language } = useLanguage();
    const { members } = useAccountMembers(clubId);
    const [page, setPage] = useState(1);
    const [memberId, setMemberId] = useState('');
    const [retry, setRetry] = useState(0);
    const [state, setState] = useState<HistoryState | null>(null);

    const query = keyHistoryQuery(clubId, page, memberId);
    const requestKey = `${locationId}#${query}#${version}#${retry}`;

    useEffect(() => {
        let cancelled = false;
        apiFetch<KeyHistoryResponse>(`/locations/${locationId}/key-history?${query}`)
            .then((res) => {
                if (!cancelled) setState({ key: requestKey, locationId, res });
            })
            .catch((error) => {
                if (!cancelled) setState({ key: requestKey, locationId, error });
            });
        return () => {
            cancelled = true;
        };
    }, [locationId, query, requestKey]);

    // Never show rows of another location: an answer is only used for the location it was fetched for.
    const own = state?.locationId === locationId ? state : null;
    const loading = own?.key !== requestKey;
    const res = own?.res ?? null;
    const failed = !loading && own?.error !== undefined;
    // 403: the role may not see key history at all -- hide the section instead of showing an error.
    if (failed && own?.error instanceof ApiError && own.error.status === 403) return null;

    const pages = res ? pageCount(res.total, res.pageSize || KEY_HISTORY_PAGE_SIZE) : 1;
    const filterable = members.filter((m) => m.name);

    return (
        <SectionCard
            title={t('standorte.keys.history.title')}
            action={
                <select
                    value={memberId}
                    onChange={(e) => {
                        setMemberId(e.target.value);
                        setPage(1);
                    }}
                    aria-label={t('standorte.keys.history.filter')}
                    className={`${inputClass} !w-auto max-w-[12rem]`}
                >
                    <option value="">{t('standorte.keys.history.filter.all')}</option>
                    {filterable.map((m) => (
                        <option key={m.id} value={m.id}>
                            {m.name}
                        </option>
                    ))}
                </select>
            }
        >
            {failed ? (
                <div role="alert" className="space-y-2 text-sm">
                    <p className="text-destructive">{errorMessage(own?.error, t)}</p>
                    <button type="button" onClick={() => setRetry((n) => n + 1)} className={secondaryButtonClass}>
                        {t('standorte.keys.history.retry')}
                    </button>
                </div>
            ) : loading && !res ? (
                <p className="text-sm text-muted-foreground" role="status">
                    {t('standorte.keys.history.loading')}
                </p>
            ) : !res || res.data.length === 0 ? (
                <EmptyState icon={<History className="h-6 w-6" />} text={memberId ? t('standorte.keys.history.emptyFiltered') : t('standorte.keys.history.empty')} />
            ) : (
                <div className={loading ? 'opacity-60' : ''} aria-busy={loading}>
                    <ul className="divide-y divide-border">
                        {res.data.map((entry) => (
                            <li key={entry.id} className="space-y-0.5 py-2 text-sm">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <Chip tone={entry.action === 'issued' ? 'success' : 'muted'}>{t(`standorte.keys.action.${entry.action}`)}</Chip>
                                    <span className="font-medium text-foreground">{entry.memberName ?? '—'}</span>
                                    {entry.keyLabel && <span className="text-muted-foreground">· {entry.keyLabel}</span>}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    <time dateTime={entry.createdAt}>{formatBerlinDateTime(entry.createdAt, language)}</time>
                                    {entry.recordedByName ? ` · ${t('standorte.keys.history.by', { name: entry.recordedByName })}` : ''}
                                </p>
                                {entry.note && <p className="whitespace-pre-line text-xs text-foreground">{entry.note}</p>}
                            </li>
                        ))}
                    </ul>
                    {pages > 1 && (
                        <nav className="mt-3 flex items-center justify-between gap-2" aria-label={t('standorte.keys.history.title')}>
                            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className={secondaryButtonClass}>
                                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                {t('standorte.keys.history.prev')}
                            </button>
                            <span className="text-xs text-muted-foreground">{t('standorte.keys.history.page', { page, pages })}</span>
                            <button type="button" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className={secondaryButtonClass}>
                                {t('standorte.keys.history.next')}
                                <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </nav>
                    )}
                </div>
            )}
        </SectionCard>
    );
}
