'use client';

import { ErrorState } from '@/components/ui';

/** Error state of an initial load with a retry button (instead of a spinner that never ends). Thin wrapper around `ErrorState`. */
export default function LoadError({ onRetry, className = '', error }: { onRetry: () => void; className?: string; error?: unknown }) {
    return <ErrorState error={error} onRetry={onRetry} className={className} />;
}
