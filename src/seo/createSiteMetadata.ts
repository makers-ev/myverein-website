import { Metadata } from "next";

interface SiteMetadataParams {
    title: string;
    description: string;
    url: string;
    /** Omit to fall back to the app-wide generated image (src/app/opengraph-image.tsx) instead of a page-specific one. */
    imageUrl?: string;
    creator?: string;
    keywords?: string[];
}

export function createSiteMetadata({
    title,
    description,
    url,
    imageUrl,
    creator = "",
    keywords = [],
}: SiteMetadataParams): Metadata {
    // A page that exports its own `openGraph` object (as every caller here
    // does) doesn't inherit `src/app/opengraph-image.tsx`'s file-convention
    // image automatically -- Next only falls back to it when a segment
    // defines no `openGraph` metadata at all. So the fallback has to be
    // explicit here; `/opengraph-image` resolves against `metadataBase`
    // (layout.tsx).
    const images = [{ url: imageUrl ?? "/opengraph-image", width: 1200, height: 630, alt: title }];

    return {
        title,
        description,
        keywords,
        openGraph: {
            url,
            type: "website",
            title,
            description,
            images,
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            creator,
            site: creator,
            images,
        },
        alternates: {
            canonical: url,
        },
    };
}
