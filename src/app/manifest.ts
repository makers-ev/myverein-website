import { MetadataRoute } from "next";

import { title, description } from "../../project.config.json";

// theme_color/background_color mirror globals.css's --primary and light-mode
// --background tokens -- keep both in sync if the palette changes there.
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: title,
        short_name: title,
        description,
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#1e293b",
        icons: [
            {
                src: "/icon",
                sizes: "32x32",
                type: "image/png",
            },
            {
                src: "/apple-icon",
                sizes: "180x180",
                type: "image/png",
            },
        ],
    };
}
