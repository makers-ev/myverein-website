'use client';

import { useEffect, useId, useState } from 'react';

import { Modal } from '@/components/Modal';
import MemberPicker from '@/components/kalender/MemberPicker';
import { inputClass, primaryButtonClass, secondaryButtonClass } from '@/components/standorte/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type Audience, ackErrorKey, audienceEmpty, cleanAudience } from '@/lib/acknowledgements';
import { type MemberCategory, todayIso } from '@/lib/clubMembers';
import { clubQuery } from '@/lib/documents';
import AttachmentPicker from './AttachmentPicker';
import { AckNotice } from './AcknowledgementInbox';

interface Result {
    created: number;
    renewed: number;
    skipped: number;
}

/**
 * "Bestätigung anfordern" (Wave 13 W7/W4): pick a document of the archive (or start with `documentId` / `person` from the member file),
 * the audience, an optional wording and due date. The server asks the CURRENT version and answers `404` without write access.
 */
export default function RequestAcknowledgementDialog({
    clubId,
    departments,
    documentId,
    documentTitle,
    person,
    onClose,
    onDone,
}: {
    clubId: string;
    departments: { id: string; name: string }[];
    documentId?: string;
    documentTitle?: string;
    /** From the member file: the request is for this one person, the audience is fixed. */
    person?: { id: string; name: string };
    onClose: () => void;
    onDone: () => void;
}) {
    const { t } = useLanguage();
    const id = useId();
    const [doc, setDoc] = useState<{ id: string; title: string } | null>(documentId ? { id: documentId, title: documentTitle ?? '' } : null);
    const [all, setAll] = useState(false);
    const [departmentIds, setDepartmentIds] = useState<string[]>([]);
    const [categoryKeys, setCategoryKeys] = useState<string[]>([]);
    const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
    const [categories, setCategories] = useState<MemberCategory[]>([]);
    const [wording, setWording] = useState('');
    const [dueAt, setDueAt] = useState('');
    const [reauth, setReauth] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<Result | null>(null);
    const today = todayIso();

    useEffect(() => {
        if (person) return;
        let cancelled = false;
        apiFetch<{ data: MemberCategory[] }>(`/club-members/categories?${clubQuery(clubId)}`)
            .then((res) => !cancelled && setCategories(res.data))
            .catch(() => {
                // Without the list the audience can still be everybody, departments or single people.
            });
        return () => {
            cancelled = true;
        };
    }, [clubId, person]);

    const audience: Audience = person ? { clubMemberIds: [person.id] } : cleanAudience({ all, departmentIds, categoryKeys, clubMemberIds: people.map((p) => p.id) });
    const wordingOk = wording.trim() === '' || (wording.trim().length >= 10 && wording.trim().length <= 2000);
    const dueOk = dueAt === '' || dueAt >= today;
    const valid = !!doc && !audienceEmpty(audience) && wordingOk && dueOk;

    const toggle = (list: string[], value: string, on: boolean) => (on ? [...list, value] : list.filter((v) => v !== value));

    async function submit() {
        if (!doc) return;
        setBusy(true);
        setError(null);
        try {
            const res = await apiFetch<{ data: Result }>(`/acknowledgements/requests?${clubQuery(clubId)}`, {
                method: 'POST',
                body: { documentId: doc.id, audience, ...(wording.trim() ? { wording: wording.trim() } : {}), ...(dueAt ? { dueAt } : {}), ...(reauth ? { requiresReauth: true } : {}) },
            });
            setResult(res.data);
            onDone();
        } catch (err) {
            setError(t(ackErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            title={t('docs.ack.request.title')}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" className={secondaryButtonClass} onClick={onClose}>
                        {t(result ? 'docs.gen.close' : 'docs.common.cancel')}
                    </button>
                    {!result && (
                        <button type="button" className={primaryButtonClass} disabled={busy || !valid} onClick={() => void submit()}>
                            {t('docs.ack.request.submit')}
                        </button>
                    )}
                </div>
            }
        >
            {result ? (
                <p role="status" className="text-sm text-foreground">
                    {t('docs.ack.request.done', { created: result.created, renewed: result.renewed, skipped: result.skipped })}
                </p>
            ) : (
                <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">{t('docs.ack.request.intro')}</p>
                    {documentId ? (
                        <p className="text-sm font-medium text-foreground">{doc?.title}</p>
                    ) : (
                        <AttachmentPicker clubId={clubId} anyType label={t('docs.ack.request.document')} value={doc?.id ?? null} valueTitle={doc?.title ?? null} onChange={(docId, title) => setDoc(docId ? { id: docId, title: title ?? '' } : null)} />
                    )}
                    {person ? (
                        <p className="text-sm text-foreground">{t('docs.ack.request.forPerson', { name: person.name })}</p>
                    ) : (
                        <fieldset className="space-y-2">
                            <legend className="mb-1 text-xs font-medium text-muted-foreground">{t('docs.ack.request.audience')}</legend>
                            <label className="flex items-center gap-2 text-sm text-foreground">
                                <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} />
                                {t('docs.ack.request.all')}
                            </label>
                            {!all && (
                                <>
                                    {departments.length > 0 && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">{t('docs.ack.request.departments')}</p>
                                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                                {departments.map((d) => (
                                                    <label key={d.id} className="flex items-center gap-2 text-sm text-foreground">
                                                        <input type="checkbox" checked={departmentIds.includes(d.id)} onChange={(e) => setDepartmentIds((l) => toggle(l, d.id, e.target.checked))} />
                                                        {d.name}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {categories.length > 0 && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">{t('docs.ack.request.categories')}</p>
                                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                                                {categories.map((c) => (
                                                    <label key={c.key} className="flex items-center gap-2 text-sm text-foreground">
                                                        <input type="checkbox" checked={categoryKeys.includes(c.key)} onChange={(e) => setCategoryKeys((l) => toggle(l, c.key, e.target.checked))} />
                                                        {c.name}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <MemberPicker clubId={clubId} label={t('docs.ack.request.people')} exclude={new Set(people.map((p) => p.id))} onPick={(m) => setPeople((l) => [...l, m])} />
                                    {people.length > 0 && (
                                        <ul className="flex flex-wrap gap-2">
                                            {people.map((p) => (
                                                <li key={p.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-foreground">
                                                    {p.name}
                                                    <button type="button" aria-label={t('docs.ack.request.removeNamed', { name: p.name })} className="font-bold" onClick={() => setPeople((l) => l.filter((x) => x.id !== p.id))}>
                                                        ×
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </>
                            )}
                            <p className="text-xs text-muted-foreground">{t('docs.ack.request.audienceHint')}</p>
                        </fieldset>
                    )}
                    <label className="block" htmlFor={`${id}-wording`}>
                        <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.ack.request.wording')}</span>
                        <textarea id={`${id}-wording`} rows={3} maxLength={2000} value={wording} onChange={(e) => setWording(e.target.value)} placeholder={t('docs.ack.request.wordingPlaceholder')} className={inputClass} aria-invalid={!wordingOk} />
                        {!wordingOk && <span className="mt-1 block text-xs text-destructive">{t('docs.ack.request.wordingShort')}</span>}
                    </label>
                    <label className="block" htmlFor={`${id}-due`}>
                        <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('docs.ack.request.due')}</span>
                        <input id={`${id}-due`} type="date" min={today} value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={inputClass} aria-invalid={!dueOk} />
                    </label>
                    <label className="flex items-start gap-2 text-sm text-foreground">
                        <input type="checkbox" className="mt-1" checked={reauth} onChange={(e) => setReauth(e.target.checked)} />
                        <span>
                            {t('docs.ack.request.reauth')}
                            <span className="block text-xs text-muted-foreground">{t('docs.ack.request.reauthHint')}</span>
                        </span>
                    </label>
                    <AckNotice />
                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}
                </div>
            )}
        </Modal>
    );
}
