import React from "react";

import { serializeJsonLd } from "@/seo/serializeJsonLd";

interface JsonLdProps {
    json: Record<string, unknown>;
    /** Request nonce (see proxy.ts) -- required on every page that renders this, or the app's CSP silently drops the structured data. */
    nonce?: string;
}

export default function JsonLd({ json, nonce }: JsonLdProps) {
    return (
        <script
            type="application/ld+json"
            nonce={nonce}
            // safe: server-rendered JSON-LD — no client-only APIs used
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(json) }}
        />
    );
}
