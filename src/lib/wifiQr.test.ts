import { describe, expect, it } from 'vitest';
import { buildWifiQrPayload, securityOf, wifiNeedsPassword, wifiPasswordFor, wifiQrValue } from './wifiQr';

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

describe('wifi security helpers', () => {
    it('derives the security of legacy rows', () => {
        expect(securityOf({ security: 'wpa3', password: 'x' })).toBe('wpa3');
        expect(securityOf({ password: '' })).toBe('open');
        expect(securityOf({ security: 'bogus', password: 'x' })).toBe('wpa');
    });

    it('requires a password for everything but open networks', () => {
        expect(wifiNeedsPassword('open')).toBe(false);
        expect(wifiNeedsPassword('wep')).toBe(true);
        expect(wifiPasswordFor('open', ' secret ')).toBe('');
        expect(wifiPasswordFor('wpa', ' secret ')).toBe('secret');
    });

    it('prefers the backend QR payload', () => {
        expect(wifiQrValue({ ssid: 'a', password: 'b', qrPayload: 'WIFI:T:SAE;S:a;P:b;;' })).toBe('WIFI:T:SAE;S:a;P:b;;');
        expect(wifiQrValue({ ssid: 'a', password: 'b', qrPayload: 'http://evil' })).toBe('WIFI:S:a;T:WPA;P:b;;');
        expect(wifiQrValue({ ssid: 'a', password: 'b' })).toBe('WIFI:S:a;T:WPA;P:b;;');
    });
});
