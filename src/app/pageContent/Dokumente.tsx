'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api-client';
import { archiveVisible, documentsGate } from '@/lib/documentAccess';
import { type DocLevel, type Folder, clubQuery } from '@/lib/documents';
import { useLanguage } from '@/contexts/LanguageContext';
import AcknowledgementInbox from '@/components/documents/AcknowledgementInbox';
import AcknowledgementManager from '@/components/documents/AcknowledgementManager';
import DocumentArchive from '@/components/documents/DocumentArchive';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';

interface MyClub {
    clubId: string;
    clubName: string | null;
}

type DocTab = 'archiv' | 'bestaetigungen' | 'verwalten';

interface Loaded {
    openAcks: number;
    clubId: string;
    clubName: string | null;
    permissions: string[];
    departments: { id: string; name: string }[];
    folders: { data: Folder[]; rootLevel: DocLevel | null; maxDepth: number };
}

/** `/dokumente`: the document archive. Needs no global permission (folder rights decide); shows an empty state when nothing is shared with the caller. */
export default function DokumentePageContent() {
    const { t } = useLanguage();
    const [state, setState] = useState<Loaded | 'none' | null>(null);
    const [failed, setFailed] = useState(false);
    const [tab, setTab] = useState<DocTab | null>(null);

    const load = useCallback(async () => {
        setFailed(false);
        try {
            const clubs = await apiFetch<{ data: MyClub[] }>('/my-clubs');
            const club = clubs.data[0];
            if (!club) {
                setState('none');
                return;
            }
            const q = clubQuery(club.clubId);
            const [folders, me, info, acks] = await Promise.all([
                apiFetch<Loaded['folders']>(`/documents/folders?${q}`),
                apiFetch<{ data: { permissions: string[] } }>(`/club-members/me?${q}`),
                apiFetch<{ data: { departments: { id: string; name: string }[] } }>(`/club-info?${q}`).catch(() => ({ data: { departments: [] } })),
                apiFetch<{ total: number }>(`/acknowledgements/mine?${q}&status=offen&pageSize=1`).catch(() => ({ total: 0 })),
            ]);
            setState({ openAcks: acks.total, clubId: club.clubId, clubName: club.clubName, permissions: me.data.permissions, departments: info.data.departments, folders });
        } catch {
            setFailed(true);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    const loaded = state && state !== 'none' ? state : null;
    const gate = loaded ? documentsGate(loaded.permissions) : null;
    const tabs: DocTab[] = loaded && gate ? [...(archiveVisible(loaded.folders) ? (['archiv'] as const) : []), 'bestaetigungen', ...(gate.write || gate.manage ? (['verwalten'] as const) : [])] : [];
    const current: DocTab | null = tab && tabs.includes(tab) ? tab : (tabs[0] ?? null);

    return (
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-foreground">{t('docs.archive.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('docs.archive.intro')}</p>
            <div className="mt-6">
                {failed ? (
                    <LoadError onRetry={() => void load()} />
                ) : state === null ? (
                    <LoadingText />
                ) : state === 'none' ? (
                    <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{t('docs.archive.noClub')}</p>
                ) : (
                    <>
                        <div role="tablist" aria-label={t('docs.archive.title')} className="mb-4 flex gap-2 overflow-x-auto border-b border-border">
                            {tabs.map((value) => (
                                <button
                                    key={value}
                                    id={`doc-tab-${value}`}
                                    type="button"
                                    role="tab"
                                    aria-selected={current === value}
                                    aria-controls="doc-panel"
                                    onClick={() => setTab(value)}
                                    className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${current === value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                >
                                    {t(`docs.tab.${value}`)}
                                    {value === 'bestaetigungen' && state.openAcks > 0 && (
                                        <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">{state.openAcks}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div id="doc-panel" role="tabpanel" aria-labelledby={current ? `doc-tab-${current}` : undefined}>
                            {current === 'archiv' && gate && <DocumentArchive clubId={state.clubId} gate={gate} departments={state.departments} initial={state.folders} />}
                            {current === 'bestaetigungen' && <AcknowledgementInbox clubId={state.clubId} onCount={(n) => setState((s) => (s && s !== 'none' ? { ...s, openAcks: n } : s))} />}
                            {current === 'verwalten' && <AcknowledgementManager clubId={state.clubId} departments={state.departments} />}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
