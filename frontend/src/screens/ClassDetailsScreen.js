import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Header } from "../components/Header.js";
import { Badge } from "../components/Badge.js";
import { Card } from "../components/Card.js";
import { COLORS, SPACING, RADIUS } from "../constants/theme.js";

export const ClassDetailsScreen = ({
    classItem,
    onBack,
    onNavigateStudents,
    onNavigateTeachers,
    onNavigateLocation,
    onNavigateSessions,
    onNavigateMyAttendance,
}) => {
    const isTeacher = classItem.myRole === "TEACHER";
    const permissions = classItem.permissions || [];

    const canManageMembers = permissions.includes("MANAGE_MEMBERS") || permissions.includes("MANAGE_CLASS");
    const canManageSchedule = permissions.includes("MANAGE_SCHEDULE") || permissions.includes("MANAGE_CLASS");
    const canManageAttendance = permissions.includes("MANAGE_ATTENDANCE") || permissions.includes("MANAGE_CLASS");

    return (
        <View style={styles.container}>
            <Header
                title={classItem.name}
                subtitle={classItem.subject}
                onBack={onBack}
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Summary Banner */}
                <View style={styles.banner}>
                    <View style={styles.bannerRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>{classItem.name}</Text>
                            <Text style={styles.subtitle}>
                                {classItem.subject}
                                {classItem.section ? ` • Section ${classItem.section}` : ""}
                            </Text>
                        </View>
                        <Badge
                            label={isTeacher ? "Teacher" : "Student"}
                            variant={classItem.myRole}
                        />
                    </View>

                    {classItem.description ? (
                        <Text style={styles.description}>{classItem.description}</Text>
                    ) : null}

                    {isTeacher && permissions.length > 0 ? (
                        <View style={styles.permissionBox}>
                            <Text style={styles.permissionTitle}>Your Permissions:</Text>
                            <View style={styles.permissionList}>
                                {permissions.map((perm) => (
                                    <View key={perm} style={styles.permTag}>
                                        <Text style={styles.permText}>{perm}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ) : null}
                </View>

                <Text style={styles.sectionHeader}>Class Actions</Text>

                {isTeacher ? (
                    // Teacher Management Tools
                    <View style={styles.actionsGrid}>
                        {canManageSchedule || canManageAttendance ? (
                            <Card onPress={onNavigateSessions} style={styles.actionCard}>
                                <View style={styles.actionIconContainer}>
                                    <Text style={styles.actionIcon}>📅</Text>
                                </View>
                                <View style={styles.actionTextContainer}>
                                    <Text style={styles.actionTitle}>Lecture Sessions</Text>
                                    <Text style={styles.actionDesc}>
                                        Create sessions, mark holidays, view attendance register
                                    </Text>
                                </View>
                                <Text style={styles.chevron}>›</Text>
                            </Card>
                        ) : null}

                        {canManageMembers ? (
                            <Card onPress={onNavigateStudents} style={styles.actionCard}>
                                <View style={styles.actionIconContainer}>
                                    <Text style={styles.actionIcon}>👥</Text>
                                </View>
                                <View style={styles.actionTextContainer}>
                                    <Text style={styles.actionTitle}>Student Roster</Text>
                                    <Text style={styles.actionDesc}>
                                        View enrolled students or add by email
                                    </Text>
                                </View>
                                <Text style={styles.chevron}>›</Text>
                            </Card>
                        ) : null}

                        <Card onPress={onNavigateTeachers} style={styles.actionCard}>
                            <View style={styles.actionIconContainer}>
                                <Text style={styles.actionIcon}>👨‍🏫</Text>
                            </View>
                            <View style={styles.actionTextContainer}>
                                <Text style={styles.actionTitle}>Co-Teachers</Text>
                                <Text style={styles.actionDesc}>
                                    View teachers and assign co-teachers (owner only)
                                </Text>
                            </View>
                            <Text style={styles.chevron}>›</Text>
                        </Card>

                        {canManageSchedule ? (
                            <Card onPress={onNavigateLocation} style={styles.actionCard}>
                                <View style={styles.actionIconContainer}>
                                    <Text style={styles.actionIcon}>📍</Text>
                                </View>
                                <View style={styles.actionTextContainer}>
                                    <Text style={styles.actionTitle}>Classroom Location</Text>
                                    <Text style={styles.actionDesc}>
                                        Configure GPS coordinates and attendance radius
                                    </Text>
                                </View>
                                <Text style={styles.chevron}>›</Text>
                            </Card>
                        ) : null}
                    </View>
                ) : (
                    // Student Tools
                    <View style={styles.actionsGrid}>
                        <Card onPress={onNavigateSessions} style={styles.actionCard}>
                            <View style={styles.actionIconContainer}>
                                <Text style={styles.actionIcon}>🕒</Text>
                            </View>
                            <View style={styles.actionTextContainer}>
                                <Text style={styles.actionTitle}>Sessions & Check-In</Text>
                                <Text style={styles.actionDesc}>
                                    View scheduled lectures and submit photo + GPS check-in
                                </Text>
                            </View>
                            <Text style={styles.chevron}>›</Text>
                        </Card>

                        <Card onPress={onNavigateMyAttendance} style={styles.actionCard}>
                            <View style={styles.actionIconContainer}>
                                <Text style={styles.actionIcon}>📊</Text>
                            </View>
                            <View style={styles.actionTextContainer}>
                                <Text style={styles.actionTitle}>My Attendance History</Text>
                                <Text style={styles.actionDesc}>
                                    Check your overall percentage and date-wise record
                                </Text>
                            </View>
                            <Text style={styles.chevron}>›</Text>
                        </Card>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContent: {
        padding: SPACING.lg,
    },
    banner: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACING.xl,
    },
    bannerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    title: {
        fontSize: 20,
        fontWeight: "800",
        color: COLORS.textPrimary,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    description: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: SPACING.md,
        lineHeight: 18,
    },
    permissionBox: {
        marginTop: SPACING.md,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    permissionTitle: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    permissionList: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: SPACING.xs,
    },
    permTag: {
        backgroundColor: COLORS.surfaceMuted,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    permText: {
        fontSize: 10,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
    },
    actionsGrid: {
        gap: SPACING.sm,
    },
    actionCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: SPACING.md,
        marginBottom: SPACING.sm,
    },
    actionIconContainer: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.surfaceMuted,
        alignItems: "center",
        justifyContent: "center",
        marginRight: SPACING.md,
    },
    actionIcon: {
        fontSize: 20,
    },
    actionTextContainer: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    actionDesc: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    chevron: {
        fontSize: 20,
        color: COLORS.textMuted,
        marginLeft: SPACING.sm,
    },
});
