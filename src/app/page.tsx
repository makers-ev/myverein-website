import { headers } from 'next/headers';

import { createSiteMetadata } from "@/seo/createSiteMetadata";
import { createJsonLd } from "@/seo/createJsonLd";
import JsonLd from "@/components/seoJsonLd";
import { title, description, url, logoUrl, keywords, author, authorUrl } from '../../project.config.json';

import HomepagePageContent from "./pageContent/Homepage";

const metadataValues = {
    title: `Start - ${title}`,
    description,
    url,
    logoUrl: url + logoUrl,
    author,
};

export const metadata = createSiteMetadata({
    title: metadataValues.title,
    description: metadataValues.description,
    url: metadataValues.url,
    creator: metadataValues.author,
    keywords: [...keywords, "start", "home", "welcome", "introduction", "overview"],
});

const jsonLd = createJsonLd({
    url: metadataValues.url,
    headline: metadataValues.title,
    description: metadataValues.description,
    image: metadataValues.logoUrl,
    authorName: metadataValues.author,
    authorUrl,
    publisherName: metadataValues.author,
    publisherLogo: metadataValues.logoUrl,
    inLanguage: "en-US",
    isFamilyFriendly: true,
});

export default async function Home() {
    // Dynamic rendering (see proxy.ts) is what makes the JSON-LD script's
    // nonce available here -- read it via headers().
    const nonce = (await headers()).get('x-nonce') ?? undefined;

    return (
        <div>
            <HomepagePageContent />
            <JsonLd json={jsonLd} nonce={nonce} />
        </div>
    );
}
