'use client';

import { useId, useRef, useState } from 'react';
import { Upload } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { DOCUMENT_ACCEPT, documentErrorKey, fileProblem } from '@/lib/documents';
import { primaryButtonClass } from '@/components/standorte/ui';

/**
 * File picker with drag and drop and a progress bar (Wave 13 W2/W3/W4). Files are sent one after the other through `onUpload`; the
 * client only checks type and size for a friendly message, the server validates the content again.
 */
export default function UploadControl({
    onUpload,
    onDone,
    kind = 'document',
    multiple = false,
    label,
    hint,
    disabled = false,
}: {
    onUpload: (file: File, onProgress: (percent: number | null) => void) => Promise<void>;
    /** Called once after all chosen files were processed (also if some failed). */
    onDone: () => void;
    kind?: 'document' | 'logo';
    multiple?: boolean;
    label?: string;
    hint?: string;
    disabled?: boolean;
}) {
    const { t } = useLanguage();
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState<{ name: string; percent: number | null; index: number; total: number } | null>(null);
    const [errors, setErrors] = useState<string[]>([]);
    const [over, setOver] = useState(false);

    async function handle(list: FileList | File[]) {
        const files = Array.from(list);
        if (files.length === 0 || busy) return;
        const failed: string[] = [];
        for (const [index, file] of files.entries()) {
            const problem = fileProblem(file, kind);
            if (problem) {
                failed.push(`${file.name}: ${t(problem)}`);
                continue;
            }
            setBusy({ name: file.name, percent: 0, index: index + 1, total: files.length });
            try {
                await onUpload(file, (percent) => setBusy((b) => (b ? { ...b, percent } : b)));
            } catch (err) {
                failed.push(`${file.name}: ${t(documentErrorKey(err))}`);
            }
        }
        setBusy(null);
        setErrors(failed);
        if (inputRef.current) inputRef.current.value = '';
        onDone();
    }

    return (
        <div
            onDragOver={(e) => {
                if (disabled) return;
                e.preventDefault();
                setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setOver(false);
                if (!disabled) void handle(multiple ? e.dataTransfer.files : Array.from(e.dataTransfer.files).slice(0, 1));
            }}
            className={`rounded-lg border border-dashed p-3 ${over ? 'border-primary bg-primary/5' : 'border-border'}`}
        >
            <div className="flex flex-wrap items-center gap-3">
                <input
                    ref={inputRef}
                    id={inputId}
                    type="file"
                    accept={kind === 'logo' ? 'image/png,image/jpeg' : DOCUMENT_ACCEPT}
                    multiple={multiple}
                    disabled={disabled || !!busy}
                    className="sr-only"
                    onChange={(e) => e.target.files && void handle(e.target.files)}
                />
                <label htmlFor={inputId} className={`${primaryButtonClass} cursor-pointer ${disabled || busy ? 'pointer-events-none opacity-50' : ''}`}>
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    {label ?? t(multiple ? 'docs.upload.choose.many' : 'docs.upload.choose')}
                </label>
                <p className="text-xs text-muted-foreground">{hint ?? t(kind === 'logo' ? 'docs.upload.hint.logo' : 'docs.upload.hint')}</p>
            </div>
            {busy && (
                <div className="mt-3" role="status">
                    <p className="text-xs text-foreground">
                        {t('docs.upload.progress', { name: busy.name, index: busy.index, total: busy.total })}
                    </p>
                    <progress className="mt-1 h-2 w-full" max={100} value={busy.percent ?? undefined} aria-label={t('docs.upload.progressLabel')} />
                </div>
            )}
            {errors.length > 0 && (
                <ul role="alert" className="mt-3 space-y-1 text-xs text-destructive">
                    {errors.map((e) => (
                        <li key={e}>{e}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}
