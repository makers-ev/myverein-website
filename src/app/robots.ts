import { MetadataRoute } from "next";
import { url } from "../../project.config.json";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "Googlebot",
                allow: "/",
                disallow: "/admin",
            },
            {
                userAgent: ["Bingbot", "SemrushBot"],
                disallow: "/",
            },
        ],
        // `url` in project.config.json already carries the protocol (see how every
        // page.tsx passes it straight into `alternates.canonical`) --
        // prepending "https://" here would double it up.
        sitemap: `${url}/sitemap.xml`,
    };
}
