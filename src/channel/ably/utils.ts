import { TokenDetails } from "../../../typings/ably";

export const isNullOrUndefined = (obj) => obj == null || obj === undefined;
export const isEmptyString = (stringToCheck, ignoreSpaces = true) => (ignoreSpaces ? stringToCheck.trim() : stringToCheck) === '';
export const isNullOrUndefinedOrEmpty = (obj) => obj == null || obj === undefined || isEmptyString(obj);

/**
 * @throws Exception if parsing error
 */
export const parseJwt = (jwtToken: string): { header: any, payload: any } => {
    // Get Token Header
    const base64HeaderUrl = jwtToken.split('.')[0];
    const base64Header = base64HeaderUrl.replace('-', '+').replace('_', '/');
    const header = JSON.parse(toText(base64Header));
    // Get Token payload
    const base64Url = jwtToken.split('.')[1];
    const base64 = base64Url.replace('-', '+').replace('_', '/');
    const payload = JSON.parse(toText(base64));
    return { header, payload };
}

// RSA4f - tokenDetails size should't exceed 128kb, so omitted `capability` property
export const toTokenDetails = (jwtToken: string) : TokenDetails | any => {
    const { payload } = parseJwt(jwtToken);
    return {
        clientId: payload['x-ably-clientId'],
        expires: payload.exp * 1000, // Convert Seconds to ms
        issued: payload.iat * 1000,
        token: jwtToken
    };
}

const isBrowser = typeof window === 'object';

const toBase64 = (text: string) => {
    if (isBrowser) {
        return btoa(text);
    }
    return Buffer.from(text, 'binary').toString('base64');
};

const toText = (base64: string) => {
    if (isBrowser) {
        return atob(base64);
    }
    return Buffer.from(base64, 'base64').toString('binary');
};

const isAbsoluteUrl = (url: string) => url && url.indexOf('http://') === 0 || url.indexOf('https://') === 0;

export const fullUrl = (url : string) => {
    if (!isAbsoluteUrl(url) && typeof window != 'undefined') {
        const host =  window?.location?.hostname;
        const port = window?.location?.port;
        const protocol = window?.location?.protocol.replace(':', '');
        if (host && port && protocol) {
            return protocol + '://' + host + ':' + port + url; 
        }
    }
    return url;
}


let httpClient: any;
export function httpRequest(options, callback) {
    if (!httpClient) {
        httpClient = new Ably.Rest.Platform.Http();
    }
    if (isBrowser) { // Automatically set by browser
        delete options.headers['Content-Length']; // XHR warning - Refused to set unsafe header "Content-Length"
    } 
    httpClient.doUri(
        options.method,
        null,
        options.uri,
        options.headers,
        options.body,
        options.paramsIfNoHeaders || {},
        callback
    );
}
