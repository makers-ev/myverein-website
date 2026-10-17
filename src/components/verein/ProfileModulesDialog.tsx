'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Info, Lock, ShieldCheck } from 'lucide-react';

import LoadError from '@/components/LoadError';
import LoadingText from '@/components/LoadingText';
import { Modal } from '@/components/Modal';
import { Chip } from '@/components/standorte/ui';
import { useConfirm } from '@/components/useConfirm';
import { useLanguage } from '@/contexts/LanguageContext';
import { apiFetch } from '@/lib/api-client';
import { primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';
import { customFieldErrorKey } from '@/lib/customFields';
import { asCatalog, type Catalog, type CatalogModule, groupLabelKey, groupModules, limitView, moduleAudience, PRIVACY_NOTE_MODULES, toggleBlock } from '@/lib/profileModules';

/**
 * "Bausteine aktivieren" (`forms:write`): the catalog of optional profile modules, grouped, each with one click on/off. Nothing is
 * mandatory, nothing exists in the club until it is switched on, switching off keeps the values (the field is archived).
 * Kinderschutz modules are sensitive: only people with `members:read_sensitive` switch them. Text of the modules comes from the
 * server and is rendered as plain text.
 */
export default function ProfileModulesDialog({ clubId, canReadSensitive, onClose, onChanged }: { clubId: string; canReadSensitive: boolean; onClose: () => void; onChanged: () => void }) {
    const { t } = useLanguage();
    const { confirm, dialog } = useConfirm();
    const [catalog, setCatalog] = useState<Catalog | null>(null);
    const [failed, setFailed] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
    const alive = useRef(true);

    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
        };
    }, []);

    const load = useCallback(() => {
        setFailed(false);
        apiFetch<unknown>(`/member-fields/catalog?clubId=${clubId}`)
            .then((res) => {
                if (!alive.current) return;
                const parsed = asCatalog(res);
                if (parsed) setCatalog(parsed);
                else setFailed(true);
            })
            .catch(() => {
                if (alive.current) setFailed(true);
            });
    }, [clubId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);

    async function toggle(m: CatalogModule) {
        if (busyId) return;
        const activating = m.state !== 'active';
        if (!activating) {
            const ok = await confirm({
                title: t('forms.mod.deactivate.title', { label: m.label }),
                body: t('forms.mod.deactivate.body'),
                confirmLabel: t('forms.mod.deactivate'),
                danger: true,
            });
            if (!ok) return;
        }
        setBusyId(m.id);
        setFlash(null);
        try {
            await apiFetch(`/member-fields/catalog/${encodeURIComponent(m.id)}/${activating ? 'activate' : 'deactivate'}?clubId=${clubId}`, { method: 'POST', body: {} });
            if (!alive.current) return;
            setFlash({ ok: true, text: t(activating ? 'forms.mod.activated' : 'forms.mod.deactivated', { label: m.label }) });
            load();
            onChanged();
        } catch (err) {
            if (alive.current) setFlash({ ok: false, text: t(customFieldErrorKey(err)) });
        } finally {
            if (alive.current) setBusyId(null);
        }
    }

    const meter = catalog ? limitView(catalog.limit) : null;

    return (
        <Modal
            open
            size="lg"
            onClose={onClose}
            title={t('forms.mod.title')}
            footer={
                <div className="flex justify-end">
                    <button type="button" onClick={onClose} className={secondaryButtonClass}>
                        {t('forms.editor.versions.close')}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-foreground">{t('forms.mod.intro')}</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                    <li className="flex items-start gap-1.5">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {t('forms.mod.note.optional')}
                    </li>
                    <li className="flex items-start gap-1.5">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {t('forms.mod.note.noReminders')}
                    </li>
                </ul>

                {flash && (
                    <p role={flash.ok ? 'status' : 'alert'} className={`rounded-lg px-3 py-2 text-sm ${flash.ok ? 'bg-success/10 text-foreground' : 'border border-destructive/40 bg-destructive/5 text-destructive'}`}>
                        {flash.text}
                    </p>
                )}

                {failed ? (
                    <LoadError onRetry={load} />
                ) : !catalog || !meter ? (
                    <LoadingText />
                ) : (
                    <>
                        <div>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span id="mod-limit-label">{t('forms.mod.limit', { used: meter.used, max: meter.max })}</span>
                                {meter.full ? <Chip tone="destructive">{t('forms.mod.limit.full')}</Chip> : meter.nearly && <Chip tone="warning">{t('forms.mod.limit.nearly', { count: meter.remaining })}</Chip>}
                            </div>
                            <progress
                                value={meter.used}
                                max={meter.max}
                                aria-labelledby="mod-limit-label"
                                className={`mt-1 h-2 w-full ${meter.full ? 'accent-[var(--color-destructive,currentColor)]' : meter.nearly ? 'accent-[var(--color-warning,currentColor)]' : 'accent-[var(--color-primary,currentColor)]'}`}
                            />
                        </div>

                        {groupModules(catalog).map(({ group, modules }) => {
                            const key = groupLabelKey(group.id);
                            const headingId = `mod-group-${group.id}`;
                            return (
                                <section key={group.id} aria-labelledby={headingId}>
                                    <h3 id={headingId} className="text-sm font-bold text-foreground">
                                        {key ? t(key) : group.label}
                                    </h3>
                                    {modules.some((m) => m.neverMandatoryGroup) && <p className="mt-0.5 text-xs text-muted-foreground">{t('forms.mod.neverMandatory')}</p>}
                                    <ul className="mt-2 space-y-2">
                                        {modules.map((m) => {
                                            const aud = moduleAudience(m);
                                            const block = toggleBlock(m, catalog.limit, canReadSensitive);
                                            const privacy = PRIVACY_NOTE_MODULES[m.id];
                                            const descId = `mod-${m.id}-desc`;
                                            return (
                                                <li key={m.id} className="rounded-xl border border-border bg-card p-3">
                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="break-words text-sm font-semibold text-foreground">{m.label}</p>
                                                            {m.description && (
                                                                <p id={descId} className="mt-0.5 break-words text-xs text-muted-foreground">
                                                                    {m.description}
                                                                </p>
                                                            )}
                                                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                                <Chip tone={m.state === 'active' ? 'success' : m.state === 'archived' ? 'warning' : 'muted'}>{t(`forms.mod.state.${m.state}`)}</Chip>
                                                                <Chip tone="muted">
                                                                    {(m.sensitive || m.visibleTo === 'vorstand') && <Lock className="mr-1 h-3 w-3" aria-hidden="true" />}
                                                                    {t(aud.key)}
                                                                </Chip>
                                                                {aud.confidential && <Chip tone="warning">{t('forms.mod.confidential')}</Chip>}
                                                                <Chip tone="muted">{t(`forms.editor.type.${m.type}`)}</Chip>
                                                                {m.customized && <Chip tone="primary">{t('forms.mod.customized')}</Chip>}
                                                            </div>
                                                            {m.customized && <p className="mt-1 text-xs text-muted-foreground">{t('forms.mod.customized.hint')}</p>}
                                                            {m.state === 'archived' && <p className="mt-1 text-xs text-muted-foreground">{t('forms.mod.archived.hint')}</p>}
                                                            {privacy && (
                                                                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-foreground">
                                                                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                                                                    {t(privacy)}
                                                                </p>
                                                            )}
                                                            {block && <p className="mt-1 text-xs text-muted-foreground">{t(block === 'limit' ? 'forms.mod.block.limit' : 'forms.mod.block.sensitive')}</p>}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => void toggle(m)}
                                                            disabled={busyId !== null || block !== null}
                                                            aria-describedby={m.description ? descId : undefined}
                                                            aria-label={t(m.state === 'active' ? 'forms.mod.deactivateNamed' : m.state === 'archived' ? 'forms.mod.reactivateNamed' : 'forms.mod.activateNamed', { label: m.label })}
                                                            className={m.state === 'active' ? secondaryButtonClass : primaryButtonClass}
                                                        >
                                                            {t(m.state === 'active' ? 'forms.mod.deactivate' : m.state === 'archived' ? 'forms.mod.reactivate' : 'forms.mod.activate')}
                                                        </button>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </section>
                            );
                        })}
                    </>
                )}
            </div>
            {dialog}
        </Modal>
    );
}
