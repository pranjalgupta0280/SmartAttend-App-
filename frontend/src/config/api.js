// Configured local LAN IPs:
// 1. 10.5.52.192 (Currently on PC)
// 2. 192.168.29.57 (Home / Previous IP)
export const KNOWN_SERVERS = [
    "http://10.5.52.192:5000",
    "http://192.168.29.57:5000",
];

export const DEFAULT_API_BASE_URL = "http://10.5.52.192:5000";

let currentBaseUrl = DEFAULT_API_BASE_URL;

export const getApiBaseUrl = () => currentBaseUrl;

export const setApiBaseUrl = (url) => {
    if (url && typeof url === "string") {
        currentBaseUrl = url.trim().replace(/\/+$/, "");
    }
};

export const getAlternateBaseUrl = () => {
    return KNOWN_SERVERS.find(
        (srv) => srv.toLowerCase() !== currentBaseUrl.toLowerCase()
    ) || KNOWN_SERVERS[0];
};
