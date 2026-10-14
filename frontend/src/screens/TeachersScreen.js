import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    Modal,
    TouchableOpacity,
    Alert,
} from "react-native";
import { useAuth } from "../context/AuthContext.js";
import { apiRequest } from "../api/client.js";
import { Header } from "../components/Header.js";
import { Card } from "../components/Card.js";
import { Badge } from "../components/Badge.js";
import { Button } from "../components/Button.js";
import { Input } from "../components/Input.js";
import { Loading, EmptyState } from "../components/Loading.js";
import { COLORS, SPACING, RADIUS } from "../constants/theme.js";

const ALL_PERMISSIONS = [
    { key: "MANAGE_MEMBERS", label: "Manage Members" },
    { key: "MANAGE_SCHEDULE", label: "Manage Schedule & Location" },
    { key: "MANAGE_ATTENDANCE", label: "Manage Attendance" },
];

export const TeachersScreen = ({ classItem, onBack }) => {
    const { token, user } = useAuth();
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const isOwner = user?.id && classItem.ownerTeacherId && user.id === classItem.ownerTeacherId;

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [email, setEmail] = useState("");
    const [selectedPermissions, setSelectedPermissions] = useState([
        "MANAGE_MEMBERS",
        "MANAGE_SCHEDULE",
        "MANAGE_ATTENDANCE",
    ]);
    const [assigning, setAssigning] = useState(false);
    const [modalError, setModalError] = useState("");

    const fetchTeachers = useCallback(async () => {
        try {
            setError("");
            const data = await apiRequest(`/api/classes/${classItem._id}/teachers`, {
                method: "GET",
                token,
            });
            setTeachers(data.teachers || []);
        } catch (err) {
            setError(err.message || "Failed to load teachers");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [classItem._id, token]);

    useEffect(() => {
        fetchTeachers();
    }, [fetchTeachers]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchTeachers();
    };

    const togglePermission = (key) => {
        if (selectedPermissions.includes(key)) {
            setSelectedPermissions(selectedPermissions.filter((p) => p !== key));
        } else {
            setSelectedPermissions([...selectedPermissions, key]);
        }
    };

    const handleAssignTeacher = async () => {
        setModalError("");
        if (!email.trim()) {
            setModalError("Teacher email is required");
            return;
        }

        if (selectedPermissions.length === 0) {
            setModalError("Please select at least one permission");
            return;
        }

        setAssigning(true);
        try {
            await apiRequest(`/api/classes/${classItem._id}/teachers`, {
                method: "POST",
                token,
                body: {
                    email: email.trim().toLowerCase(),
                    permissions: selectedPermissions,
                },
            });

            setEmail("");
            setModalVisible(false);
            fetchTeachers();
        } catch (err) {
            setModalError(err.message || "Failed to assign co-teacher");
        } finally {
            setAssigning(false);
        }
    };

    const handleRemoveTeacher = (teacher) => {
        Alert.alert(
            "Remove Co-Teacher",
            `Are you sure you want to remove ${teacher.name} from this class?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await apiRequest(
                                `/api/classes/${classItem._id}/teachers/${teacher.id}`,
                                {
                                    method: "DELETE",
                                    token,
                                }
                            );
                            fetchTeachers();
                        } catch (err) {
                            Alert.alert("Error", err.message || "Failed to remove co-teacher");
                        }
                    },
                },
            ]
        );
    };

    const renderTeacher = ({ item }) => {
        const canRemove = isOwner && !item.isOwner && item.id !== user?.id;

        return (
            <Card style={styles.teacherCard}>
                <View style={styles.headerRow}>
                    <View style={styles.info}>
                        <Text style={styles.name}>{item.name}</Text>
                        <Text style={styles.email}>{item.email}</Text>
                    </View>
                    {item.isOwner ? (
                        <Badge label="Owner" variant="OWNER" />
                    ) : (
                        <Badge label="Co-Teacher" variant="TEACHER" />
                    )}
                </View>

                {item.permissions && item.permissions.length > 0 ? (
                    <View style={styles.permList}>
                        {item.permissions.map((perm) => (
                            <View key={perm} style={styles.permChip}>
                                <Text style={styles.permText}>{perm}</Text>
                            </View>
                        ))}
                    </View>
                ) : null}

                {canRemove ? (
                    <TouchableOpacity
                        onPress={() => handleRemoveTeacher(item)}
                        style={styles.removeBtn}
                    >
                        <Text style={styles.removeText}>Remove Co-Teacher</Text>
                    </TouchableOpacity>
                ) : null}
            </Card>
        );
    };

    return (
        <View style={styles.container}>
            <Header
                title="Co-Teachers"
                subtitle={classItem.name}
                onBack={onBack}
            />

            <View style={styles.content}>
                <View style={styles.topBar}>
                    <Text style={styles.heading}>
                        Teaching Staff ({teachers.length})
                    </Text>
                    {isOwner ? (
                        <Button
                            title="+ Assign Co-Teacher"
                            size="sm"
                            onPress={() => {
                                setModalError("");
                                setModalVisible(true);
                            }}
                        />
                    ) : null}
                </View>

                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                        <Button
                            title="Retry"
                            size="sm"
                            variant="outline"
                            onPress={fetchTeachers}
                            style={{ marginTop: SPACING.sm }}
                        />
                    </View>
                ) : null}

                {loading && !refreshing ? (
                    <Loading message="Loading teachers..." />
                ) : (
                    <FlatList
                        data={teachers}
                        keyExtractor={(item) => item.id}
                        renderItem={renderTeacher}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={[COLORS.primary]}
                            />
                        }
                        ListEmptyComponent={
                            !error && (
                                <EmptyState
                                    title="No co-teachers found"
                                    message="Assign co-teachers to help manage attendance and sessions."
                                />
                            )
                        }
                    />
                )}
            </View>

            {/* Assign Co-Teacher Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Assign Co-Teacher</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={styles.closeBtn}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {modalError ? (
                            <View style={styles.modalErrorBox}>
                                <Text style={styles.modalErrorText}>{modalError}</Text>
                            </View>
                        ) : null}

                        <Input
                            label="Teacher Email Address *"
                            value={email}
                            onChangeText={setEmail}
                            placeholder="colleague@example.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <Text style={styles.permLabel}>Permissions:</Text>
                        {ALL_PERMISSIONS.map((perm) => {
                            const isChecked = selectedPermissions.includes(perm.key);
                            return (
                                <TouchableOpacity
                                    key={perm.key}
                                    style={styles.checkboxRow}
                                    onPress={() => togglePermission(perm.key)}
                                    activeOpacity={0.7}
                                >
                                    <View
                                        style={[
                                            styles.checkbox,
                                            isChecked && styles.checkboxActive,
                                        ]}
                                    >
                                        {isChecked ? (
                                            <Text style={styles.checkmark}>✓</Text>
                                        ) : null}
                                    </View>
                                    <Text style={styles.checkboxText}>{perm.label}</Text>
                                </TouchableOpacity>
                            );
                        })}

                        <View style={styles.modalActions}>
                            <Button
                                title="Cancel"
                                variant="outline"
                                onPress={() => setModalVisible(false)}
                                style={styles.modalBtn}
                            />
                            <Button
                                title="Assign"
                                onPress={handleAssignTeacher}
                                loading={assigning}
                                style={styles.modalBtn}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
        paddingHorizontal: SPACING.lg,
    },
    topBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginVertical: SPACING.md,
    },
    heading: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    listContent: {
        paddingBottom: SPACING.xxl,
    },
    teacherCard: {
        padding: SPACING.md,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    info: {
        flex: 1,
        marginRight: SPACING.sm,
    },
    name: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    email: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    permList: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: SPACING.xs,
        marginTop: SPACING.sm,
    },
    permChip: {
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
    removeBtn: {
        marginTop: SPACING.md,
        alignSelf: "flex-end",
    },
    removeText: {
        color: COLORS.danger,
        fontSize: 13,
        fontWeight: "600",
    },
    errorBox: {
        backgroundColor: COLORS.dangerLight,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.md,
    },
    errorText: {
        color: COLORS.danger,
        fontSize: 13,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.5)",
        justifyContent: "center",
        padding: SPACING.lg,
    },
    modalCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.xl,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: SPACING.md,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    closeBtn: {
        fontSize: 18,
        color: COLORS.textSecondary,
        padding: SPACING.xs,
    },
    modalErrorBox: {
        backgroundColor: COLORS.dangerLight,
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
        marginBottom: SPACING.md,
    },
    modalErrorText: {
        color: COLORS.danger,
        fontSize: 12,
    },
    permLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    checkboxRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: SPACING.sm,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: RADIUS.sm,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        alignItems: "center",
        justifyContent: "center",
        marginRight: SPACING.sm,
    },
    checkboxActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    checkmark: {
        color: COLORS.surface,
        fontSize: 12,
        fontWeight: "700",
    },
    checkboxText: {
        fontSize: 14,
        color: COLORS.textPrimary,
    },
    modalActions: {
        flexDirection: "row",
        gap: SPACING.md,
        marginTop: SPACING.lg,
    },
    modalBtn: {
        flex: 1,
    },
});
