'use client';

import { useEffect, useRef } from 'react';

/**
 * Guards unsaved edits against leaving the page: the browser's own prompt for reload/close (`beforeunload`) and the Back button
 * (`popstate`): while `dirty`, one extra history entry is pushed; pressing Back lands on the page again and `ask` decides -- on
 * "stay" the entry is pushed again, on "leave" the history goes back for real. Tab switches inside the page are guarded by the caller.
 */
export function useUnsavedGuard(dirty: boolean, ask: () => Promise<boolean>): void {
    const askRef = useRef(ask);
    useEffect(() => {
        askRef.current = ask;
    });

    useEffect(() => {
        if (!dirty) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        window.history.pushState({ unsavedGuard: true }, '', window.location.href);
        let leaving = false;
        const onPopState = () => {
            if (leaving) return;
            // We are back on the page's own entry: put the guard entry back first, then ask.
            window.history.pushState({ unsavedGuard: true }, '', window.location.href);
            void askRef.current().then((leave) => {
                if (!leave) return;
                leaving = true;
                window.removeEventListener('popstate', onPopState);
                window.history.go(-2);
            });
        };
        window.addEventListener('popstate', onPopState);
        return () => {
            window.removeEventListener('beforeunload', onBeforeUnload);
            window.removeEventListener('popstate', onPopState);
            // Edits were saved or discarded: drop our guard entry if it is still the current one.
            if (!leaving && (window.history.state as { unsavedGuard?: boolean } | null)?.unsavedGuard) window.history.back();
        };
    }, [dirty]);
}
