import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
} from "react-native";
import { useAuth } from "../context/AuthContext.js";
import { apiRequest } from "../api/client.js";
import { Header } from "../components/Header.js";
import { Card } from "../components/Card.js";
import { Badge } from "../components/Badge.js";
import { Button } from "../components/Button.js";
import { Loading, EmptyState } from "../components/Loading.js";
import { COLORS, SPACING, RADIUS } from "../constants/theme.js";

export const AttendanceRegisterScreen = ({ classItem, session, onBack }) => {
    const { token } = useAuth();
    const [students, setStudents] = useState([]);
    const [sessionStatus, setSessionStatus] = useState(session.status);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const fetchAttendance = useCallback(async () => {
        try {
            setError("");
            const data = await apiRequest(
                `/api/classes/${classItem._id}/sessions/${session._id}/attendance`,
                {
                    method: "GET",
                    token,
                }
            );

            setStudents(data.students || []);
            if (data.sessionStatus) {
                setSessionStatus(data.sessionStatus);
            }
        } catch (err) {
            setError(err.message || "Failed to load attendance register");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [classItem._id, session._id, token]);

    useEffect(() => {
        fetchAttendance();
    }, [fetchAttendance]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAttendance();
    };

    const formatMarkedTime = (isoString) => {
        if (!isoString) return "";
        const d = new Date(isoString);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const renderStudentRow = ({ item }) => {
        return (
            <Card style={styles.rowCard}>
                <View style={styles.rowHeader}>
                    <View style={styles.nameContainer}>
                        <Text style={styles.studentName}>{item.name}</Text>
                        <Text style={styles.studentEmail}>{item.email}</Text>
                    </View>
                    <Badge label={item.status} variant={item.status} />
                </View>

                {item.markedAt ? (
                    <View style={styles.markedInfo}>
                        <Text style={styles.markedText}>
                            Marked at {formatMarkedTime(item.markedAt)}
                            {item.method ? ` via ${item.method}` : ""}
                        </Text>
                    </View>
                ) : null}
            </Card>
        );
    };

    return (
        <View style={styles.container}>
            <Header
                title="Attendance Register"
                subtitle={session.title}
                onBack={onBack}
            />

            <View style={styles.content}>
                <View style={styles.summaryBar}>
                    <Text style={styles.heading}>
                        Enrolled Students ({students.length})
                    </Text>
                    <Badge label={sessionStatus} variant={sessionStatus} />
                </View>

                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                        <Button
                            title="Retry"
                            size="sm"
                            variant="outline"
                            onPress={fetchAttendance}
                            style={{ marginTop: SPACING.sm }}
                        />
                    </View>
                ) : null}

                {loading && !refreshing ? (
                    <Loading message="Loading register..." />
                ) : (
                    <FlatList
                        data={students}
                        keyExtractor={(item) => item.studentId}
                        renderItem={renderStudentRow}
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
                                    message="Add students to the class roster to record attendance."
                                />
                            )
                        }
                    />
                )}
            </View>
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
    summaryBar: {
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
    rowCard: {
        padding: SPACING.md,
    },
    rowHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    nameContainer: {
        flex: 1,
        marginRight: SPACING.sm,
    },
    studentName: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    studentEmail: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    markedInfo: {
        marginTop: SPACING.sm,
        paddingTop: SPACING.xs,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    markedText: {
        fontSize: 12,
        color: COLORS.success,
        fontWeight: "500",
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
});
