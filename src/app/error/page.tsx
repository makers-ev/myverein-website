import Link from "next/link";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

// searchParams is a Promise in Next.js 16.
interface ErrorPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ErrorPage(props: ErrorPageProps) {
    const params = await props.searchParams;
    const error = typeof params.error === "string" ? params.error : "Default";

    const errorMap: Record<string, string> = {
        Configuration: "There is a problem with the server configuration.",
        AccessDenied: "You do not have permission to view this page.",
        Verification: "The verification link was invalid or has expired.",
        Default: "An unexpected error occurred. Please try again.",
    };

    const message = errorMap[error] || errorMap.Default;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="w-full max-w-md transform overflow-hidden rounded-2xl bg-card p-8 shadow-xl transition-all duration-500 hover:shadow-2xl">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-6 rounded-full bg-red-100 dark:bg-red-950 p-4">
                        <ExclamationTriangleIcon className="h-12 w-12 text-red-600 dark:text-red-400" />
                    </div>

                    <h1 className="mb-2 text-3xl font-bold text-card-foreground">
                        Oops!
                    </h1>

                    <p className="mb-8 text-lg text-muted-foreground">
                        {message}
                    </p>

                    <div className="space-y-4 w-full">
                        <Link
                            href="/login-signup"
                            className="block w-full rounded-lg bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground transition-transform duration-200 hover:-translate-y-1 hover:brightness-110 active:scale-95"
                        >
                            Try Signing In Again
                        </Link>

                        <Link
                            href="/"
                            className="block w-full rounded-lg border border-border bg-card px-5 py-3 text-center text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                        >
                            Return Home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
