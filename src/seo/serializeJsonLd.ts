/**
 * JSON for an inline `<script type="application/ld+json">`: `<` (so `</script>` or `<!--` in released text cannot end the script) and
 * the line separators U+2028/U+2029 are written as unicode escapes. The result is still valid JSON with identical content.
 */
export function serializeJsonLd(json: unknown): string {
    return JSON.stringify(json).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
