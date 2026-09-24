import { describe, expect, it } from 'vitest';
import { buildWifiQrPayload } from './wifiQr';

describe('buildWifiQrPayload', () => {
    it('builds a WPA payload', () => {
        expect(buildWifiQrPayload('Club', 'secret')).toBe('WIFI:S:Club;T:WPA;P:secret;;');
    });

    it('escapes special characters', () => {
        expect(buildWifiQrPayload('a;b,c', 'p"q:r\\s')).toBe('WIFI:S:a\\;b\\,c;T:WPA;P:p\\"q\\:r\\\\s;;');
    });

    it('uses nopass for an empty password', () => {
        expect(buildWifiQrPayload('Open', '')).toBe('WIFI:S:Open;T:nopass;;');
    });
});
