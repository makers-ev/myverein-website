import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { logoPath } from '../../project.config.json';

export const runtime = 'nodejs';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default async function Icon() {
    // turbopackIgnore: logoPath is a JSON-imported string, not a dynamic
    // require -- without the comment Turbopack can't statically resolve it
    // and conservatively traces the whole project into the build output.
    const logoSvg = await readFile(join(/*turbopackIgnore: true*/ process.cwd(), logoPath), 'utf8');
    const logoDataUrl = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;

    return new ImageResponse(
        (
            // eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders via Satori, not the DOM.
            <img src={logoDataUrl} width={32} height={32} alt="" />
        ),
        size,
    );
}
