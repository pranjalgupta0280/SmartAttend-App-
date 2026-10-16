import { getApiBaseUrl, setApiBaseUrl, KNOWN_SERVERS } from "../config/api.js";

let onUnauthorizedHandler = null;

export const setOnUnauthorized = (handler) => {
    onUnauthorizedHandler = handler;
};

/**
 * Universal API Request helper with multi-IP auto-failover
 * @param {string} endpoint - Path like '/api/auth/login'
 * @param {object} options - { method, token, body, isFormData }
 */
export const apiRequest = async (endpoint, { method = "GET", token, body, isFormData = false } = {}) => {
    const baseUrl = getApiBaseUrl();

    const headers = {};

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    if (!isFormData) {
        headers["Content-Type"] = "application/json";
    }

    const fetchOptions = {
        method,
        headers,
    };

    if (body !== undefined) {
        fetchOptions.body = isFormData ? body : JSON.stringify(body);
    }

    // Try current active base URL first, then iterate other known servers
    const serversToTry = [
        baseUrl,
        ...KNOWN_SERVERS.filter((s) => s.toLowerCase() !== baseUrl.toLowerCase()),
    ];

    let response = null;
    let lastNetworkError = null;

    for (const candidateBase of serversToTry) {
        try {
            const url = `${candidateBase}${endpoint}`;
            response = await fetch(url, fetchOptions);
            setApiBaseUrl(candidateBase);
            break;
        } catch (err) {
            lastNetworkError = err;
        }
    }

    if (!response) {
        throw new Error(
            `Connection failed to ${serversToTry.join(" and ")}. Please ensure your phone is connected to the same Wi-Fi network.`
        );
    }

    if (response.status === 401) {
        if (typeof onUnauthorizedHandler === "function") {
            onUnauthorizedHandler();
        }
    }

    let data = null;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        try {
            data = await response.json();
        } catch {
            data = null;
        }
    } else {
        const text = await response.text();
        data = { message: text || `HTTP ${response.status}` };
    }

    if (!response.ok) {
        const errorMessage = data?.message || `Request failed with status ${response.status}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
};
