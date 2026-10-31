'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { type ConsentPurpose, consentErrorKey } from '@/lib/consents';
import { formatDate, inputClass, primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import { Chip, EmptyState, FormModal, SectionCard, Toggle } from '@/components/standorte/ui';
import LoadingText from '@/components/LoadingText';
import ConsentTextDialog from './ConsentTextDialog';
import ConsentTextHistory from './ConsentTextHistory';

interface PurposeForm {
    name: string;
    description: string;
    requested: boolean;
    minAge: string;
}

function PurposeFormDialog({ clubId, purpose, onClose, onSaved }: { clubId: string; purpose: ConsentPurpose | null; onClose: () => void; onSaved: () => void }) {
    const { t } = useLanguage();
    const [form, setForm] = useState<PurposeForm>({
        name: purpose?.name ?? '',
        description: purpose?.description ?? '',
        requested: purpose?.requested ?? false,
        minAge: purpose?.minAge != null ? String(purpose.minAge) : '',
    });
    const minAge = form.minAge.trim() === '' ? null : Number(form.minAge);
    const minAgeValid = minAge === null || (Number.isInteger(minAge) && minAge >= 0 && minAge <= 18);

    return (
        <FormModal
            open
            title={t(purpose ? 'privacy.purpose.edit' : 'privacy.purpose.new')}
            submitLabel={t('privacy.save')}
            cancelLabel={t('privacy.cancel')}
            canSubmit={form.name.trim().length > 0 && minAgeValid}
            onClose={onClose}
            onSubmit={async () => {
                const body = { name: form.name.trim(), description: form.description.trim() || null, requested: form.requested, minAge };
                try {
                    if (purpose) await apiFetch(`/consent-purposes/${encodeURIComponent(purpose.id)}?clubId=${encodeURIComponent(clubId)}`, { method: 'PATCH', body });
                    else await apiFetch(`/consent-purposes?clubId=${encodeURIComponent(clubId)}`, { method: 'POST', body });
                    onSaved();
                    return null;
                } catch (err) {
                    return t(consentErrorKey(err));
                }
            }}
        >
            <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('privacy.purpose.name')}</span>
                <input value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('privacy.purpose.description')}</span>
                <textarea value={form.description} maxLength={500} rows={3} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">{t('privacy.purpose.minAge')}</span>
                <input type="number" min={0} max={18} value={form.minAge} onChange={(e) => setForm({ ...form, minAge: e.target.value })} className={inputClass} />
                <span className="mt-1 block text-xs text-muted-foreground">{t('privacy.purpose.minAgeHint')}</span>
            </label>
            <div>
                <Toggle checked={form.requested} onChange={(requested) => setForm({ ...form, requested })} label={t('privacy.purpose.requested')} />
                <p className="mt-1 text-xs text-muted-foreground">{t('privacy.purpose.requestedHint')}</p>
            </div>
        </FormModal>
    );
}

