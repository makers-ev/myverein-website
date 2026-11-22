/** `decorative` hides the image from assistive tech and text extraction when the wordmark next to it already names the brand. */
export default function Logo({ decorative = false }: { decorative?: boolean } = {}) {
    return (
        <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>
                avoids next/image's `dangerouslyAllowSVG` requirement for a
                trusted local static asset */}
            <img src="/myverein.svg" alt={decorative ? '' : 'MyVerein'} width={48} height={48} className="h-8 w-8 rounded-md" />
            <span className="text-lg font-semibold leading-none text-card-foreground">MyVerein</span>
        </div>
    );
}
