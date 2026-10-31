import { describe, expect, it } from 'vitest';
import { buildWifiQrPayload, securityOf, wifiNeedsPassword, wifiPasswordFor, wifiQrValue } from './wifiQr';

describe('buildWifiQrPayload', () => {
    it('builds a WPA payload in the backend field order', () => {
        expect(buildWifiQrPayload('Club', 'secret')).toBe('WIFI:T:WPA;S:Club;P:secret;;');
    });

    it('announces WPA3 as SAE and WEP as WEP', () => {
        expect(buildWifiQrPayload('Club', 'secret', 'wpa3')).toBe('WIFI:T:SAE;S:Club;P:secret;;');
        expect(buildWifiQrPayload('Club', 'secret', 'wep')).toBe('WIFI:T:WEP;S:Club;P:secret;;');
    });

    it('escapes special characters', () => {
        expect(buildWifiQrPayload('a;b,c', 'p"q:r\\s')).toBe('WIFI:T:WPA;S:a\\;b\\,c;P:p\\"q\\:r\\\\s;;');
    });

    it('quotes all-hex values', () => {
        expect(buildWifiQrPayload('Club', 'deadBEEF')).toBe('WIFI:T:WPA;S:Club;P:"deadBEEF";;');
        expect(buildWifiQrPayload('cafe', 'secret')).toBe('WIFI:T:WPA;S:"cafe";P:secret;;');
    });

    it('uses nopass for open networks and never includes a password', () => {
        expect(buildWifiQrPayload('Open', '')).toBe('WIFI:T:nopass;S:Open;;');
        expect(buildWifiQrPayload('Open', 'ignored', 'open')).toBe('WIFI:T:nopass;S:Open;;');
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
        expect(wifiQrValue({ ssid: 'net', password: 'pw', qrPayload: 'WIFI:T:SAE;S:net;P:pw;;' })).toBe('WIFI:T:SAE;S:net;P:pw;;');
        expect(wifiQrValue({ ssid: 'net', password: 'pw', qrPayload: 'http://evil' })).toBe('WIFI:T:WPA;S:net;P:pw;;');
        expect(wifiQrValue({ ssid: 'net', password: 'pw' })).toBe('WIFI:T:WPA;S:net;P:pw;;');
        expect(wifiQrValue({ ssid: 'net', password: 'pw', security: 'wpa3' })).toBe('WIFI:T:SAE;S:net;P:pw;;');
    });
});
