import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { COLORS, SPACING, RADIUS } from "../constants/theme.js";

export const Input = ({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    keyboardType = "default",
    autoCapitalize = "none",
    error,
    editable = true,
    multiline = false,
    numberOfLines = 1,
    style,
    ...restProps
}) => {
    return (
        <View style={styles.container}>
            {label ? <Text style={styles.label}>{label}</Text> : null}
            <TextInput
                style={[
                    styles.input,
                    multiline && styles.multiline,
                    error && styles.inputError,
                    !editable && styles.disabled,
                    style,
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                editable={editable}
                multiline={multiline}
                numberOfLines={numberOfLines}
                {...restProps}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.md,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    input: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm + 2,
        fontSize: 15,
        color: COLORS.textPrimary,
        minHeight: 44,
    },
    multiline: {
        minHeight: 80,
        textAlignVertical: "top",
    },
    inputError: {
        borderColor: COLORS.danger,
    },
    disabled: {
        backgroundColor: COLORS.surfaceMuted,
        color: COLORS.textMuted,
    },
    errorText: {
        color: COLORS.danger,
        fontSize: 12,
        marginTop: SPACING.xs,
    },
});
