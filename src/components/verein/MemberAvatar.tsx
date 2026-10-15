'use client';

import { useRef, useState } from 'react';

import { initialsOf } from '@/lib/memberPhoto';

const SIZES = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-14 w-14 text-lg',
    lg: 'h-24 w-24 text-3xl',
} as const;

/**
 * Round member photo with an initials fallback (`photoUrl` null/absent, or the image failed to load).
 *
 * `photoUrl` is a short-lived signed URL from the media layer, so a failed load most likely means it expired (403/404):
 * `onExpired` is called once to refetch the resource that carried the URL; the initials show meanwhile. A fresh URL that
 * fails again does not trigger another refetch (no loop) until an image loaded successfully. Decorative: the person's
 * name always stands next to it, so the image has an empty alt text.
 */
export default function MemberAvatar({
    name,
    photoUrl,
    size = 'sm',
    onExpired,
}: {
    name: string | null | undefined;
    photoUrl?: string | null;
    size?: keyof typeof SIZES;
    onExpired?: () => void;
}) {
    const [failedUrl, setFailedUrl] = useState<string | null>(null);
    const refetched = useRef(false);
    const showImage = !!photoUrl && failedUrl !== photoUrl;

    return (
        <span
            className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 font-bold text-primary ${SIZES[size]}`}
            aria-hidden="true"
        >
            {showImage ? (
                // Signed media URL on the backend origin (CSP img-src); next/image would proxy it through this server.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={photoUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                    onLoad={() => {
                        refetched.current = false;
                    }}
                    onError={() => {
                        setFailedUrl(photoUrl);
                        if (!refetched.current) {
                            refetched.current = true;
                            onExpired?.();
                        }
                    }}
                />
            ) : (
                initialsOf(name)
            )}
        </span>
    );
}
