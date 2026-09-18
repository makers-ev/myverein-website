export interface JsonLdParams {
    url: string;
    headline: string;
    description: string;
    image: string;
    dateCreated?: string;
    datePublished?: string;
    dateModified?: string;
    authorName?: string;
    authorUrl?: string;
    publisherName?: string;
    publisherLogo?: string;
    inLanguage?: string;
    isFamilyFriendly?: boolean | string;
    type?: string; // default "WebSite", e.g. "BlogPosting" for an article page
}

export function createJsonLd({
    url,
    headline,
    description,
    image,
    dateCreated,
    datePublished,
    dateModified,
    authorName,
    authorUrl,
    publisherName,
    publisherLogo,
    inLanguage = "en-US",
    isFamilyFriendly = true,
    // "WebSite" fits every page this template ships (marketing/account
    // pages, not articles) -- pass `type: "BlogPosting"` explicitly for an
    // actual blog/article page if one gets added later.
    type = "WebSite",
}: JsonLdParams): Record<string, unknown> {
    return {
        "@context": "https://schema.org",
        "@type": type,
        mainEntityOfPage: {
            "@type": "WebPage",
            "@id": url,
        },
        headline,
        description,
        image,
        dateCreated,
        datePublished,
        dateModified,
        author: authorName
            ? {
                "@type": "Person",
                name: authorName,
                ...(authorUrl ? { url: authorUrl } : {}),
            }
            : undefined,
        publisher: publisherName
            ? {
                "@type": "Person",
                name: publisherName,
                ...(publisherLogo ? { logo: { "@type": "ImageObject", url: publisherLogo } } : {}),
            }
            : undefined,
        inLanguage,
        isFamilyFriendly: isFamilyFriendly ? String(isFamilyFriendly) : undefined,
    };
}
