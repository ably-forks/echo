import { setup, tearDown } from './setup/sandbox';
import Echo from '../../src/echo';
import { MockAuthServer } from './setup/mock-auth-server';
import { AblyChannel, AblyPrivateChannel } from '../../src/channel';
import * as Ably from 'ably';
import waitForExpect from 'wait-for-expect';

jest.setTimeout(20000);
describe('AblyUserLogin', () => {
    let testApp: any;
    let mockAuthServer: MockAuthServer;
    let echo: Echo;

    beforeAll(async () => {
        global.Ably = Ably;
        testApp = await setup();
        mockAuthServer = new MockAuthServer(testApp.keys[0].keyStr);
    });

    afterAll(async () => {
        return await tearDown(testApp);
    });

    beforeEach(() => {
        mockAuthServer.clientId = null;
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

    test('user logs in without previous (guest) channels', async () => {
        let connectionStates : Array<any>= []
        // Initial clientId is null
        expect(mockAuthServer.clientId).toBeNull();
        await waitForExpect(() => {
            expect(echo.connector.ably.connection.state).toBe('connected')
        });

        // Track all connection state changes
        echo.connector.ably.connection.on(stateChange => {
            connectionStates.push(stateChange.current)
        });

        // Making sure client is still anonymous
        expect(mockAuthServer.clientId).toBeNull();
        expect(echo.connector.ablyAuth.existingToken().clientId).toBeNull()

        // Set server clientId to sacOO7@github.com, user logs in for next request
        mockAuthServer.clientId = 'sacOO7@github.com'
        const privateChannel = echo.private('test') as AblyPrivateChannel; // Requests new token        
        await new Promise((resolve) => privateChannel.subscribed(resolve));

        await waitForExpect(() => {
            expect(connectionStates).toStrictEqual(['failed', 'connecting', 'connected'])
        });        
        jest.clearAllMocks();
    });

    test('user logs in with previous (guest) channels', async () => {
        let connectionStates : Array<any>= []
        let publicChannelStates : Array<any>= []
        // Initial clientId is null
        expect(mockAuthServer.clientId).toBeNull();
        await waitForExpect(() => {
            expect(echo.connector.ably.connection.state).toBe('connected')
        });

        // Track all connection state changes
        echo.connector.ably.connection.on(stateChange => {
            connectionStates.push(stateChange.current)
        })

        const publicChannel = echo.channel('test1') as AblyChannel;
        await new Promise((resolve) => publicChannel.subscribed(resolve));
        publicChannel.channel.on(stateChange => {
            publicChannelStates.push(stateChange.current)
        })

        // Making sure client is still anonymous
        expect(mockAuthServer.clientId).toBeNull();
        expect(echo.connector.ablyAuth.existingToken().clientId).toBeNull();

        // Set server clientId to sacOO7@github.com, user logs in for next request
        mockAuthServer.clientId = 'sacOO7@github.com';
        const privateChannel = echo.private('test') as AblyPrivateChannel; // Requests new token
        await new Promise((resolve) => privateChannel.subscribed(resolve));

        await waitForExpect(() => {
            expect(connectionStates).toStrictEqual(['failed', 'connecting', 'connected']);
        });
        await waitForExpect(() => {
            expect(publicChannelStates).toStrictEqual(['failed', 'attaching', 'attached']);
        });

        expect(echo.connector.ablyAuth.existingToken().clientId).toBe('sacOO7@github.com');
        jest.clearAllMocks();

        // TODO - send and receive messages on channels
    });

    test('user logs in and then logs out', async() => {
        let connectionStates : Array<any>= []
        // Initial clientId is null
        expect(mockAuthServer.clientId).toBeNull();
        await waitForExpect(() => {
            expect(echo.connector.ably.connection.state).toBe('connected')
        });

        // Track all connection state changes
        echo.connector.ably.connection.on(stateChange => {
            connectionStates.push(stateChange.current)
        });

        // Making sure client is still anonymous
        expect(mockAuthServer.clientId).toBeNull();
        expect(echo.connector.ablyAuth.existingToken().clientId).toBeNull()

        // Set server clientId to sacOO7@github.com, so user logs in for next request
        mockAuthServer.clientId = 'sacOO7@github.com'
        const privateChannel = echo.private('test') as AblyPrivateChannel; // Requests new token     
        const privateChannel1ErrPromise = new Promise((resolve) => privateChannel.error(resolve))
        privateChannel.channel.on(statechange => {
            console.warn("private channel state change " + JSON.stringify(statechange))
        })
        await new Promise((resolve) => privateChannel.subscribed(resolve)); // successful attach
        await waitForExpect(() => {
            expect(connectionStates).toStrictEqual(['failed', 'connecting', 'connected'])
        });

        // Logout user by setting clientId to null
        mockAuthServer.clientId = null
        const privateChannel2 = echo.private('test1') as AblyPrivateChannel; // Requests new token with null clientId

        // Receives error on both channels
        const privateChannel1Err = await privateChannel1ErrPromise as any;
        const privateChannel2Err = await new Promise((resolve) => privateChannel2.error(resolve)) as any;

        expect(privateChannel1Err.message).toContain("Mismatched clientId");
        expect(privateChannel2Err.message).toContain("Mismatched clientId");

        // Connection transitions to failed state
        await waitForExpect(() => {
            expect(connectionStates).toStrictEqual(['failed', 'connecting', 'connected', 'failed'])
        });

        jest.clearAllMocks();
    });
});
