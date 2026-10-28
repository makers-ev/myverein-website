'use client';

import { useCallback, useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api-client';
import { archiveVisible, documentsGate } from '@/lib/documentAccess';
import { type DocLevel, type Folder, clubQuery } from '@/lib/documents';
import { useLanguage } from '@/contexts/LanguageContext';
import DocumentArchive from '@/components/documents/DocumentArchive';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';

interface MyClub {
    clubId: string;
    clubName: string | null;
}

interface Loaded {
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
            const [folders, me, info] = await Promise.all([
                apiFetch<Loaded['folders']>(`/documents/folders?${q}`),
                apiFetch<{ data: { permissions: string[] } }>(`/club-members/me?${q}`),
                apiFetch<{ data: { departments: { id: string; name: string }[] } }>(`/club-info?${q}`).catch(() => ({ data: { departments: [] } })),
            ]);
            setState({ clubId: club.clubId, clubName: club.clubName, permissions: me.data.permissions, departments: info.data.departments, folders });
        } catch {
            setFailed(true);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    return (
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-foreground">{t('docs.archive.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('docs.archive.intro')}</p>
            <div className="mt-6">
                {failed ? (
                    <LoadError onRetry={() => void load()} />
                ) : state === null ? (
                    <LoadingText />
                ) : state === 'none' || !archiveVisible(state.folders) ? (
                    <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{t(state === 'none' ? 'docs.archive.noClub' : 'docs.archive.noAccess')}</p>
                ) : (
                    <DocumentArchive clubId={state.clubId} gate={documentsGate(state.permissions)} departments={state.departments} initial={state.folders} />
                )}
            </div>
        </div>
    );
}
