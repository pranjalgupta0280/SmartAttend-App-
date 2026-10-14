import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { apiRequest, setOnUnauthorized } from "../api/client.js";

const TOKEN_KEY = "smartattend_jwt_token";

const AuthContext = createContext({
    user: null,
    token: null,
    isLoading: true,
    login: async () => {},
    register: async () => {},
    logout: async () => {},
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const logout = useCallback(async () => {
        try {
            await SecureStore.deleteItemAsync(TOKEN_KEY);
        } catch (e) {
            // Ignore secure store errors during cleanup
        }
        setToken(null);
        setUser(null);
    }, []);

    useEffect(() => {
        setOnUnauthorized(() => {
            logout();
        });
    }, [logout]);

    const restoreSession = useCallback(async () => {
        try {
            const savedToken = await SecureStore.getItemAsync(TOKEN_KEY);
            if (!savedToken) {
                setIsLoading(false);
                return;
            }

            const data = await apiRequest("/api/auth/me", {
                method: "GET",
                token: savedToken,
            });

            if (data && data.user) {
                setToken(savedToken);
                setUser(data.user);
            } else {
                await logout();
            }
        } catch {
            await logout();
        } finally {
            setIsLoading(false);
        }
    }, [logout]);

    useEffect(() => {
        restoreSession();
    }, [restoreSession]);

    const login = async (email, password) => {
        const data = await apiRequest("/api/auth/login", {
            method: "POST",
            body: {
                email: email.trim().toLowerCase(),
                password,
            },
        });

        if (data.token && data.user) {
            await SecureStore.setItemAsync(TOKEN_KEY, data.token);
            setToken(data.token);
            setUser(data.user);
        }

        return data;
    };

    const register = async (name, email, password, biometricEnrolled = false) => {
        const data = await apiRequest("/api/auth/register", {
            method: "POST",
            body: {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                password,
                biometricEnrolled,
            },
        });

        if (data.token && data.user) {
            await SecureStore.setItemAsync(TOKEN_KEY, data.token);
            setToken(data.token);
            setUser(data.user);
        }

        return data;
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isLoading,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
