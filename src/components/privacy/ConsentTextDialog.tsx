'use client';

import { useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type ConsentPurpose, TEXT_MAX, TEXT_MIN, consentErrorKey } from '@/lib/consents';
import { inputClass } from '@/lib/clubMembers';
import { FormModal } from '@/components/standorte/ui';
import DiffView from './DiffView';

/**
 * Publish a new text version of a purpose (`POST /consent-purposes/:id/texts`). Versions are immutable: a published text is
 * never edited, a change becomes version + 1 and everybody who decided earlier is asked again. The live comparison shows
 * what changes against the current version before it goes out.
 */
export default function ConsentTextDialog({ clubId, purpose, onClose, onPublished }: { clubId: string; purpose: ConsentPurpose; onClose: () => void; onPublished: () => void }) {
    const { t } = useLanguage();
    const current = purpose.currentText;
    const [body, setBody] = useState(current?.body ?? '');
    const trimmed = body.trim();
    const changed = !current || trimmed !== current.body.trim();
    const valid = trimmed.length >= TEXT_MIN && trimmed.length <= TEXT_MAX;

    return (
        <FormModal
            open
            title={t(current ? 'privacy.text.title.new' : 'privacy.text.title.first', { name: purpose.name, version: (current?.version ?? 0) + 1 })}
            submitLabel={t('privacy.text.publish')}
            cancelLabel={t('privacy.cancel')}
            canSubmit={valid && changed}
            onClose={onClose}
            onSubmit={async () => {
                try {
                    await apiFetch(`/consent-purposes/${encodeURIComponent(purpose.id)}/texts?clubId=${encodeURIComponent(clubId)}`, { method: 'POST', body: { body: trimmed } });
                    onPublished();
                    return null;
                } catch (err) {
                    return t(consentErrorKey(err));
                }
            }}
        >
            <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('privacy.text.body')}</span>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} maxLength={TEXT_MAX} className={inputClass} />
                <span className="mt-1 block text-xs text-muted-foreground">{t('privacy.text.count', { count: trimmed.length, min: TEXT_MIN, max: TEXT_MAX })}</span>
            </label>
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{t('privacy.text.voluntaryHint')}</p>
            {current && (
                <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">{t('privacy.text.diffTitle', { version: current.version })}</p>
                    <DiffView before={current.body} after={trimmed} />
                    {changed && <p className="mt-2 text-xs text-warning">{t('privacy.text.reaskHint')}</p>}
                </div>
            )}
        </FormModal>
    );
}
