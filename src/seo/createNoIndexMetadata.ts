import { Metadata } from "next";

interface NoIndexMetadataParams {
    title: string;
}

/** For pages behind auth ((protected)/*): no OG/Twitter/canonical, just a title and a hard noindex -- nothing there is meant to be publicly discoverable. */
export function createNoIndexMetadata({ title }: NoIndexMetadataParams): Metadata {
    return {
        title,
        robots: {
            index: false,
            follow: false,
        },
    };
}
