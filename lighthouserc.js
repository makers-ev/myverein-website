// Report-only Lighthouse config for CI (see .github/workflows/ci.yml).
// lhci starts and stops the server itself around the audit -- avoids
// relying on a background process surviving across separate CI steps.
// No `assert` block on purpose: this is observability, not a merge gate.
module.exports = {
    ci: {
        collect: {
            startServerCommand: "npm run start",
            startServerReadyPattern: "Ready in",
            startServerReadyTimeout: 30000,
            url: ["http://localhost:3001/", "http://localhost:3001/contact", "http://localhost:3001/imprint"],
            numberOfRuns: 1,
        },
        upload: {
            // Stays local -- no external service, consistent with the
            // suite's no-external-services default (ADR-005/ADR-007).
            // .github/workflows/ci.yml uploads this folder as a CI artifact.
            target: "filesystem",
            outputDir: "./.lighthouseci",
        },
    },
};
