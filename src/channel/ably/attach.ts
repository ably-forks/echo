import { isNullOrUndefined } from './utils';

let channelAttachAuthorized = false;

/**
 * Modifies existing channel attach with custom authz implementation
 */
export const beforeChannelAttach = (ablyClient, authorize: Function) => {
    const dummyRealtimeChannel = ablyClient.channels.get('dummy');
    dummyRealtimeChannel.__proto__.authorizeChannel = authorize;
    if (channelAttachAuthorized) {
        return;
    }
    const internalAttach = dummyRealtimeChannel.__proto__._attach;
    if (isNullOrUndefined(internalAttach)) {
        console.warn('Failed to enable authorize for pre-attach, please check for right library version');
        return;
    }
    function customInternalAttach(forceReattach, attachReason, errCallback) {
        if (this.authorizing) {
            return;
        }
        this.authorizing = true;
        const bindedInternalAttach = internalAttach.bind(this);

        this.authorizeChannel(this, (error) => {
            this.authorizing = false;
            if (error) {
                if (errCallback) {
                    errCallback(error);
                } else {
                    console.error(`channel ${this.name} auth error => ${error}`)
                }
                return;
            } else {
                bindedInternalAttach(forceReattach, attachReason, errCallback);
            }
        });
    }
    dummyRealtimeChannel.__proto__._attach = customInternalAttach;
    channelAttachAuthorized = true;
};
