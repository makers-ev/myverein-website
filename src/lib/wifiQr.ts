// Fallback builder, mirrors the backend's `src/lib/wifi-qr.ts` (the backend's `qrPayload` is authoritative):
// `WIFI:T:<WPA|WEP|SAE|nopass>;S:<ssid>;P:<password>;;`, WPA3 announced as `SAE`.
// `;`, `,`, `"`, `:` and `\` are backslash-escaped so they can't terminate a field early, and an all-hex value is
// quoted because scanners would otherwise read it as a raw hex key/SSID.
function escapeWifiField(value: string): string {
    const escaped = value.replace(/([\\;,":])/g, '\\$1');
    return /^[0-9a-fA-F]+$/.test(value) ? `"${escaped}"` : escaped;
}

/**
 * Builds a scannable WiFi QR payload. Without an explicit `security` an empty password yields an open (`nopass`)
 * network and anything else WPA, like the backend does for legacy rows.
 */
export function buildWifiQrPayload(ssid: string, password: string, security?: WifiSecurity): string {
    const type = security ?? (password ? 'wpa' : 'open');
    const s = escapeWifiField(ssid);
    if (type === 'open') return `WIFI:T:nopass;S:${s};;`;
    const t = type === 'wep' ? 'WEP' : type === 'wpa3' ? 'SAE' : 'WPA';
    return `WIFI:T:${t};S:${s};P:${escapeWifiField(password)};;`;
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
export function wifiQrValue(network: { ssid: string; password: string; security?: unknown; qrPayload?: unknown }): string {
    return typeof network.qrPayload === 'string' && network.qrPayload.startsWith('WIFI:') ? network.qrPayload : buildWifiQrPayload(network.ssid, network.password, securityOf(network));
}
