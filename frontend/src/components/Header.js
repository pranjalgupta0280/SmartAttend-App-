import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from "react-native";
import { COLORS, SPACING } from "../constants/theme.js";
import { SmartAttendLogo } from "./SmartAttendLogo.js";

export const Header = ({ title, subtitle, onBack, rightAction }) => {
    return (
        <View style={styles.header}>
            <View style={styles.left}>
                {onBack ? (
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={onBack}
                        style={styles.backButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text style={styles.backText}>‹ Back</Text>
                    </TouchableOpacity>
                ) : null}
            </View>

            <View style={styles.center}>
                <View style={styles.titleRow}>
                    {title === "SmartAttend" ? (
                        <SmartAttendLogo
                            width={24}
                            height={22}
                            showWordmark={false}
                            style={{ marginRight: 6 }}
                        />
                    ) : null}
                    <Text style={styles.title} numberOfLines={1}>
                        {title}
                    </Text>
                </View>
                {subtitle ? (
                    <Text style={styles.subtitle} numberOfLines={1}>
                        {subtitle}
                    </Text>
                ) : null}
            </View>

            <View style={styles.right}>
                {rightAction || null}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        minHeight: 56,
    },
    left: {
        width: 60,
        alignItems: "flex-start",
    },
    backButton: {
        paddingVertical: 4,
    },
    backText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.primary,
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    subtitle: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 1,
    },
    right: {
        width: 60,
        alignItems: "flex-end",
    },
});
