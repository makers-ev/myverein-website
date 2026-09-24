'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import { Modal } from '@/components/Modal';
import { ApiError } from '@/lib/api-client';

export type T = (key: string) => string;

export const inputClass =
    'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none';
export const primaryButtonClass =
    'inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50';
export const secondaryButtonClass =
    'inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50';
export const iconButtonClass = 'rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground';

export function errorMessage(err: unknown): string {
    return err instanceof ApiError ? err.message : 'Request failed';
}

export function formatDate(value: string | null): string {
    if (!value) return '—';
    // Plain `YYYY-MM-DD` would parse as UTC midnight; read it as a local day instead.
    return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00` : value).toLocaleDateString('de-DE');
}

export function SectionCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
    return (
        <section className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-foreground">{title}</h2>
                {action}
            </div>
            {children}
        </section>
    );
}

export function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center">
            <span className="text-muted-foreground">{icon}</span>
            <p className="text-sm text-muted-foreground">{text}</p>
        </div>
    );
}

export type Tone = 'success' | 'warning' | 'destructive' | 'primary' | 'muted';

const toneClass: Record<Tone, string> = {
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
    primary: 'bg-primary/10 text-primary',
    muted: 'bg-muted text-muted-foreground',
};

export function Chip({ tone, children }: { tone: Tone; children: ReactNode }) {
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneClass[tone]}`}>{children}</span>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
            {children}
        </label>
    );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
    return (
        <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-center gap-3 text-sm text-foreground">
            <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
            </span>
            {label}
        </button>
    );
}

/** Modal wrapping a form; the footer submit button targets the form via its id. */
export function FormModal({
    open,
    title,
    submitLabel,
    cancelLabel,
    canSubmit,
    onClose,
    onSubmit,
    children,
}: {
    open: boolean;
    title: string;
    submitLabel: string;
    cancelLabel: string;
    canSubmit: boolean;
    onClose: () => void;
    // Resolves to an error message, or null on success.
    onSubmit: () => Promise<string | null>;
    children: ReactNode;
}) {
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    function close() {
        setError(null);
        onClose();
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!canSubmit || submitting) return;
        setSubmitting(true);
        setError(null);
        const result = await onSubmit();
        setSubmitting(false);
        if (result) setError(result);
        else close();
    }

    return (
        <Modal
            open={open}
            onClose={close}
            title={title}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={close} className={secondaryButtonClass}>
                        {cancelLabel}
                    </button>
                    <button type="submit" form="standorte-form-modal" disabled={!canSubmit || submitting} className={primaryButtonClass}>
                        {submitLabel}
                    </button>
                </div>
            }
        >
            <form id="standorte-form-modal" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                {children}
                {error && <p className="text-sm text-destructive">{error}</p>}
            </form>
        </Modal>
    );
}

export function ConfirmModal({
    open,
    title,
    message,
    confirmLabel,
    cancelLabel,
    onClose,
    onConfirm,
}: {
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    onClose: () => void;
    onConfirm: () => Promise<string | null>;
}) {
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    function close() {
        setError(null);
        onClose();
    }

    async function confirm() {
        setBusy(true);
        const result = await onConfirm();
        setBusy(false);
        if (result) setError(result);
        else close();
    }

    return (
        <Modal
            open={open}
            onClose={close}
            title={title}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={close} className={secondaryButtonClass}>
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={() => void confirm()}
                        disabled={busy}
                        className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
                    >
                        {confirmLabel}
                    </button>
                </div>
            }
        >
            <p className="text-sm text-foreground">{message}</p>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </Modal>
    );
}

/** Wraps an API call so it resolves to an error message (or null) for FormModal/ConfirmModal. */
export async function run(action: () => Promise<unknown>): Promise<string | null> {
    try {
        await action();
        return null;
    } catch (err) {
        return errorMessage(err);
    }
}
