import { getApiBaseUrl } from "../config/api.js";

let onUnauthorizedHandler = null;

export const setOnUnauthorized = (handler) => {
    onUnauthorizedHandler = handler;
};

/**
 * Universal API Request helper
 * @param {string} endpoint - Path like '/api/auth/login'
 * @param {object} options - { method, token, body, isFormData }
 */
export const apiRequest = async (endpoint, { method = "GET", token, body, isFormData = false } = {}) => {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}${endpoint}`;

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

    let response;
    try {
        response = await fetch(url, fetchOptions);
    } catch (networkError) {
        throw new Error(
            networkError.message || `Unable to connect to server at ${baseUrl}`
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
