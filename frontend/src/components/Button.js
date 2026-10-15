import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { COLORS, SPACING, RADIUS } from "../constants/theme.js";

export const Button = ({
    title,
    onPress,
    variant = "primary", // primary | secondary | danger | outline
    size = "md",
    disabled = false,
    loading = false,
    style,
    textStyle,
}) => {
    const isPrimary = variant === "primary";
    const isSecondary = variant === "secondary";
    const isDanger = variant === "danger";
    const isOutline = variant === "outline";

    let backgroundColor = COLORS.primary;
    let borderColor = COLORS.primary;
    let textColor = COLORS.surface;

    if (isSecondary) {
        backgroundColor = COLORS.secondary;
        borderColor = COLORS.secondary;
    } else if (isDanger) {
        backgroundColor = COLORS.danger;
        borderColor = COLORS.danger;
    } else if (isOutline) {
        backgroundColor = "transparent";
        borderColor = COLORS.primary;
        textColor = COLORS.primary;
    }

    if (disabled) {
        backgroundColor = isOutline ? "transparent" : COLORS.surfaceMuted;
        borderColor = COLORS.border;
        textColor = COLORS.textMuted;
    }

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPress}
            disabled={disabled || loading}
            style={[
                styles.button,
                {
                    backgroundColor,
                    borderColor,
                    borderWidth: isOutline ? 1.5 : 0,
                    paddingVertical: size === "sm" ? SPACING.sm : SPACING.md,
                    paddingHorizontal: size === "sm" ? SPACING.md : SPACING.lg,
                },
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator
                    size="small"
                    color={isOutline ? COLORS.primary : COLORS.surface}
                />
            ) : (
                <Text
                    style={[
                        styles.text,
                        {
                            color: textColor,
                            fontSize: size === "sm" ? 13 : 15,
                        },
                        textStyle,
                    ]}
                >
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: RADIUS.md,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 44,
        flexDirection: "row",
    },
    text: {
        fontWeight: "600",
        textAlign: "center",
    },
});
