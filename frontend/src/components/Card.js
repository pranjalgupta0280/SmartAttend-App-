import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, SPACING, RADIUS } from "../constants/theme.js";

export const Card = ({ children, onPress, style }) => {
    if (onPress) {
        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={onPress}
                style={[styles.card, styles.shadow, style]}
            >
                {children}
            </TouchableOpacity>
        );
    }

    return (
        <View style={[styles.card, styles.shadow, style]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.md + 2,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACING.md,
    },
    shadow: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
});
