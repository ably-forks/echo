import { fromBase64UrlEncoded, parseJwt, toBase64UrlEncoded, toTokenDetails } from '../../src/channel/ably/utils';

describe('Utils', () => {
    describe('JWT handling', () => {
        test('should parse JWT properly', () => {
            const token =
            'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsImtpZCI6ImFiY2QifQ.eyJpYXQiOjE2NTQ2MzQyMTIsImV4cCI6MTY1NDYzNzgxMiwieC1hYmx5LWNsaWVudElkIjoidXNlcjEyMyIsIngtYWJseS1jYXBhYmlsaXR5Ijoie1wicHVibGljOipcIjpbXCJzdWJzY3JpYmVcIixcImhpc3RvcnlcIixcImNoYW5uZWwtbWV0YWRhdGFcIl19In0.GenM5EyUeJvgAGBD_EG-89FueNKWtyRZyi61s9G2Bs4';
            const expectedHeader = {
                alg: 'HS256',
                kid: 'abcd',
                typ: 'JWT',
            };
            const expectedPayload = {
                iat: 1654634212,
                exp: 1654637812,
                'x-ably-clientId': 'user123',
                'x-ably-capability': '{"public:*":["subscribe","history","channel-metadata"]}',
            };

            expect(parseJwt(token).header).toStrictEqual(expectedHeader);
            expect(parseJwt(token).payload).toStrictEqual(expectedPayload);
        });
    
        test('should convert to tokenDetails', () => {
            const token =
            'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsImtpZCI6ImFiY2QifQ.eyJpYXQiOjE2NTQ2MzQyMTIsImV4cCI6MTY1NDYzNzgxMiwieC1hYmx5LWNsaWVudElkIjoidXNlcjEyMyIsIngtYWJseS1jYXBhYmlsaXR5Ijoie1wicHVibGljOipcIjpbXCJzdWJzY3JpYmVcIixcImhpc3RvcnlcIixcImNoYW5uZWwtbWV0YWRhdGFcIl19In0.GenM5EyUeJvgAGBD_EG-89FueNKWtyRZyi61s9G2Bs4';
            const tokenDetails = toTokenDetails(token);
            expect(tokenDetails.clientId).toBe('user123');
            expect(tokenDetails.expires).toBe(1654637812000);
            expect(tokenDetails.issued).toBe(1654634212000);
            expect(tokenDetails.token).toBe(token);
        });
    });

    describe('Base64 URL encoding/decoding', () => {
        test('should encode text into Base64UrlEncoded string', () => {
            const normalText = "laravel-echo codebase is of best quality, period!"
            const encodedText = toBase64UrlEncoded(normalText);
            expect(encodedText).toBe('bGFyYXZlbC1lY2hvIGNvZGViYXNlIGlzIG9mIGJlc3QgcXVhbGl0eSwgcGVyaW9kIQ')

            // edge cases
            expect(toBase64UrlEncoded('')).toBe('');
            expect(toBase64UrlEncoded('Hello, 世界! 🌍')).toBe('SGVsbG8sIOS4lueVjCEg8J-MjQ');
            expect(toBase64UrlEncoded('a')).toBe('YQ');  // Would be 'YQ==' in standard Base64
        });

        test('should decode Base64UrlEncoded string into text', () => {
            const normalText = "bGFyYXZlbC1lY2hvIGNvZGViYXNlIGlzIG9mIGJlc3QgcXVhbGl0eSwgcGVyaW9kIQ"
            const encodedText = fromBase64UrlEncoded(normalText);
            expect(encodedText).toBe('laravel-echo codebase is of best quality, period!')

            // edge cases 
            expect(fromBase64UrlEncoded('')).toBe('');
            expect(fromBase64UrlEncoded('SGVsbG8sIOS4lueVjCEg8J-MjQ')).toBe('Hello, 世界! 🌍');
            expect(fromBase64UrlEncoded('YQ')).toBe('a');  // No padding in Base64Url
        });
    });
});
