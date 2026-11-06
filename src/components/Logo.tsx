export default function Logo() {
    return (
        <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>
                avoids next/image's `dangerouslyAllowSVG` requirement for a
                trusted local static asset */}
            <img src="/myverein.svg" alt="MyVerein" width={48} height={48} className="h-8 w-8 rounded-md" />
            <span className="text-lg font-semibold leading-none text-card-foreground">MyVerein</span>
        </div>
    );
}
