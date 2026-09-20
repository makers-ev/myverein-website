import { MetadataRoute } from "next";

import { url } from "../../project.config.json";

// Public, indexable routes only -- (protected)/* is noindex (see
// createNoIndexMetadata) and excluded here; error/reset-password/verify-email
// are transient auth-flow utility pages with no standalone SEO value.
export default function sitemap(): MetadataRoute.Sitemap {
    const routes = ["", "/features", "/about", /* "/contact", */"/roadmap", "/changelog", "/imprint", "/privacy", "/terms", "/login-signup"];

    return routes.map((route) => ({
        url: `${url}${route}`,
        lastModified: new Date(),
        changeFrequency: route === "" ? "weekly" : "monthly",
        priority: route === "" ? 1 : 0.5,
    }));
}
