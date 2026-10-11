// Standard WiFi QR payload: `WIFI:S:<ssid>;T:WPA;P:<password>;;`.
// `;`, `,`, `"`, `:` and `\` are backslash-escaped so they can't terminate a field early.
function escapeWifiField(value: string): string {
    return value.replace(/([\\;,":])/g, '\\$1');
}

/** Builds a scannable WiFi QR payload; an empty password yields an open (`T:nopass`) network. */
export function buildWifiQrPayload(ssid: string, password: string): string {
    if (!password) return `WIFI:S:${escapeWifiField(ssid)};T:nopass;;`;
    return `WIFI:S:${escapeWifiField(ssid)};T:WPA;P:${escapeWifiField(password)};;`;
}

/** WLAN security types (backend `WifiSecurity`, Wave 7 B14). */
export const WIFI_SECURITIES = ['open', 'wpa', 'wep', 'wpa3'] as const;
export type WifiSecurity = (typeof WIFI_SECURITIES)[number];

export function isWifiSecurity(value: unknown): value is WifiSecurity {
    return typeof value === 'string' && (WIFI_SECURITIES as readonly string[]).includes(value);
}

/**
 * Security type of a row from the API. An older response without `security` is derived like the backend does for
 * legacy clients: no password = open, anything else wpa.
 */
export function securityOf(row: { security?: unknown; password?: string | null }): WifiSecurity {
    if (isWifiSecurity(row.security)) return row.security;
    return row.password ? 'wpa' : 'open';
}

/** An open network has no password; every other type needs one (the backend answers 422 otherwise). */
export function wifiNeedsPassword(security: WifiSecurity): boolean {
    return security !== 'open';
}

/** Password to send: never for an open network (the backend does not store one). */
export function wifiPasswordFor(security: WifiSecurity, password: string): string {
    return wifiNeedsPassword(security) ? password.trim() : '';
}

/** QR string for a network: the backend's `qrPayload` is authoritative; the local builder is only the fallback for older responses. */
export function wifiQrValue(network: { ssid: string; password: string; qrPayload?: unknown }): string {
    return typeof network.qrPayload === 'string' && network.qrPayload.startsWith('WIFI:') ? network.qrPayload : buildWifiQrPayload(network.ssid, network.password);
}
