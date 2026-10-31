'use client';

import { useCallback, useRef, useState } from 'react';

import { Modal } from '@/components/Modal';
import { useLanguage } from '@/contexts/LanguageContext';

export interface ConfirmOptions {
    title: string;
    body: React.ReactNode;
    confirmLabel: string;
    /** Red confirm button for destructive actions. */
    danger?: boolean;
    /** Label of the cancel button; default "Abbrechen". */
    cancelLabel?: string;
}

/**
 * Promise-based replacement for `window.confirm` that uses the app's own modal (translated, focus-trapped, Escape = cancel):
 * `const { confirm, dialog } = useConfirm(); if (!(await confirm({...}))) return;` -- render `dialog` once in the component.
 */
export function useConfirm(): { confirm: (options: ConfirmOptions) => Promise<boolean>; dialog: React.ReactNode } {
    const { t } = useLanguage();
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const resolver = useRef<((value: boolean) => void) | null>(null);

    const settle = useCallback((value: boolean) => {
        resolver.current?.(value);
        resolver.current = null;
        setOptions(null);
    }, []);

    const confirm = useCallback((next: ConfirmOptions) => {
        // A second request while one is open cancels the first one.
        resolver.current?.(false);
        return new Promise<boolean>((resolve) => {
            resolver.current = resolve;
            setOptions(next);
        });
    }, []);

    const dialog = options ? (
        <Modal
            open
            onClose={() => settle(false)}
            title={options.title}
            footer={
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => settle(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted">
                        {options.cancelLabel ?? t('forms.confirm.cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={() => settle(true)}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold ${options.danger ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}`}
                    >
                        {options.confirmLabel}
                    </button>
                </div>
            }
        >
            <div className="text-sm text-foreground">{options.body}</div>
        </Modal>
    ) : null;

    return { confirm, dialog };
}
