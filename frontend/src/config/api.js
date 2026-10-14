import { Platform } from "react-native";

// Central API Base URL
// For physical devices on the same Wi-Fi, use your PC's LAN IPv4 address (port 5000).
// For Android emulator, 10.0.2.2 can be used.
export const DEFAULT_API_BASE_URL = "http://10.5.52.192:5000";

let currentBaseUrl = DEFAULT_API_BASE_URL;

export const getApiBaseUrl = () => currentBaseUrl;

export const setApiBaseUrl = (url) => {
    if (url && typeof url === "string") {
        currentBaseUrl = url.trim().replace(/\/+$/, "");
    }
};
