import { MetadataRoute } from "next";

import { fetchSitemapClubs } from "@/lib/publicClub";
import { url } from "../../project.config.json";

// Club pages come from the backend: re-read every few minutes (a withdrawn page also answers 404 at once, so a stale entry is harmless).
export const revalidate = 300;

// Public, indexable routes only -- (protected)/* is noindex (see
// createNoIndexMetadata) and excluded here; error/reset-password/verify-email
// are transient auth-flow utility pages with no standalone SEO value.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const routes = ["", "/features", "/vereinssuche", "/about", "/contact", "/roadmap", "/changelog", "/imprint", "/privacy", "/terms", "/login-signup"];

    const clubs = await fetchSitemapClubs();
    const clubEntries: MetadataRoute.Sitemap = clubs.map((c) => ({
        url: `${url}/v/${c.slug}`,
        ...(c.updatedAt && !Number.isNaN(Date.parse(c.updatedAt)) ? { lastModified: new Date(c.updatedAt) } : {}),
        changeFrequency: "weekly" as const,
        priority: 0.4,
    }));

    const base: MetadataRoute.Sitemap = routes.map((route) => ({
        url: `${url}${route}`,
        lastModified: new Date(),
        changeFrequency: route === "" ? ("weekly" as const) : ("monthly" as const),
        priority: route === "" ? 1 : 0.5,
    }));

    return [...base, ...clubEntries];
}
