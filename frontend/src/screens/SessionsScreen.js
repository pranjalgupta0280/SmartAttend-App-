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
    Platform,
    ScrollView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "../context/AuthContext.js";
import { apiRequest } from "../api/client.js";
import { Header } from "../components/Header.js";
import { Card } from "../components/Card.js";
import { Badge } from "../components/Badge.js";
import { Button } from "../components/Button.js";
import { Input } from "../components/Input.js";
import { Loading, EmptyState } from "../components/Loading.js";
import { COLORS, SPACING, RADIUS } from "../constants/theme.js";

export const SessionsScreen = ({
    classItem,
    onBack,
    onNavigateCheckIn,
    onNavigateRegister,
}) => {
    const { token } = useAuth();
    const isTeacher = classItem.myRole === "TEACHER";
    const permissions = classItem.permissions || [];
    const canManageSchedule =
        isTeacher && (permissions.includes("MANAGE_SCHEDULE") || permissions.includes("MANAGE_CLASS"));
    const canManageAttendance =
        isTeacher && (permissions.includes("MANAGE_ATTENDANCE") || permissions.includes("MANAGE_CLASS"));

    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    // Create Session Modal State
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [title, setTitle] = useState("Lecture");

    // Base Date & Times
    const [lectureDate, setLectureDate] = useState(new Date());
    const [startTime, setStartTime] = useState(() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() + 5);
        return d;
    });
    const [endTime, setEndTime] = useState(() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() + 65);
        return d;
    });
    const [openTime, setOpenTime] = useState(() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() + 5);
        return d;
    });
    const [closeTime, setCloseTime] = useState(() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() + 20);
        return d;
    });

    // Active Picker state
    // 'date' | 'start' | 'end' | 'open' | 'close' | null
    const [pickerTarget, setPickerTarget] = useState(null);
    const [pickerValue, setPickerValue] = useState(new Date());

    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    // Update Status Modal State
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);
    const [targetStatus, setTargetStatus] = useState("CANCELLED");
    const [reason, setReason] = useState("");
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const fetchSessions = useCallback(async () => {
        try {
            setError("");
            const data = await apiRequest(`/api/classes/${classItem._id}/sessions`, {
                method: "GET",
                token,
            });
            setSessions(data.sessions || []);
        } catch (err) {
            setError(err.message || "Failed to load sessions");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [classItem._id, token]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchSessions();
    };

    const openPicker = (target) => {
        setPickerTarget(target);
        if (target === "date") setPickerValue(lectureDate);
        else if (target === "start") setPickerValue(startTime);
        else if (target === "end") setPickerValue(endTime);
        else if (target === "open") setPickerValue(openTime);
        else if (target === "close") setPickerValue(closeTime);
    };

    const handlePickerChange = (event, selectedDate) => {
        if (Platform.OS === "android") {
            setPickerTarget(null);
        }

        if (event?.type === "dismissed") {
            setPickerTarget(null);
            return;
        }

        if (!selectedDate) return;

        if (pickerTarget === "date") {
            setLectureDate(selectedDate);
        } else if (pickerTarget === "start") {
            setStartTime(selectedDate);
        } else if (pickerTarget === "end") {
            setEndTime(selectedDate);
        } else if (pickerTarget === "open") {
            setOpenTime(selectedDate);
        } else if (pickerTarget === "close") {
            setCloseTime(selectedDate);
        }
    };

    /**
     * Build absolute Date objects from lectureDate + selected time.
     * Supports overnight lectures that cross midnight.
     */
    const computeAbsoluteDates = () => {
        const start = new Date(lectureDate);
        start.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);

        const startMinutesTotal = startTime.getHours() * 60 + startTime.getMinutes();

        // End Date
        const end = new Date(lectureDate);
        const endMinutesTotal = endTime.getHours() * 60 + endTime.getMinutes();
        if (endMinutesTotal < startMinutesTotal) {
            // Crossed midnight (next morning)
            end.setDate(end.getDate() + 1);
        }
        end.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);

        // Open Date
        const open = new Date(lectureDate);
        const openMinutesTotal = openTime.getHours() * 60 + openTime.getMinutes();
        if (openMinutesTotal < startMinutesTotal) {
            // Attendance opened past midnight
            open.setDate(open.getDate() + 1);
        }
        open.setHours(openTime.getHours(), openTime.getMinutes(), 0, 0);

        // Close Date
        const close = new Date(lectureDate);
        const closeMinutesTotal = closeTime.getHours() * 60 + closeTime.getMinutes();
        if (closeMinutesTotal < startMinutesTotal) {
            // Attendance closes past midnight
            close.setDate(close.getDate() + 1);
        }
        close.setHours(closeTime.getHours(), closeTime.getMinutes(), 0, 0);

        return { start, end, open, close };
    };

    const handleCreateSession = async () => {
        setCreateError("");

        const { start, end, open, close } = computeAbsoluteDates();

        if (start >= end) {
            setCreateError("Lecture start time must be before end time");
            return;
        }

        if (start > open || open >= close || close > end) {
            setCreateError(
                "The attendance window must open at or after lecture start and close before lecture ends"
            );
            return;
        }

        setCreating(true);
        try {
            await apiRequest(`/api/classes/${classItem._id}/sessions`, {
                method: "POST",
                token,
                body: {
                    title: title.trim() || "Lecture",
                    startsAt: start.toISOString(),
                    endsAt: end.toISOString(),
                    attendanceOpensAt: open.toISOString(),
                    attendanceClosesAt: close.toISOString(),
                },
            });

            setCreateModalVisible(false);
            fetchSessions();
        } catch (err) {
            setCreateError(err.message || "Failed to schedule lecture");
        } finally {
            setCreating(false);
        }
    };

    const handleOpenStatusModal = (session, newStatus) => {
        setSelectedSession(session);
        setTargetStatus(newStatus);
        setReason("");
        setStatusModalVisible(true);
    };

    const handleUpdateStatus = async () => {
        if (!selectedSession) return;
        setUpdatingStatus(true);
        try {
            await apiRequest(
                `/api/classes/${classItem._id}/sessions/${selectedSession._id}/status`,
                {
                    method: "PATCH",
                    token,
                    body: {
                        status: targetStatus,
                        reason: reason.trim(),
                    },
                }
            );

            setStatusModalVisible(false);
            fetchSessions();
        } catch (err) {
            Alert.alert("Error", err.message || "Failed to update session status");
        } finally {
            setUpdatingStatus(false);
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return "";
        const d = new Date(isoString);
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

    const renderSession = ({ item }) => {
        const isScheduled = item.status === "SCHEDULED";
        const isCompleted = item.status === "COMPLETED";

        // Attendance Window active check
        const currentTime = new Date();
        const opensAt = new Date(item.attendanceOpensAt);
        const closesAt = new Date(item.attendanceClosesAt);
        const isWindowOpen = isScheduled && currentTime >= opensAt && currentTime <= closesAt;

        return (
            <Card style={styles.sessionCard}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.sessionTitle}>{item.title}</Text>
                        <Text style={styles.sessionDate}>{formatDate(item.startsAt)}</Text>
                    </View>
                    <Badge label={item.status} variant={item.status} />
                </View>

                <View style={styles.timeInfoBox}>
                    <Text style={styles.timeLabel}>
                        ⏰ Lecture:{" "}
                        <Text style={styles.timeVal}>
                            {formatTime(item.startsAt)} - {formatTime(item.endsAt)}
                        </Text>
                    </Text>
                    <Text style={styles.timeLabel}>
                        📍 Attendance Window:{" "}
                        <Text style={styles.timeVal}>
                            {formatTime(item.attendanceOpensAt)} - {formatTime(item.attendanceClosesAt)}
                        </Text>
                    </Text>
                </View>

                {item.reason ? (
                    <Text style={styles.reasonText}>Note: {item.reason}</Text>
                ) : null}

                {/* Actions */}
                <View style={styles.sessionActions}>
                    {!isTeacher && isScheduled ? (
                        <Button
                            title={isWindowOpen ? "📸 Check In Now" : "Mark Attendance"}
                            variant={isWindowOpen ? "primary" : "secondary"}
                            size="sm"
                            onPress={() => onNavigateCheckIn(item)}
                            style={styles.actionBtn}
                        />
                    ) : null}

                    {canManageAttendance ? (
                        <Button
                            title="📋 Attendance Register"
                            variant="secondary"
                            size="sm"
                            onPress={() => onNavigateRegister(item)}
                            style={styles.actionBtn}
                        />
                    ) : null}

                    {canManageSchedule && !isCompleted ? (
                        <View style={styles.teacherStatusBtns}>
                            {item.status === "SCHEDULED" ? (
                                <>
                                    <TouchableOpacity
                                        onPress={() => handleOpenStatusModal(item, "HOLIDAY")}
                                        style={styles.statusOptionBtn}
                                    >
                                        <Text style={styles.statusOptionText}>Holiday</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleOpenStatusModal(item, "CANCELLED")}
                                        style={styles.statusOptionBtn}
                                    >
                                        <Text style={[styles.statusOptionText, { color: COLORS.danger }]}>
                                            Cancel
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => handleOpenStatusModal(item, "SCHEDULED")}
                                    style={styles.statusOptionBtn}
                                >
                                    <Text style={[styles.statusOptionText, { color: COLORS.primary }]}>
                                        Restore to Scheduled
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : null}
                </View>
            </Card>
        );
    };

    return (
        <View style={styles.container}>
            <Header
                title="Lecture Sessions"
                subtitle={classItem.name}
                onBack={onBack}
            />

            <View style={styles.content}>
                <View style={styles.topBar}>
                    <Text style={styles.heading}>Lectures ({sessions.length})</Text>
                    {canManageSchedule ? (
                        <Button
                            title="+ Schedule Lecture"
                            size="sm"
                            onPress={() => {
                                setCreateError("");
                                setCreateModalVisible(true);
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
                            onPress={fetchSessions}
                            style={{ marginTop: SPACING.sm }}
                        />
                    </View>
                ) : null}

                {loading && !refreshing ? (
                    <Loading message="Loading sessions..." />
                ) : (
                    <FlatList
                        data={sessions}
                        keyExtractor={(item) => item._id}
                        renderItem={renderSession}
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
                                    title="No sessions scheduled"
                                    message={
                                        canManageSchedule
                                            ? "Schedule your first lecture session above."
                                            : "Your teacher has not scheduled any lectures yet."
                                    }
                                />
                            )
                        }
                    />
                )}
            </View>

            {/* Create Lecture Modal */}
            <Modal
                visible={createModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setCreateModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <ScrollView keyboardShouldPersistTaps="handled">
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Schedule Lecture</Text>
                                <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                                    <Text style={styles.closeBtn}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            {createError ? (
                                <View style={styles.modalErrorBox}>
                                    <Text style={styles.modalErrorText}>{createError}</Text>
                                </View>
                            ) : null}

                            <Input
                                label="Lecture Title"
                                value={title}
                                onChangeText={setTitle}
                                placeholder="e.g. Physics Lecture"
                            />

                            {/* Lecture Date Picker */}
                            <Text style={styles.timeSectionLabel}>Lecture Date:</Text>
                            <TouchableOpacity
                                style={styles.datePickerBox}
                                onPress={() => openPicker("date")}
                            >
                                <Text style={styles.pickerBoxLabel}>Date</Text>
                                <Text style={styles.datePickerValue}>
                                    📅 {lectureDate.toLocaleDateString([], {
                                        weekday: "short",
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                    })}
                                </Text>
                            </TouchableOpacity>

                            <Text style={styles.timeSectionLabel}>Lecture Timing:</Text>
                            <View style={styles.pickerRow}>
                                <TouchableOpacity
                                    style={styles.pickerBox}
                                    onPress={() => openPicker("start")}
                                >
                                    <Text style={styles.pickerBoxLabel}>Starts At</Text>
                                    <Text style={styles.pickerBoxValue}>
                                        {startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.pickerBox}
                                    onPress={() => openPicker("end")}
                                >
                                    <Text style={styles.pickerBoxLabel}>Ends At</Text>
                                    <Text style={styles.pickerBoxValue}>
                                        {endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.timeSectionLabel}>Attendance Check-In Window:</Text>
                            <View style={styles.pickerRow}>
                                <TouchableOpacity
                                    style={styles.pickerBox}
                                    onPress={() => openPicker("open")}
                                >
                                    <Text style={styles.pickerBoxLabel}>Opens At</Text>
                                    <Text style={styles.pickerBoxValue}>
                                        {openTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.pickerBox}
                                    onPress={() => openPicker("close")}
                                >
                                    <Text style={styles.pickerBoxLabel}>Closes At</Text>
                                    <Text style={styles.pickerBoxValue}>
                                        {closeTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Active DateTimePicker */}
                            {pickerTarget ? (
                                <DateTimePicker
                                    value={pickerValue}
                                    mode={pickerTarget === "date" ? "date" : "time"}
                                    is24Hour={false}
                                    display="default"
                                    onValueChange={handlePickerChange}
                                    onChange={handlePickerChange}
                                    onDismiss={() => setPickerTarget(null)}
                                />
                            ) : null}

                            <View style={styles.modalActions}>
                                <Button
                                    title="Cancel"
                                    variant="outline"
                                    onPress={() => setCreateModalVisible(false)}
                                    style={styles.modalBtn}
                                />
                                <Button
                                    title="Schedule"
                                    onPress={handleCreateSession}
                                    loading={creating}
                                    style={styles.modalBtn}
                                />
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Status Change Modal */}
            <Modal
                visible={statusModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setStatusModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>
                            Mark Lecture as {targetStatus}
                        </Text>
                        <Text style={styles.statusModalDesc}>
                            Update the status of "{selectedSession?.title}".
                        </Text>

                        <Input
                            label="Reason (Optional, max 300 chars)"
                            value={reason}
                            onChangeText={setReason}
                            placeholder="e.g. Instructor unwell or college event"
                            multiline
                            numberOfLines={2}
                        />

                        <View style={styles.modalActions}>
                            <Button
                                title="Cancel"
                                variant="outline"
                                onPress={() => setStatusModalVisible(false)}
                                style={styles.modalBtn}
                            />
                            <Button
                                title="Confirm"
                                variant={targetStatus === "CANCELLED" ? "danger" : "primary"}
                                onPress={handleUpdateStatus}
                                loading={updatingStatus}
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
    sessionCard: {
        padding: SPACING.md,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    sessionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    sessionDate: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    timeInfoBox: {
        backgroundColor: COLORS.surfaceMuted,
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
        marginTop: SPACING.sm,
    },
    timeLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginVertical: 1,
    },
    timeVal: {
        fontWeight: "600",
        color: COLORS.textPrimary,
    },
    reasonText: {
        fontSize: 12,
        color: COLORS.danger,
        fontStyle: "italic",
        marginTop: SPACING.xs,
    },
    sessionActions: {
        marginTop: SPACING.md,
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: SPACING.sm,
    },
    actionBtn: {
        marginVertical: 2,
    },
    teacherStatusBtns: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: SPACING.md,
        marginTop: SPACING.xs,
    },
    statusOptionBtn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    statusOptionText: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.textSecondary,
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
        maxHeight: "90%",
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
    statusModalDesc: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
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
    timeSectionLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginTop: SPACING.sm,
        marginBottom: SPACING.xs,
    },
    datePickerBox: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        backgroundColor: COLORS.surfaceMuted,
        marginBottom: SPACING.sm,
    },
    datePickerValue: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.primary,
        marginTop: 2,
    },
    pickerRow: {
        flexDirection: "row",
        gap: SPACING.md,
        marginBottom: SPACING.sm,
    },
    pickerBox: {
        flex: 1,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
        backgroundColor: COLORS.surfaceMuted,
        alignItems: "center",
    },
    pickerBoxLabel: {
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    pickerBoxValue: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.primary,
        marginTop: 2,
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
