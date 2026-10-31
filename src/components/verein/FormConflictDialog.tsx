'use client';

import { AlertTriangle } from 'lucide-react';

import { Modal } from '@/components/Modal';
import { useLanguage } from '@/contexts/LanguageContext';
import { primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import { type EditorState, fieldTitle, type FormDetail, summarizeChanges } from '@/lib/formEditor';

/**
 * The draft on the server is not the one the editor loaded (it was changed, published or discarded meanwhile). Nothing is
 * overwritten silently: the person sees what differs and chooses -- reload the current state (own changes are dropped) or
 * keep their version and save it as the current draft (a new draft if the old one is gone).
 */
export default function FormConflictDialog({ latest, mine, busy, onKeep, onReload }: { latest: FormDetail | null; mine: Pick<EditorState, 'fields' | 'privacyNotice'>; busy: boolean; onKeep: () => void; onReload: () => void }) {
    const { t } = useLanguage();
    const source = latest ? (latest.draft ?? latest.published) : null;
    const summary = source ? summarizeChanges({ fields: source.fields, privacyNotice: source.privacyNotice }, mine) : null;
    const lines: Array<[string, readonly { key: string; label: string }[]]> = summary
        ? [
              ['forms.editor.conflict.added', summary.added],
              ['forms.editor.conflict.changed', summary.changed],
              ['forms.editor.conflict.removed', summary.removed],
          ]
        : [];
    return (
        <Modal
            open
            size="lg"
            onClose={() => {}}
            title={t('forms.editor.conflict.title')}
            footer={
                <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={onReload} disabled={busy} className={secondaryButtonClass}>
                        {t('forms.editor.conflict.reload')}
                    </button>
                    <button type="button" onClick={onKeep} disabled={busy} className={primaryButtonClass}>
                        {t('forms.editor.conflict.keep')}
                    </button>
                </div>
            }
        >
            <div className="space-y-3 text-sm text-foreground">
                <p className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                    {t('forms.editor.conflict.body')}
                </p>
                {summary && (
                    <section>
                        <h3 className="text-xs font-bold text-muted-foreground">{t('forms.editor.conflict.diff')}</h3>
                        {summary.none ? (
                            <p className="mt-1">{t('forms.editor.conflict.same')}</p>
                        ) : (
                            <ul className="mt-1 list-disc space-y-1 pl-5">
                                {lines.map(([key, fields]) =>
                                    fields.length > 0 ? (
                                        <li key={key}>
                                            <span className="font-medium">{t(key)}:</span> <span className="break-words text-muted-foreground">{fields.map((f) => fieldTitle(f, f.key)).join(', ')}</span>
                                        </li>
                                    ) : null,
                                )}
                                {summary.reordered && <li>{t('forms.editor.publish.reordered')}</li>}
                                {summary.privacyNoticeChanged && <li>{t('forms.editor.publish.privacyChanged')}</li>}
                            </ul>
                        )}
                    </section>
                )}
                {!source && <p className="text-muted-foreground">{t('forms.editor.conflict.unknown')}</p>}
                <p className="text-xs text-muted-foreground">{t('forms.editor.conflict.hint')}</p>
            </div>
        </Modal>
    );
}
