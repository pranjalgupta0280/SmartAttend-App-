import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    Modal,
    TouchableOpacity,
} from "react-native";
import { useAuth } from "../context/AuthContext.js";
import { apiRequest } from "../api/client.js";
import { Header } from "../components/Header.js";
import { Card } from "../components/Card.js";
import { Button } from "../components/Button.js";
import { Input } from "../components/Input.js";
import { Loading, EmptyState } from "../components/Loading.js";
import { COLORS, SPACING, RADIUS } from "../constants/theme.js";

export const StudentsScreen = ({ classItem, onBack }) => {
    const { token } = useAuth();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [email, setEmail] = useState("");
    const [adding, setAdding] = useState(false);
    const [modalError, setModalError] = useState("");
    const [modalSuccess, setModalSuccess] = useState("");

    const fetchStudents = useCallback(async () => {
        try {
            setError("");
            const data = await apiRequest(`/api/classes/${classItem._id}/students`, {
                method: "GET",
                token,
            });
            setStudents(data.students || []);
        } catch (err) {
            setError(err.message || "Failed to load students");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [classItem._id, token]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStudents();
    };

    const handleAddStudent = async () => {
        setModalError("");
        setModalSuccess("");

        if (!email.trim()) {
            setModalError("Student registered email is required");
            return;
        }

        setAdding(true);
        try {
            const data = await apiRequest(`/api/classes/${classItem._id}/students`, {
                method: "POST",
                token,
                body: { email: email.trim().toLowerCase() },
            });

            setModalSuccess(data.message || "Student added successfully");
            setEmail("");
            fetchStudents();
            setTimeout(() => {
                setModalVisible(false);
                setModalSuccess("");
            }, 1000);
        } catch (err) {
            setModalError(err.message || "Failed to add student");
        } finally {
            setAdding(false);
        }
    };

    const renderStudent = ({ item }) => {
        return (
            <Card style={styles.studentCard}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {(item.name || "S").charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.email}>{item.email}</Text>
                    {item.enrolledAt ? (
                        <Text style={styles.date}>
                            Enrolled: {new Date(item.enrolledAt).toLocaleDateString()}
                        </Text>
                    ) : null}
                </View>
            </Card>
        );
    };

    return (
        <View style={styles.container}>
            <Header
                title="Student Roster"
                subtitle={classItem.name}
                onBack={onBack}
            />

            <View style={styles.content}>
                <View style={styles.topBar}>
                    <Text style={styles.heading}>
                        Enrolled Students ({students.length})
                    </Text>
                    <Button
                        title="+ Add Student"
                        size="sm"
                        onPress={() => {
                            setModalError("");
                            setModalSuccess("");
                            setModalVisible(true);
                        }}
                    />
                </View>

                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                        <Button
                            title="Retry"
                            size="sm"
                            variant="outline"
                            onPress={fetchStudents}
                            style={{ marginTop: SPACING.sm }}
                        />
                    </View>
                ) : null}

                {loading && !refreshing ? (
                    <Loading message="Loading roster..." />
                ) : (
                    <FlatList
                        data={students}
                        keyExtractor={(item) => item.id || item._id}
                        renderItem={renderStudent}
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
                                    title="No students enrolled"
                                    message="Add students using their registered SmartAttend email."
                                    actionTitle="+ Add Student"
                                    onAction={() => setModalVisible(true)}
                                />
                            )
                        }
                    />
                )}
            </View>

            {/* Add Student Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Student</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={styles.closeBtn}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {modalError ? (
                            <View style={styles.modalErrorBox}>
                                <Text style={styles.modalErrorText}>{modalError}</Text>
                            </View>
                        ) : null}

                        {modalSuccess ? (
                            <View style={styles.modalSuccessBox}>
                                <Text style={styles.modalSuccessText}>{modalSuccess}</Text>
                            </View>
                        ) : null}

                        <Input
                            label="Student Email Address *"
                            value={email}
                            onChangeText={setEmail}
                            placeholder="student@example.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <Text style={styles.note}>
                            Student must already have registered an account with this email.
                        </Text>

                        <View style={styles.modalActions}>
                            <Button
                                title="Cancel"
                                variant="outline"
                                onPress={() => setModalVisible(false)}
                                style={styles.modalBtn}
                            />
                            <Button
                                title="Add to Class"
                                onPress={handleAddStudent}
                                loading={adding}
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
    studentCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: SPACING.md,
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: COLORS.secondaryLight,
        alignItems: "center",
        justifyContent: "center",
        marginRight: SPACING.md,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.secondary,
    },
    info: {
        flex: 1,
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
    date: {
        fontSize: 11,
        color: COLORS.textMuted,
        marginTop: 3,
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
        marginBottom: SPACING.lg,
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
    modalSuccessBox: {
        backgroundColor: COLORS.successLight,
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
        marginBottom: SPACING.md,
    },
    modalSuccessText: {
        color: COLORS.success,
        fontSize: 12,
    },
    note: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
    },
    modalActions: {
        flexDirection: "row",
        gap: SPACING.md,
        marginTop: SPACING.sm,
    },
    modalBtn: {
        flex: 1,
    },
});
