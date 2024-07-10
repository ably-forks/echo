import { setup, tearDown } from './setup/sandbox';
import Echo from '../../src/echo';
import { MockAuthServer } from './setup/mock-auth-server';
import { AblyChannel, AblyPrivateChannel } from '../../src/channel';
import * as Ably from 'ably';

jest.setTimeout(20000);
describe('AblyUserLogin', () => {
    let testApp: any;
    let mockAuthServer: MockAuthServer;
    let echo: Echo;

    beforeAll(async () => {
        global.Ably = Ably;
        testApp = await setup();
        mockAuthServer = new MockAuthServer(testApp.keys[0].keyStr);
        mockAuthServer.clientId = null;
    });

    afterAll(async () => {
        return await tearDown(testApp);
    });

    beforeEach(() => {
        echo = new Echo({
            broadcaster: 'ably',
            useTls: true,
            environment: 'sandbox',
            requestTokenFn: mockAuthServer.getSignedToken,
            echoMessages: true, // https://docs.ably.io/client-lib-development-guide/features/#TO3h
        });
    });

    afterEach((done) => {
        echo.disconnect();
        echo.connector.ably.connection.once('closed', () => {
            done();
        });
    });

    test('channel subscription', (done) => {
        // Initial clientId is null
        expect(mockAuthServer.clientId).toBeNull();
        const publicChannel = echo.channel('test1') as AblyChannel;
        publicChannel.subscribed(() => {
            publicChannel.unregisterSubscribed();
            // Set new clientId to sacOO7@github.com
            mockAuthServer.clientId = 'sacOO7@github.com'
            const privateChannel = echo.private('test') as AblyPrivateChannel;
            privateChannel.subscribed(() => {
                privateChannel.unregisterSubscribed();
                done();
            });
        });
    });
});
