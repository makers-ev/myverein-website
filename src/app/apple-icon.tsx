import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { logoPath } from '../../project.config.json';

// Apple's recommended touch-icon size; also serves as the source Next
// resizes down for smaller apple-touch-icon variants.
export const runtime = 'nodejs';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default async function AppleIcon() {
    // turbopackIgnore: logoPath is a JSON-imported string, not a dynamic
    // require -- without the comment Turbopack can't statically resolve it
    // and conservatively traces the whole project into the build output.
    const logoSvg = await readFile(join(/*turbopackIgnore: true*/ process.cwd(), logoPath), 'utf8');
    const logoDataUrl = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;

    return new ImageResponse(
        (
            // eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders via Satori, not the DOM.
            <img src={logoDataUrl} width={180} height={180} alt="" />
        ),
        size,
    );
}
