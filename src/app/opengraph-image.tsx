import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { title, description, logoPath } from '../../project.config.json';
// Not primaryColor: the shipped logo (public/lpj-its.svg) bakes in its own
// black background -- swapping only this container's color would clash
// with it. A project that changes the logo can change this literal too.

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
                    backgroundColor: '#000000',
                }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders via Satori, not the DOM; next/image isn't usable here. */}
                <img src={logoDataUrl} width={220} height={220} alt="" />
                <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 760 }}>
                    <div style={{ fontSize: 56, fontWeight: 700, color: '#ffffff' }}>{title}</div>
                    <div style={{ fontSize: 28, color: '#a3a3a3', marginTop: 20 }}>{description}</div>
                </div>
            </div>
        ),
        size,
    );
}
