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
import { useAuth } from "../context/AuthContext.js";
import { Input } from "../components/Input.js";
import { Button } from "../components/Button.js";
import { COLORS, SPACING, RADIUS } from "../constants/theme.js";

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

        if (!password || password.length < 8) {
            setError("Password must be at least 8 characters long");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            await register(name, email, password);
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
                    <Text style={styles.brandTitle}>Create Account</Text>
                    <Text style={styles.brandSubtitle}>
                        Join SmartAttend for modern education tracking
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

                    <Button
                        title="Create Account"
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
    registerBtn: {
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
    loginLink: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: "700",
    },
});
