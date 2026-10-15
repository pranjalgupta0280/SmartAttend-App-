import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
} from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { useAuth } from "../context/AuthContext.js";
import { Input } from "../components/Input.js";
import { Button } from "../components/Button.js";
import { COLORS, SPACING, RADIUS } from "../constants/theme.js";
import { SmartAttendLogo } from "../components/SmartAttendLogo.js";
import { isValidEmail } from "../utils/validation.js";

export const RegisterScreen = ({ onNavigateToLogin }) => {
    const { register } = useAuth();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleRegister = async () => {
        setError("");

        if (!name.trim()) {
            setError("Full name is required");
            return;
        }

        if (!email.trim()) {
            setError("Email address is required");
            return;
        }

        if (!isValidEmail(email)) {
            setError("Please enter a valid email address (e.g. student@school.com)");
            return;
        }

        if (!password || password.length < 8) {
            setError("Password must be at least 8 characters long");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);

        // Biometric / Thumb Scan Verification during Account Creation
        let biometricSuccess = false;
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (hasHardware && isEnrolled) {
                const bioResult = await LocalAuthentication.authenticateAsync({
                    promptMessage: "Scan thumb to bind biometric profile",
                    fallbackLabel: "Use Device PIN",
                    cancelLabel: "Cancel",
                });

                if (!bioResult.success) {
                    setError(
                        "Thumb scan was not completed. Biometric verification is required."
                    );
                    setLoading(false);
                    return;
                }

                biometricSuccess = true;
            }
        } catch (bioErr) {
            console.warn("Biometric hardware check:", bioErr.message);
        }

        try {
            await register(name, email, password, biometricSuccess);
        } catch (err) {
            setError(err.message || "Failed to register account");
        } finally {
            setLoading(false);
        }
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
                    <SmartAttendLogo width={90} height={85} showWordmark={false} style={{ marginBottom: SPACING.xs }} />
                    <Text style={styles.brandTitle}>SmartAttend</Text>
                    <Text style={styles.brandSubtitle}>
                        Create Account • Biometric Verification
                    </Text>
                </View>

                <View style={styles.card}>
                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorBoxText}>{error}</Text>
                        </View>
                    ) : null}

                    <Input
                        label="Full Name"
                        value={name}
                        onChangeText={setName}
                        placeholder="John Doe"
                        autoCapitalize="words"
                    />

                    <Input
                        label="Email Address"
                        value={email}
                        onChangeText={setEmail}
                        placeholder="you@example.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <Input
                        label="Password (min 8 characters)"
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Create a strong password"
                        secureTextEntry
                    />

                    <Input
                        label="Confirm Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Repeat password"
                        secureTextEntry
                    />

                    <View style={styles.biometricInfo}>
                        <Text style={styles.biometricInfoText}>
                            👍 You will be prompted to scan your fingerprint/thumb to bind this account.
                        </Text>
                    </View>

                    <Button
                        title="Scan Thumb & Register"
                        onPress={handleRegister}
                        loading={loading}
                        style={styles.registerBtn}
                    />

                    <View style={styles.footerRow}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={onNavigateToLogin}>
                            <Text style={styles.loginLink}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
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
        fontSize: 28,
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
    biometricInfo: {
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.md,
        padding: SPACING.sm + 2,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    biometricInfoText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: "center",
        lineHeight: 16,
    },
    registerBtn: {
        marginTop: SPACING.xs,
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
    loginLink: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: "700",
    },
});