function PurposeCard({ clubId, purpose, canManage, onChanged }: { clubId: string; purpose: ConsentPurpose; canManage: boolean; onChanged: () => void }) {
    const { t, language } = useLanguage();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dialog, setDialog] = useState<null | 'edit' | 'text'>(null);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [historyToken, setHistoryToken] = useState(0);
    const archived = purpose.archivedAt !== null;

    async function patch(body: Record<string, unknown>) {
        setBusy(true);
        setError(null);
        try {
            await apiFetch(`/consent-purposes/${encodeURIComponent(purpose.id)}?clubId=${encodeURIComponent(clubId)}`, { method: 'PATCH', body });
            onChanged();
        } catch (err) {
            setError(t(consentErrorKey(err)));
        } finally {
            setBusy(false);
        }
    }

    return (
        <li className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground">{purpose.name}</h3>
                    {purpose.description && <p className="mt-0.5 text-sm text-muted-foreground">{purpose.description}</p>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {purpose.system && <Chip tone="muted">{t('privacy.purpose.system')}</Chip>}
                    {archived ? <Chip tone="muted">{t('privacy.purpose.archived')}</Chip> : <Chip tone={purpose.active ? 'success' : 'warning'}>{t(purpose.active ? 'privacy.purpose.active' : 'privacy.purpose.inactive')}</Chip>}
                    {purpose.requested && <Chip tone="primary">{t('privacy.purpose.requestedChip')}</Chip>}
                    {purpose.minAge !== null && <Chip tone="muted">{t('privacy.purpose.minAgeChip', { age: purpose.minAge })}</Chip>}
                </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
                {purpose.currentText ? t('privacy.purpose.currentText', { version: purpose.currentText.version, date: formatDate(purpose.currentText.publishedAt, language) }) : t('privacy.purpose.noText')}
            </p>

            {canManage && !archived && (
                <div className="mt-3 space-y-3">
                    <div>
                        <Toggle checked={purpose.requested} onChange={(requested) => void patch({ requested })} label={t('privacy.purpose.requested')} />
                        <p className="mt-1 text-xs text-muted-foreground">{t('privacy.purpose.requestedHint')}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={busy} onClick={() => setDialog('text')} className={primaryButtonClass}>
                            {t(purpose.currentText ? 'privacy.purpose.newVersion' : 'privacy.purpose.firstText')}
                        </button>
                        <button type="button" disabled={busy} onClick={() => setDialog('edit')} className={secondaryButtonClass}>
                            {t('privacy.purpose.edit')}
                        </button>
                        {purpose.currentText && (
                            <button type="button" disabled={busy} onClick={() => void patch({ active: !purpose.active })} className={secondaryButtonClass}>
                                {t(purpose.active ? 'privacy.purpose.deactivate' : 'privacy.purpose.activate')}
                            </button>
                        )}
                        {!purpose.system && (
                            <button type="button" disabled={busy} onClick={() => void patch({ archived: true })} className={secondaryButtonClass}>
                                {t('privacy.purpose.archive')}
                            </button>
                        )}
                    </div>
                </div>
            )}
            {canManage && archived && (
                <button type="button" disabled={busy} onClick={() => void patch({ archived: false })} className={`mt-3 ${secondaryButtonClass}`}>
                    {t('privacy.purpose.restore')}
                </button>
            )}
            {error && (
                <p role="alert" className="mt-2 text-sm text-destructive">
                    {error}
                </p>
            )}

            {purpose.currentText && (
                <div className="mt-3">
                    <button type="button" aria-expanded={historyOpen} onClick={() => setHistoryOpen((v) => !v)} className="text-sm font-medium text-primary underline">
                        {t(historyOpen ? 'privacy.history.hide' : 'privacy.history.show')}
                    </button>
                    {historyOpen && (
                        <div className="mt-2">
                            <ConsentTextHistory clubId={clubId} purposeId={purpose.id} reloadToken={historyToken} />
                        </div>
                    )}
                </div>
            )}

            {dialog === 'edit' && (
                <PurposeFormDialog
                    clubId={clubId}
                    purpose={purpose}
                    onClose={() => setDialog(null)}
                    onSaved={() => {
                        setDialog(null);
                        onChanged();
                    }}
                />
            )}
            {dialog === 'text' && (
                <ConsentTextDialog
                    clubId={clubId}
                    purpose={purpose}
                    onClose={() => setDialog(null)}
                    onPublished={() => {
                        setDialog(null);
                        setHistoryToken((n) => n + 1);
                        onChanged();
                    }}
                />
            )}
        </li>
    );
}

/**
 * "Zwecke und Texte" (Wave 10 W1): the club's consent purposes, text versions with comparison to the previous version and
 * the voluntary "wird angefragt" flag. Reading needs `privacy:read`, changing `privacy:manage`. The flag only decides what
 * the club asks for and reminds about, it never makes a consent a condition for anything.
 */
export default function ConsentPurposesPanel({ clubId, canManage, onChanged }: { clubId: string; canManage: boolean; onChanged?: () => void }) {
    const { t } = useLanguage();
    const [purposes, setPurposes] = useState<ConsentPurpose[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [creating, setCreating] = useState(false);

    const load = useCallback(async () => {
        setFailed(false);
        try {
            const res = await apiFetch<{ data: ConsentPurpose[] }>(`/consent-purposes?clubId=${encodeURIComponent(clubId)}`);
            setPurposes(res.data);
        } catch {
            setFailed(true);
        }
    }, [clubId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void load();
    }, [load]);

    const changed = () => {
        void load();
        onChanged?.();
    };

    return (
        <SectionCard
            title={t('privacy.purposes.title')}
            action={
                canManage && (
                    <button type="button" onClick={() => setCreating(true)} className={primaryButtonClass}>
                        {t('privacy.purpose.new')}
                    </button>
                )
            }
        >
            <p className="mb-3 text-sm text-muted-foreground">{t('privacy.purposes.intro')}</p>
            {failed ? (
                <p role="alert" className="text-sm text-destructive">
                    {t('common.error')}{' '}
                    <button type="button" onClick={() => void load()} className="font-semibold underline">
                        {t('common.retry')}
                    </button>
                </p>
            ) : !purposes ? (
                <LoadingText />
            ) : purposes.length === 0 ? (
                <EmptyState icon={<ShieldCheck className="h-6 w-6" aria-hidden />} text={t('privacy.purposes.empty')} />
            ) : (
                <ul className="space-y-3">
                    {purposes.map((p) => (
                        <PurposeCard key={p.id} clubId={clubId} purpose={p} canManage={canManage} onChanged={changed} />
                    ))}
                </ul>
            )}
            {creating && (
                <PurposeFormDialog
                    clubId={clubId}
                    purpose={null}
                    onClose={() => setCreating(false)}
                    onSaved={() => {
                        setCreating(false);
                        changed();
                    }}
                />
            )}
        </SectionCard>
    );
}
