import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING, RADIUS } from "../constants/theme.js";

export const Badge = ({ label, variant, style, textStyle }) => {
    let bg = COLORS.surfaceMuted;
    let color = COLORS.textSecondary;

    const normalized = (variant || label || "").toUpperCase();

    switch (normalized) {
        case "TEACHER":
            bg = COLORS.primaryLight;
            color = COLORS.primary;
            break;
        case "STUDENT":
            bg = COLORS.secondaryLight;
            color = COLORS.secondary;
            break;
        case "OWNER":
            bg = "#FEF3C7"; // Amber light
            color = "#B45309";
            break;
        case "PRESENT":
            bg = COLORS.successLight;
            color = COLORS.success;
            break;
        case "ABSENT":
            bg = COLORS.dangerLight;
            color = COLORS.danger;
            break;
        case "PENDING":
        case "SCHEDULED":
            bg = COLORS.warningLight;
            color = COLORS.warning;
            break;
        case "COMPLETED":
            bg = COLORS.surfaceMuted;
            color = COLORS.textSecondary;
            break;
        case "HOLIDAY":
        case "CANCELLED":
            bg = "#F3F4F6";
            color = "#6B7280";
            break;
    }

    return (
        <View style={[styles.badge, { backgroundColor: bg }, style]}>
            <Text style={[styles.text, { color }, textStyle]}>
                {label || variant}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        alignSelf: "flex-start",
        paddingHorizontal: SPACING.sm + 2,
        paddingVertical: 3,
        borderRadius: RADIUS.full,
    },
    text: {
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
});
