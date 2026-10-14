import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { COLORS, SPACING } from "../constants/theme.js";

export const Loading = ({ message = "Loading..." }) => {
    return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            {message ? <Text style={styles.text}>{message}</Text> : null}
        </View>
    );
};

export const EmptyState = ({ title, message, actionTitle, onAction }) => {
    return (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{title}</Text>
            {message ? <Text style={styles.emptyMessage}>{message}</Text> : null}
            {actionTitle && onAction ? (
                <View style={styles.actionWrapper}>
                    <Text onPress={onAction} style={styles.actionText}>
                        {actionTitle}
                    </Text>
                </View>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: SPACING.xl,
    },
    text: {
        marginTop: SPACING.md,
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: SPACING.xxl,
        paddingHorizontal: SPACING.lg,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
        textAlign: "center",
    },
    emptyMessage: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: "center",
        lineHeight: 20,
    },
    actionWrapper: {
        marginTop: SPACING.md,
    },
    actionText: {
        color: COLORS.primary,
        fontWeight: "600",
        fontSize: 14,
    },
});
