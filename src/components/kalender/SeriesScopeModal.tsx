'use client';

import { useState } from 'react';
import { Repeat } from 'lucide-react';

import { Modal } from '@/components/Modal';
import { Toggle } from '@/components/standorte/ui';

import { type CalendarEvent, type TFn, dangerBtn, errorMessage, inputClass, labelClass, primaryBtn, secondaryBtn } from './calendarTypes';
import { type SeriesScope, affectedSignups } from './eventSeries';

const REASON_MAX = 500;
const SCOPES: SeriesScope[] = ['this', 'this_and_following', 'all'];

interface Props {
    mode: 'edit' | 'delete';
    event: CalendarEvent;
    t: TFn;
    onClose: () => void;
    /** Delete mode also hands over reason and notify; edit mode just the scope. A rejection is shown in the dialog. */
    onConfirm: (scope: SeriesScope, extras: { reason: string; notify: boolean }) => Promise<void> | void;
}

/** "Nur dieser / Dieser und folgende / Alle" before editing or deleting an occurrence of a recurring event. */
export default function SeriesScopeModal({ mode, event, t, onClose, onConfirm }: Props) {
    const [scope, setScope] = useState<SeriesScope>('this');
    const [reason, setReason] = useState('');
    const [notify, setNotify] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const signups = affectedSignups(event);
    const isDelete = mode === 'delete';

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            await onConfirm(scope, { reason: reason.trim(), notify });
        } catch (err) {
            setError(errorMessage(err, t));
            setBusy(false);
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            title={t(isDelete ? 'kalender.series.scope.delete.title' : 'kalender.series.scope.edit.title')}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className={secondaryBtn}>
                        {t('kalender.cancel')}
                    </button>
                    <button type="submit" form="series-scope-form" disabled={busy} className={isDelete ? dangerBtn : primaryBtn}>
                        {t(isDelete ? 'kalender.series.scope.delete.confirm' : 'kalender.series.scope.edit.confirm')}
                    </button>
                </div>
            }
        >
            <form id="series-scope-form" onSubmit={(e) => void submit(e)} className="space-y-4">
                <p className="flex items-start gap-2 text-sm text-foreground">
                    <Repeat className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span>{t('kalender.series.scope.intro', { title: event.title })}</span>
                </p>
                <fieldset className="space-y-2">
                    <legend className="sr-only">{t('kalender.series.scope.legend')}</legend>
                    {SCOPES.map((value) => (
                        <label key={value} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${scope === value ? 'border-primary bg-primary/5' : 'border-border'}`}>
                            <input type="radio" name="series-scope" className="mt-1" checked={scope === value} onChange={() => setScope(value)} autoFocus={value === 'this'} />
                            <span>
                                <span className="block font-semibold text-foreground">{t(`kalender.series.scope.${value}`)}</span>
                                <span className="block text-xs text-muted-foreground">{t(`kalender.series.scope.${value}.hint`)}</span>
                            </span>
                        </label>
                    ))}
                </fieldset>
                {signups > 0 && (
                    <p role="status" className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-foreground">
                        {t(scope === 'this' ? 'kalender.series.scope.signups.this' : 'kalender.series.scope.signups.more', { count: signups })}
                    </p>
                )}
                {isDelete && (
                    <>
                        <div>
                            <label htmlFor="series-reason" className={labelClass}>
                                {t('kalender.cancelEvent.reason')}
                            </label>
                            <textarea id="series-reason" rows={2} maxLength={REASON_MAX} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} placeholder={t('kalender.cancelEvent.reason.placeholder')} />
                            <p className="mt-1 text-xs text-muted-foreground">{t('kalender.series.scope.delete.reason-hint')}</p>
                        </div>
                        <div className="space-y-1">
                            <Toggle checked={notify} onChange={setNotify} label={t('kalender.notify.label')} />
                            <p className="text-xs text-muted-foreground">{t(notify ? 'kalender.series.scope.delete.notify' : 'kalender.notify.off')}</p>
                        </div>
                    </>
                )}
                {error && (
                    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                    </p>
                )}
            </form>
        </Modal>
    );
}
