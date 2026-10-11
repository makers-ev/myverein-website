'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';

import { Modal } from '@/components/Modal';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    checkPhotoFile,
    DEFAULT_CROP,
    decodeUpright,
    drawCrop,
    MAX_ZOOM,
    PHOTO_MIME_TYPES,
    photoProblemKey,
    renderCropToJpeg,
    type CropState,
} from '@/lib/memberPhoto';
import { primaryButtonClass, secondaryButtonClass } from '@/lib/clubMembers';

const PREVIEW_SIZE = 256;

/**
 * Pick a photo, frame it (centered square, zoom and shift) and upload it. The picked file is decoded with its EXIF
 * rotation applied and re-encoded as a 512 px JPEG via canvas, so the upright image is what the backend stores (it
 * only strips metadata and does not rotate). `onSave` performs the request and throws a translated-error key holder
 * (`Error.message` is shown as is) on failure.
 */
export default function MemberPhotoDialog({
    title,
    onClose,
    onSave,
}: {
    title: string;
    onClose: () => void;
    /** Uploads the JPEG; resolves on success (the dialog closes), rejects with an `Error` carrying the user-facing text. */
    onSave: (jpeg: Blob) => Promise<void>;
}) {
    const { t } = useLanguage();
    const inputId = useId();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
    const [crop, setCrop] = useState<CropState>(DEFAULT_CROP);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // Release the decoded bitmap when it is replaced or the dialog goes away.
    useEffect(() => () => bitmap?.close(), [bitmap]);

    useEffect(() => {
        if (bitmap && canvasRef.current) drawCrop(canvasRef.current, bitmap, crop, PREVIEW_SIZE);
    }, [bitmap, crop]);

    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setError(null);
        const problem = checkPhotoFile(file);
        if (problem) {
            setError(t(photoProblemKey(problem)));
            return;
        }
        try {
            const decoded = await decodeUpright(file);
            setCrop(DEFAULT_CROP);
            setBitmap(decoded);
        } catch {
            setError(t('verein.photo.err.invalid'));
        }
    }

    async function handleSave() {
        if (!bitmap) return;
        setBusy(true);
        setError(null);
        try {
            const jpeg = await renderCropToJpeg(bitmap, crop);
            await onSave(jpeg);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('verein.err.generic'));
            setBusy(false);
        }
    }

    const slider = 'w-full accent-[var(--color-primary,currentColor)]';

    return (
        <Modal
            open
            title={title}
            onClose={busy ? () => {} : onClose}
            footer={
                <div className="flex items-center justify-end gap-2">
                    <button type="button" onClick={onClose} disabled={busy} className={secondaryButtonClass}>
                        {t('verein.roles.add.cancel')}
                    </button>
                    <button type="button" onClick={() => void handleSave()} disabled={busy || !bitmap} className={primaryButtonClass}>
                        {busy ? t('verein.photo.uploading') : t('verein.photo.save')}
                    </button>
                </div>
            }
        >
            <p className="text-sm text-muted-foreground">{t('verein.photo.hint')}</p>

            <div className="mt-4 flex flex-col items-center gap-4">
                {bitmap ? (
                    <canvas
                        ref={canvasRef}
                        role="img"
                        aria-label={t('verein.photo.preview')}
                        className="h-48 w-48 rounded-full border border-border bg-muted"
                    />
                ) : (
                    <div className="flex h-48 w-48 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
                        <ImagePlus className="h-10 w-10" aria-hidden="true" />
                    </div>
                )}

                <div>
                    <label htmlFor={inputId} className={`${secondaryButtonClass} inline-block cursor-pointer`}>
                        {bitmap ? t('verein.photo.choose.other') : t('verein.photo.choose')}
                    </label>
                    <input
                        id={inputId}
                        type="file"
                        accept={PHOTO_MIME_TYPES.join(',')}
                        onChange={(e) => void handleFile(e)}
                        disabled={busy}
                        className="sr-only"
                    />
                </div>

                {bitmap && (
                    <div className="w-full space-y-3 text-xs font-semibold text-muted-foreground">
                        <label className="block">
                            {t('verein.photo.zoom')}
                            <input
                                type="range"
                                min={1}
                                max={MAX_ZOOM}
                                step={0.05}
                                value={crop.zoom}
                                onChange={(e) => setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))}
                                className={slider}
                            />
                        </label>
                        <label className="block">
                            {t('verein.photo.horizontal')}
                            <input
                                type="range"
                                min={-1}
                                max={1}
                                step={0.05}
                                value={crop.offsetX}
                                onChange={(e) => setCrop((c) => ({ ...c, offsetX: Number(e.target.value) }))}
                                className={slider}
                            />
                        </label>
                        <label className="block">
                            {t('verein.photo.vertical')}
                            <input
                                type="range"
                                min={-1}
                                max={1}
                                step={0.05}
                                value={crop.offsetY}
                                onChange={(e) => setCrop((c) => ({ ...c, offsetY: Number(e.target.value) }))}
                                className={slider}
                            />
                        </label>
                    </div>
                )}
            </div>

            {error && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                    {error}
                </p>
            )}
        </Modal>
    );
}
