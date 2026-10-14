import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    Alert,
} from "react-native";
import { useAuth } from "../context/AuthContext.js";
import { Input } from "../components/Input.js";
import { Button } from "../components/Button.js";
import { COLORS, SPACING, RADIUS } from "../constants/theme.js";
import { getApiBaseUrl, setApiBaseUrl } from "../config/api.js";

export const LoginScreen = ({ onNavigateToRegister }) => {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Optional server IP setting toggle for convenience
    const [showServerConfig, setShowServerConfig] = useState(false);
    const [serverUrl, setServerUrl] = useState(getApiBaseUrl());

    const handleLogin = async () => {
        setError("");
        if (!email.trim() || !password) {
            setError("Email and password are required");
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
        } catch (err) {
            setError(err.message || "Failed to log in");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveServerUrl = () => {
        setApiBaseUrl(serverUrl);
        setShowServerConfig(false);
        Alert.alert("Server URL Updated", `API calls now point to ${getApiBaseUrl()}`);
    };

    return (
        <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.headerContainer}>
                    <Text style={styles.brandTitle}>SmartAttend</Text>
                    <Text style={styles.brandSubtitle}>
                        Fast, Geofenced Classroom Attendance
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Sign In</Text>

                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorBoxText}>{error}</Text>
                        </View>
                    ) : null}

                    <Input
                        label="Email Address"
                        value={email}
                        onChangeText={setEmail}
                        placeholder="you@example.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <Input
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Enter your password"
                        secureTextEntry
                    />

                    <Button
                        title="Sign In"
                        onPress={handleLogin}
                        loading={loading}
                        style={styles.loginBtn}
                    />

                    <View style={styles.footerRow}>
                        <Text style={styles.footerText}>Don't have an account? </Text>
                        <TouchableOpacity onPress={onNavigateToRegister}>
                            <Text style={styles.registerLink}>Register</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Developer/User API Endpoint configuration */}
                <View style={styles.configSection}>
                    <TouchableOpacity
                        onPress={() => setShowServerConfig(!showServerConfig)}
                        style={styles.configToggle}
                    >
                        <Text style={styles.configToggleText}>
                            {showServerConfig ? "▲ Hide Server Configuration" : "⚙ Server IP Configuration"}
                        </Text>
                    </TouchableOpacity>

                    {showServerConfig ? (
                        <View style={styles.configBox}>
                            <Input
                                label="Backend Server URL"
                                value={serverUrl}
                                onChangeText={setServerUrl}
                                placeholder="http://10.5.52.192:5000"
                                autoCapitalize="none"
                            />
                            <Button
                                title="Apply Server URL"
                                size="sm"
                                variant="secondary"
                                onPress={handleSaveServerUrl}
                            />
                        </View>
                    ) : null}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    keyboardView: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
        padding: SPACING.lg,
    },
    headerContainer: {
        alignItems: "center",
        marginBottom: SPACING.xl,
    },
    brandTitle: {
        fontSize: 30,
        fontWeight: "800",
        color: COLORS.primary,
        letterSpacing: -0.5,
    },
    brandSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
        textAlign: "center",
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
    },
    errorBox: {
        backgroundColor: COLORS.dangerLight,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: "#FECACA",
    },
    errorBoxText: {
        color: COLORS.danger,
        fontSize: 13,
        fontWeight: "500",
    },
    loginBtn: {
        marginTop: SPACING.sm,
    },
    footerRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: SPACING.xl,
    },
    footerText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    registerLink: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: "700",
    },
    configSection: {
        marginTop: SPACING.xl,
        alignItems: "center",
    },
    configToggle: {
        padding: SPACING.sm,
    },
    configToggleText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: "600",
    },
    configBox: {
        width: "100%",
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginTop: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
});
