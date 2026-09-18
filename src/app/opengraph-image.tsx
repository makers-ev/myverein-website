import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { title, description, logoPath, primaryColor } from '../../project.config.json';
// Uses primaryColor (Vereinsblau) directly -- the shipped logo (public/
// myverein.svg) already bakes in the same hue as its own square background,
// so the OG card reads as one consistent color instead of the logo floating
// on an unrelated container color.

// Generated at build time (no request-time data), cached like a static
// asset -- fixes the previous default OG image (the 1000x1000 logo PNG
// declared as 1200x630) without needing a hand-made design asset.
export const runtime = 'nodejs';
export const alt = title;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
    // turbopackIgnore: logoPath is a JSON-imported string, not a dynamic
    // require -- without the comment Turbopack can't statically resolve it
    // and conservatively traces the whole project into the build output.
    const logoSvg = await readFile(join(/*turbopackIgnore: true*/ process.cwd(), logoPath), 'utf8');
    const logoDataUrl = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;

    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 56,
                    backgroundColor: primaryColor,
                }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders via Satori, not the DOM; next/image isn't usable here. */}
                <img src={logoDataUrl} width={220} height={220} alt="" />
                <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 760 }}>
                    <div style={{ fontSize: 56, fontWeight: 700, color: '#ffffff' }}>{title}</div>
                    {/* #c9d3e0, not a plain gray -- 6.12:1 against primaryColor, computed
                        (the old #a3a3a3 only cleared 3.67:1 once the background changed
                        from the previous logo's black to Vereinsblau). */}
                    <div style={{ fontSize: 28, color: '#c9d3e0', marginTop: 20 }}>{description}</div>
                </div>
            </div>
        ),
        size,
    );
}
