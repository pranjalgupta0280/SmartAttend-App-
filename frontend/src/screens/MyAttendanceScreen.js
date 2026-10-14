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

export const MyAttendanceScreen = ({ classItem, onBack }) => {
    const { token } = useAuth();
    const [summary, setSummary] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const fetchMyAttendance = useCallback(async () => {
        try {
            setError("");
            const data = await apiRequest(
                `/api/classes/${classItem._id}/my-attendance`,
                {
                    method: "GET",
                    token,
                }
            );

            setSummary(data.summary || null);
            setHistory(data.history || []);
        } catch (err) {
            setError(err.message || "Failed to load attendance history");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [classItem._id, token]);

    useEffect(() => {
        fetchMyAttendance();
    }, [fetchMyAttendance]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchMyAttendance();
    };

    const formatDate = (isoString) => {
        if (!isoString) return "";
        const d = new Date(isoString);
        return d.toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
        });
    };

    const formatTime = (isoString) => {
        if (!isoString) return "";
        const d = new Date(isoString);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const renderHistoryItem = ({ item }) => {
        return (
            <Card style={styles.historyCard}>
                <View style={styles.historyRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.historyTitle}>{item.title}</Text>
                        <Text style={styles.historyDate}>
                            {formatDate(item.startsAt)} • {formatTime(item.startsAt)} - {formatTime(item.endsAt)}
                        </Text>
                    </View>
                    <Badge
                        label={item.attendanceStatus}
                        variant={item.attendanceStatus}
                    />
                </View>

                {item.markedAt ? (
                    <Text style={styles.markedText}>
                        Checked in at {formatTime(item.markedAt)}
                    </Text>
                ) : null}
            </Card>
        );
    };

    return (
        <View style={styles.container}>
            <Header
                title="Attendance Record"
                subtitle={classItem.name}
                onBack={onBack}
            />

            <View style={styles.content}>
                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                        <Button
                            title="Retry"
                            size="sm"
                            variant="outline"
                            onPress={fetchMyAttendance}
                            style={{ marginTop: SPACING.sm }}
                        />
                    </View>
                ) : null}

                {/* Overall Attendance Summary Card */}
                {summary ? (
                    <Card style={styles.summaryCard}>
                        <View style={styles.percentageRow}>
                            <View style={styles.percentageCircle}>
                                <Text style={styles.percentageNumber}>
                                    {summary.attendancePercentage}%
                                </Text>
                            </View>
                            <View style={styles.statsCol}>
                                <Text style={styles.statsTitle}>Attendance Rate</Text>
                                <View style={styles.statBreakdown}>
                                    <Text style={styles.statItem}>
                                        Present:{" "}
                                        <Text style={{ color: COLORS.success, fontWeight: "700" }}>
                                            {summary.present}
                                        </Text>
                                    </Text>
                                    <Text style={styles.statItem}>
                                        Absent:{" "}
                                        <Text style={{ color: COLORS.danger, fontWeight: "700" }}>
                                            {summary.absent}
                                        </Text>
                                    </Text>
                                    <Text style={styles.statItem}>
                                        Total Lectures:{" "}
                                        <Text style={{ fontWeight: "700" }}>
                                            {summary.eligibleSessions}
                                        </Text>
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <Text style={styles.summaryNote}>
                            * Only finalized lectures count toward attendance percentage.
                        </Text>
                    </Card>
                ) : null}

                <Text style={styles.sectionHeader}>Lecture History</Text>

                {loading && !refreshing ? (
                    <Loading message="Loading history..." />
                ) : (
                    <FlatList
                        data={history}
                        keyExtractor={(item) => item.sessionId}
                        renderItem={renderHistoryItem}
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
                                    title="No attendance records yet"
                                    message="Your lecture attendance will appear here once sessions begin."
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
    summaryCard: {
        marginTop: SPACING.md,
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
    },
    percentageRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    percentageCircle: {
        width: 76,
        height: 76,
        borderRadius: 38,
        borderWidth: 4,
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryLight,
        alignItems: "center",
        justifyContent: "center",
        marginRight: SPACING.lg,
    },
    percentageNumber: {
        fontSize: 20,
        fontWeight: "800",
        color: COLORS.primary,
    },
    statsCol: {
        flex: 1,
    },
    statsTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    statBreakdown: {
        gap: 2,
    },
    statItem: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    summaryNote: {
        fontSize: 11,
        color: COLORS.textMuted,
        marginTop: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: SPACING.xs,
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginVertical: SPACING.md,
    },
    listContent: {
        paddingBottom: SPACING.xxl,
    },
    historyCard: {
        padding: SPACING.md,
    },
    historyRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    historyTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    historyDate: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    markedText: {
        fontSize: 12,
        color: COLORS.success,
        marginTop: SPACING.xs,
        fontWeight: "500",
    },
    errorBox: {
        backgroundColor: COLORS.dangerLight,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginTop: SPACING.md,
    },
    errorText: {
        color: COLORS.danger,
        fontSize: 13,
    },
});
