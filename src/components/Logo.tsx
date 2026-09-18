export default function Logo() {
    return (
        <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- plain <img>
                avoids next/image's `dangerouslyAllowSVG` requirement for a
                trusted local static asset */}
            <img src="/myverein.svg" alt="MyVerein" width={48} height={48} className="h-10 w-10 rounded-md" />
            <span className="text-xl text-card-foreground font-bold tracking-tight">
                MyVerein
            </span>
        </div>
    );
}
