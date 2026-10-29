'use client';

import { GenerateAction } from '@/components/documents/GenerateDialog';
import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { type AgendaItem, MINUTES_CONFIRM_ROLES, type MinutesView, assemblyErrorKey, minutesActions, minutesConfirmed } from '@/lib/assembly';
import { fetchFileBlob, saveBlob } from '@/lib/memberCsv';
import { useLanguage } from '@/contexts/LanguageContext';
import { dangerBtn, inputClass, labelClass, primaryBtn, secondaryBtn } from '@/components/kalender/calendarTypes';
import { SectionCard } from '@/components/standorte/ui';
import { useConfirm } from '@/components/useConfirm';
import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { ErrorText, Notice, formatWhen } from '@/components/assembly/shared';

interface ApprovalResolution {
    id: string;
    description: string;
    result: string;
}

/** Text of the TOP structure from the agenda (Markdown headings), appended to the draft. */
function agendaSkeleton(items: AgendaItem[]): string {
    return items.map((a) => `## TOP ${a.position}: ${a.title}\n\n`).join('');
}

/**
 * Minutes with a status flow (Wave 11 W7): draft (Markdown text) -> confirmed by chair and secretary -> submitted -> approved by a resolution of
 * the next meeting -> archived. An approved version is read-only; corrections are separate notes. Export as HTML or Markdown.
 */
