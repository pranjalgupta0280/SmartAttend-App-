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
import { Card } from "../components/Card.js";
import { Badge } from "../components/Badge.js";
import { Button } from "../components/Button.js";
import { Input } from "../components/Input.js";
import { Header } from "../components/Header.js";
import { Loading, EmptyState } from "../components/Loading.js";
import { COLORS, SPACING, RADIUS } from "../constants/theme.js";

export const MyClassesScreen = ({ onSelectClass }) => {
    const { token, user, logout } = useAuth();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    // Create Class Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState("");
    const [subject, setSubject] = useState("");
    const [section, setSection] = useState("");
    const [description, setDescription] = useState("");
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    const fetchClasses = useCallback(async () => {
        try {
            setError("");
            const data = await apiRequest("/api/classes", {
                method: "GET",
                token,
            });
            setClasses(data.classes || []);
        } catch (err) {
            setError(err.message || "Failed to load classes");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    useEffect(() => {
        fetchClasses();
    }, [fetchClasses]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchClasses();
    };

    const handleCreateClass = async () => {
        setCreateError("");
        if (!name.trim() || !subject.trim()) {
            setCreateError("Class name and subject are required");
            return;
        }

        setCreating(true);
        try {
            await apiRequest("/api/classes", {
                method: "POST",
                token,
                body: {
                    name: name.trim(),
                    subject: subject.trim(),
                    section: section.trim(),
                    description: description.trim(),
                },
            });

            // Reset form
            setName("");
            setSubject("");
            setSection("");
            setDescription("");
            setModalVisible(false);

            // Refresh feed
            fetchClasses();
        } catch (err) {
            setCreateError(err.message || "Failed to create class");
        } finally {
            setCreating(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Log Out", style: "destructive", onPress: logout },
            ]
        );
    };

    const renderClassCard = ({ item }) => {
        const isTeacher = item.myRole === "TEACHER";

        return (
            <Card onPress={() => onSelectClass(item)} style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardTitleContainer}>
                        <Text style={styles.className} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <Text style={styles.classSubject} numberOfLines={1}>
                            {item.subject}
                            {item.section ? ` • Sec ${item.section}` : ""}
                        </Text>
                    </View>
                    <Badge
                        label={isTeacher ? "Teacher" : "Student"}
                        variant={item.myRole}
                    />
                </View>

                {item.description ? (
                    <Text style={styles.classDescription} numberOfLines={2}>
                        {item.description}
                    </Text>
                ) : null}

                <View style={styles.cardFooter}>
                    <Text style={styles.tapText}>Open Class & Sessions ›</Text>
                </View>
            </Card>
        );
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.container}>
                <Header title="My Classes" />
                <Loading message="Loading your classes..." />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Header
                title="SmartAttend"
                subtitle={user?.name || "My Classes"}
                rightAction={
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.7}>
                        <Text style={styles.logoutText} numberOfLines={1}>Logout</Text>
                    </TouchableOpacity>
                }
            />

            <View style={styles.content}>
                <View style={styles.topBar}>
                    <Text style={styles.sectionHeading}>
                        All Classes ({classes.length})
                    </Text>
                    <Button
                        title="+ New Class"
                        size="sm"
                        onPress={() => setModalVisible(true)}
                    />
                </View>

                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                        <Button
                            title="Retry"
                            size="sm"
                            variant="outline"
                            onPress={fetchClasses}
                            style={{ marginTop: SPACING.sm }}
                        />
                    </View>
                ) : null}

                <FlatList
                    data={classes}
                    keyExtractor={(item) => item._id}
                    renderItem={renderClassCard}
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
                                title="No classes found"
                                message="Create your first class to teach, or ask your teacher to add you by email."
                                actionTitle="+ Create Class"
                                onAction={() => setModalVisible(true)}
                            />
                        )
                    }
                />
            </View>

            {/* Create Class Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Create New Class</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={styles.closeBtn}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {createError ? (
                            <View style={styles.modalErrorBox}>
                                <Text style={styles.modalErrorText}>{createError}</Text>
                            </View>
                        ) : null}

                        <Input
                            label="Class Name *"
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. Data Structures & Algorithms"
                        />

                        <Input
                            label="Subject *"
                            value={subject}
                            onChangeText={setSubject}
                            placeholder="e.g. Computer Science"
                        />

                        <Input
                            label="Section (Optional)"
                            value={section}
                            onChangeText={setSection}
                            placeholder="e.g. A or CS-2"
                        />

                        <Input
                            label="Description (Optional)"
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Brief description of course"
                            multiline
                            numberOfLines={2}
                        />

                        <View style={styles.modalActions}>
                            <Button
                                title="Cancel"
                                variant="outline"
                                onPress={() => setModalVisible(false)}
                                style={styles.actionButton}
                            />
                            <Button
                                title="Create Class"
                                onPress={handleCreateClass}
                                loading={creating}
                                style={styles.actionButton}
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
        alignItems: "center",
        justifyContent: "space-between",
        marginVertical: SPACING.md,
    },
    sectionHeading: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    listContent: {
        paddingBottom: SPACING.xxl,
    },
    card: {
        padding: SPACING.lg,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        marginBottom: SPACING.sm,
    },
    cardTitleContainer: {
        flex: 1,
        marginRight: SPACING.sm,
    },
    className: {
        fontSize: 17,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    classSubject: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    classDescription: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginVertical: SPACING.xs,
        lineHeight: 18,
    },
    cardFooter: {
        marginTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: SPACING.sm,
        alignItems: "flex-end",
    },
    tapText: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.primary,
    },
    logoutBtn: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        backgroundColor: COLORS.dangerLight,
        borderRadius: RADIUS.full,
        alignItems: "center",
        justifyContent: "center",
    },
    logoutText: {
        fontSize: 12,
        fontWeight: "700",
        color: COLORS.danger,
        flexShrink: 0,
        includeFontPadding: false,
    },
    errorBox: {
        backgroundColor: COLORS.dangerLight,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginVertical: SPACING.sm,
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
    modalActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: SPACING.md,
        marginTop: SPACING.md,
    },
    actionButton: {
        flex: 1,
    },
});