export default function MinutesPanel({ clubId, meetingId, canWrite, canAssembly }: { clubId: string; meetingId: string; canWrite: boolean; canAssembly: boolean }) {
    const { t, language } = useLanguage();
    const [view, setView] = useState<MinutesView | null>(null);
    const [failed, setFailed] = useState(false);
    const [text, setText] = useState('');
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [note, setNote] = useState('');
    const [agenda, setAgenda] = useState<AgendaItem[]>([]);
    const [resolutions, setResolutions] = useState<ApprovalResolution[] | null>(null);
    const [resolutionId, setResolutionId] = useState('');
    const { confirm, dialog } = useConfirm();

    const load = useCallback(async () => {
        try {
            const res = await apiFetch<{ data: MinutesView }>(`/meetings/${meetingId}/minutes?clubId=${clubId}`);
            setView(res.data);
            setText((prev) => (dirty ? prev : (res.data.current?.content ?? '')));
            setFailed(false);
        } catch {
            setFailed(true);
        }
        // `dirty` is read only to keep unsaved typing across reloads.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clubId, meetingId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    useEffect(() => {
        if (!canWrite) return;
        apiFetch<{ data: AgendaItem[] }>(`/meetings/${meetingId}/agenda-items?clubId=${clubId}`)
            .then((r) => setAgenda(r.data))
            .catch(() => setAgenda([]));
    }, [clubId, meetingId, canWrite]);

    const hintId = view?.approvalHint?.id ?? null;
    const status = view?.current?.status ?? null;
    useEffect(() => {
        if (!canAssembly || !hintId || status !== 'zur_genehmigung') return;
        apiFetch<{ data: ApprovalResolution[] }>(`/meetings/${hintId}/resolutions?clubId=${clubId}`)
            .then((r) => setResolutions(r.data.filter((x) => x.result.trim().toLowerCase().startsWith('angenommen'))))
            .catch(() => setResolutions([]));
    }, [clubId, hintId, status, canAssembly]);

    if (failed && !view) return <LoadError onRetry={() => void load()} />;
    if (!view) return <LoadingText />;

    const current = view.current;
    const actions = minutesActions(current);
    const readOnly = !canWrite || !actions.edit;

    async function run(action: () => Promise<unknown>) {
        setBusy(true);
        setError(null);
        try {
            await action();
            setDirty(false);
            await load();
            return true;
        } catch (err) {
            setError(t(assemblyErrorKey(err)));
            return false;
        } finally {
            setBusy(false);
        }
    }

    const post = (path: string, body: unknown = {}) => apiFetch(`/meetings/${meetingId}/minutes${path}?clubId=${clubId}`, { method: 'POST', body });

    async function save() {
        await run(() => apiFetch(`/meetings/${meetingId}/minutes?clubId=${clubId}`, { method: 'PUT', body: { content: text } }));
    }

    async function exportAs(format: 'html' | 'md') {
        setBusy(true);
        setError(null);
        try {
            const { blob, filename } = await fetchFileBlob(`/meetings/${meetingId}/minutes/export?clubId=${clubId}&format=${format}`, `protokoll.${format}`, { accept: format === 'html' ? 'text/html' : 'text/markdown' });
            saveBlob(blob, filename);
        } catch (err) {
            setError(t(assemblyErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    const confirmedBy = (role: (typeof MINUTES_CONFIRM_ROLES)[number]) => current?.confirmations?.find((c) => c.role === role && c.matchesText);

    return (
        <SectionCard
            title={t('assembly.minutes.title')}
            action={
                current && (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground">
                        {t(`assembly.minutes.status.${current.status}`)} · v{current.version}
                    </span>
                )
            }
        >
            <div className="space-y-3">
                {canWrite && view.approvalHint && !current?.approved && (
                    <Notice>{t('assembly.minutes.approvalHint', { title: view.approvalHint.title, when: formatWhen(view.approvalHint.scheduledAt, language) })}</Notice>
                )}
                {canWrite && !view.approvalHint && current && !current.approved && <Notice>{t('assembly.minutes.noNextMeeting')}</Notice>}
                {current?.approved && <Notice>{t('assembly.minutes.locked')}</Notice>}
                {!current && !canWrite && <p className="text-sm text-muted-foreground">{t('assembly.minutes.notPublished')}</p>}

                {readOnly ? (
                    current ? (
                        <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-3 font-sans text-sm text-foreground">{current.content}</pre>
                    ) : null
                ) : (
                    <div>
                        <label htmlFor="mn-text" className={labelClass}>
                            {t('assembly.minutes.text')}
                        </label>
                        <textarea
                            id="mn-text"
                            rows={14}
                            value={text}
                            onChange={(e) => {
                                setText(e.target.value);
                                setDirty(true);
                            }}
                            className={`${inputClass} font-mono`}
                        />
                        <div className="mt-2 flex flex-wrap gap-2">
                            <button type="button" disabled={busy || !dirty} onClick={() => void save()} className={primaryBtn}>
                                {t('assembly.minutes.save')}
                            </button>
                            {agenda.length > 0 && (
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => {
                                        setText((prev) => `${prev}${prev && !prev.endsWith('\n') ? '\n\n' : ''}${agendaSkeleton(agenda)}`);
                                        setDirty(true);
                                    }}
                                    className={secondaryBtn}
                                >
                                    {t('assembly.minutes.insertAgenda')}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {error && <ErrorText>{error}</ErrorText>}

                {canAssembly && current && actions.confirm && (
                    <div className="space-y-2 rounded-lg border border-border p-3">
                        <p className="text-sm font-semibold text-foreground">{t('assembly.minutes.confirm.title')}</p>
                        <p className="text-xs text-muted-foreground">{t('assembly.minutes.confirm.hint')}</p>
                        <div className="flex flex-wrap gap-2">
                            {MINUTES_CONFIRM_ROLES.map((role) => (
                                <button key={role} type="button" disabled={busy || dirty || !!confirmedBy(role)} onClick={() => void run(() => post('/confirm', { role }))} className={secondaryBtn}>
                                    {confirmedBy(role) ? t('assembly.minutes.confirm.done', { role: t(`assembly.minutes.role.${role}`) }) : t('assembly.minutes.confirm.action', { role: t(`assembly.minutes.role.${role}`) })}
                                </button>
                            ))}
                        </div>
                        {dirty && <p className="text-xs text-warning">{t('assembly.minutes.saveFirst')}</p>}
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    {canWrite && actions.submit && (
                        <button
                            type="button"
                            disabled={busy || dirty || !minutesConfirmed(current)}
                            onClick={async () => {
                                if (await confirm({ title: t('assembly.minutes.submit'), body: t('assembly.minutes.submit.confirm'), confirmLabel: t('assembly.minutes.submit') })) await run(() => post('/submit'));
                            }}
                            className={primaryBtn}
                        >
                            {t('assembly.minutes.submit')}
                        </button>
                    )}
                    {canWrite && actions.reopen && (
                        <button type="button" disabled={busy} onClick={() => void run(() => post('/reopen'))} className={secondaryBtn}>
                            {t('assembly.minutes.reopen')}
                        </button>
                    )}
                    {canAssembly && actions.archive && (
                        <button type="button" disabled={busy} onClick={() => void run(() => post('/archive'))} className={secondaryBtn}>
                            {t('assembly.minutes.archive')}
                        </button>
                    )}
                    {current?.approved && (
                        <GenerateAction clubId={clubId} templateId="versammlung-protokoll" label={t('docs.gen.minutes.action')} title={t('docs.gen.minutes.title')} intro={t('docs.gen.minutes.intro')} params={{ meetingId }} target={{ kind: 'archive' }} className={`${secondaryBtn} inline-flex items-center gap-1.5`} />
                    )}
                    {current && (
                        <>
                            <button type="button" disabled={busy} onClick={() => void exportAs('html')} className={`${secondaryBtn} inline-flex items-center gap-1.5`}>
                                <Download className="h-4 w-4" aria-hidden />
                                {t('assembly.minutes.export.html')}
                            </button>
                            <button type="button" disabled={busy} onClick={() => void exportAs('md')} className={`${secondaryBtn} inline-flex items-center gap-1.5`}>
                                <Download className="h-4 w-4" aria-hidden />
                                {t('assembly.minutes.export.md')}
                            </button>
                        </>
                    )}
                </div>
                {canWrite && current && actions.submit && !minutesConfirmed(current) && <p className="text-xs text-muted-foreground">{t('assembly.minutes.submit.needConfirm')}</p>}

                {canAssembly && actions.approve && view.approvalHint && (
                    <div className="space-y-2 rounded-lg border border-border p-3">
                        <label htmlFor="mn-res" className={labelClass}>
                            {t('assembly.minutes.approve.resolution', { title: view.approvalHint.title })}
                        </label>
                        {resolutions === null ? (
                            <LoadingText />
                        ) : resolutions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t('assembly.minutes.approve.none')}</p>
                        ) : (
                            <select id="mn-res" value={resolutionId} onChange={(e) => setResolutionId(e.target.value)} className={inputClass}>
                                <option value="">—</option>
                                {resolutions.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.description.slice(0, 80)}
                                    </option>
                                ))}
                            </select>
                        )}
                        <button
                            type="button"
                            disabled={busy || !resolutionId}
                            onClick={async () => {
                                if (await confirm({ title: t('assembly.minutes.approve'), body: t('assembly.minutes.approve.confirm'), confirmLabel: t('assembly.minutes.approve') })) await run(() => post('/approve', { resolutionId }));
                            }}
                            className={primaryBtn}
                        >
                            {t('assembly.minutes.approve')}
                        </button>
                    </div>
                )}

                {canWrite && view.versions.length > 1 && (
                    <details className="text-sm">
                        <summary className="cursor-pointer font-medium text-foreground">{t('assembly.minutes.versions')}</summary>
                        <ul className="mt-1 space-y-1 text-muted-foreground">
                            {view.versions.map((v) => (
                                <li key={v.id}>
                                    v{v.version} · {t(`assembly.minutes.status.${v.status}`)} · {formatWhen(v.createdAt, language)}
                                </li>
                            ))}
                        </ul>
                    </details>
                )}

                {(view.amendments.length > 0 || (canAssembly && actions.amend)) && (
                    <div className="space-y-2 border-t border-border pt-3">
                        <h3 className="text-sm font-bold text-foreground">{t('assembly.minutes.amendments')}</h3>
                        {view.amendments.map((a) => (
                            <p key={a.id} className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-foreground">
                                <span className="text-xs text-muted-foreground">{formatWhen(a.createdAt, language)} · v{a.version}: </span>
                                {a.note}
                            </p>
                        ))}
                        {canAssembly && actions.amend && (
                            <div className="space-y-2">
                                <label htmlFor="mn-note" className={labelClass}>
                                    {t('assembly.minutes.amend.label')}
                                </label>
                                <textarea id="mn-note" rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
                                <button
                                    type="button"
                                    disabled={busy || !note.trim()}
                                    onClick={async () => {
                                        if (await run(() => post('/amendments', { note: note.trim() }))) setNote('');
                                    }}
                                    className={dangerBtn}
                                >
                                    {t('assembly.minutes.amend.add')}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            {dialog}
        </SectionCard>
    );
}
