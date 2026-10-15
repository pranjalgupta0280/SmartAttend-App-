import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    ScrollView,
} from "react-native";
import { useAuth } from "../context/AuthContext.js";
import { apiRequest } from "../api/client.js";
import { Header } from "../components/Header.js";
import { Card } from "../components/Card.js";
import { Badge } from "../components/Badge.js";
import { Button } from "../components/Button.js";
import { Loading, EmptyState } from "../components/Loading.js";
import { COLORS, SPACING, RADIUS } from "../constants/theme.js";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const MyAttendanceScreen = ({ classItem, onBack }) => {
    const { token } = useAuth();
    const [summary, setSummary] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    // View Mode: "CALENDAR" or "LIST"
    const [viewMode, setViewMode] = useState("CALENDAR");

    // Calendar state
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [selectedDateKey, setSelectedDateKey] = useState(() => {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, "0");
        const d = String(today.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    });

    // List filter: "ALL" | "PRESENT" | "ABSENT" | "HOLIDAY"
    const [listFilter, setListFilter] = useState("ALL");

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

    // Formatters
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

    // Index history by YYYY-MM-DD
    const sessionsByDate = useMemo(() => {
        const map = {};
        history.forEach((item) => {
            if (!item.startsAt) return;
            const d = new Date(item.startsAt);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            const key = `${y}-${m}-${day}`;
            if (!map[key]) map[key] = [];
            map[key].push(item);
        });
        return map;
    }, [history]);

    // Calendar matrix calculation
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth(); // 0-indexed

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun

    const monthLabel = calendarMonth.toLocaleDateString([], {
        month: "long",
        year: "numeric",
    });

    const handlePrevMonth = () => {
        setCalendarMonth(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCalendarMonth(new Date(year, month + 1, 1));
    };

    const handleTodayMonth = () => {
        const today = new Date();
        setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1));
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, "0");
        const d = String(today.getDate()).padStart(2, "0");
        setSelectedDateKey(`${y}-${m}-${d}`);
    };

    // Attendance health projection
    const attendanceAdvice = useMemo(() => {
        if (!summary) return null;
        const total = summary.eligibleSessions || 0;
        const present = summary.present || 0;
        const pct = summary.attendancePercentage || 0;

        if (total === 0) {
            return {
                status: "NEUTRAL",
                message: "No lectures held yet. Check-in once sessions begin.",
                color: COLORS.secondary,
            };
        }

        if (pct >= 75) {
            // How many can the student miss and remain >= 75%?
            // (present) / (total + miss) >= 0.75  =>  present >= 0.75*(total + miss)  =>  miss <= (present - 0.75*total)/0.75
            const maxMiss = Math.floor((present - 0.75 * total) / 0.75);
            return {
                status: "SAFE",
                message:
                    maxMiss > 0
                        ? `Safe Zone • You can miss up to ${maxMiss} lecture${maxMiss > 1 ? "s" : ""} and maintain 75% attendance.`
                        : "Safe Zone • Attend upcoming classes to keep your safe margin.",
                color: COLORS.secondaryDark,
                bgColor: COLORS.secondaryLight,
            };
        } else {
            // How many consecutive classes to attend to reach 75%?
            // (present + x) / (total + x) >= 0.75  =>  0.25*x >= 0.75*total - present  =>  x >= 3*total - 4*present
            const needed = Math.max(1, Math.ceil(3 * total - 4 * present));
            return {
                status: "WARNING",
                message: `Attendance Alert • You must attend the next ${needed} consecutive lecture${needed > 1 ? "s" : ""} to reach 75%.`,
                color: COLORS.danger,
                bgColor: COLORS.dangerLight,
            };
        }
    }, [summary]);

    // Sessions for the selected calendar day
    const selectedDaySessions = sessionsByDate[selectedDateKey] || [];

    // Filtered history list
    const filteredHistory = useMemo(() => {
        if (listFilter === "ALL") return history;
        if (listFilter === "PRESENT")
            return history.filter((h) => h.attendanceStatus === "PRESENT");
        if (listFilter === "ABSENT")
            return history.filter((h) => h.attendanceStatus === "ABSENT");
        if (listFilter === "HOLIDAY")
            return history.filter(
                (h) => h.attendanceStatus === "HOLIDAY" || h.attendanceStatus === "CANCELLED"
            );
        return history;
    }, [history, listFilter]);

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
                title="Attendance & Calendar"
                subtitle={classItem.name}
                onBack={onBack}
            />

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[COLORS.primary]}
                    />
                }
            >
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

                {/* Overall Attendance Summary Card with Peach & Green Styling */}
                {summary ? (
                    <Card style={styles.summaryCard}>
                        <View style={styles.percentageRow}>
                            <View
                                style={[
                                    styles.percentageCircle,
                                    {
                                        borderColor:
                                            summary.attendancePercentage >= 75
                                                ? COLORS.secondary
                                                : COLORS.primary,
                                        backgroundColor:
                                            summary.attendancePercentage >= 75
                                                ? COLORS.secondaryLight
                                                : COLORS.primaryLight,
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.percentageNumber,
                                        {
                                            color:
                                                summary.attendancePercentage >= 75
                                                    ? COLORS.secondaryDark
                                                    : COLORS.primaryDark,
                                        },
                                    ]}
                                >
                                    {summary.attendancePercentage}%
                                </Text>
                                <Text style={styles.rateLabel}>Rate</Text>
                            </View>

                            <View style={styles.statsCol}>
                                <View style={styles.statsHeaderRow}>
                                    <Text style={styles.statsTitle}>Attendance Health</Text>
                                    <Badge
                                        label={
                                            summary.attendancePercentage >= 75
                                                ? "SAFE"
                                                : "ALERT"
                                        }
                                        variant={
                                            summary.attendancePercentage >= 75
                                                ? "PRESENT"
                                                : "ABSENT"
                                        }
                                    />
                                </View>

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
                                        Concluded:{" "}
                                        <Text style={{ fontWeight: "700", color: COLORS.textPrimary }}>
                                            {summary.eligibleSessions}
                                        </Text>
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Health Advice Strip */}
                        {attendanceAdvice ? (
                            <View
                                style={[
                                    styles.adviceBox,
                                    { backgroundColor: attendanceAdvice.bgColor },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.adviceText,
                                        { color: attendanceAdvice.color },
                                    ]}
                                >
                                    {attendanceAdvice.message}
                                </Text>
                            </View>
                        ) : null}
                    </Card>
                ) : null}

                {/* View Switcher: Calendar vs List */}
                <View style={styles.viewToggleContainer}>
                    <TouchableOpacity
                        style={[
                            styles.viewToggleBtn,
                            viewMode === "CALENDAR" && styles.viewToggleBtnActive,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => setViewMode("CALENDAR")}
                    >
                        <Text
                            style={[
                                styles.viewToggleText,
                                viewMode === "CALENDAR" && styles.viewToggleTextActive,
                            ]}
                        >
                            📅 Calendar View
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.viewToggleBtn,
                            viewMode === "LIST" && styles.viewToggleBtnActive,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => setViewMode("LIST")}
                    >
                        <Text
                            style={[
                                styles.viewToggleText,
                                viewMode === "LIST" && styles.viewToggleTextActive,
                            ]}
                        >
                            📋 List View
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* CALENDAR VIEW */}
                {viewMode === "CALENDAR" ? (
                    <View style={styles.calendarSection}>
                        <Card style={styles.calendarCard}>
                            {/* Month Header Navigation */}
                            <View style={styles.calendarHeader}>
                                <TouchableOpacity
                                    onPress={handlePrevMonth}
                                    style={styles.navBtn}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Text style={styles.navBtnText}>‹</Text>
                                </TouchableOpacity>

                                <View style={styles.monthTitleWrapper}>
                                    <Text style={styles.monthTitle}>{monthLabel}</Text>
                                    <TouchableOpacity
                                        onPress={handleTodayMonth}
                                        style={styles.todayPill}
                                    >
                                        <Text style={styles.todayPillText}>Today</Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    onPress={handleNextMonth}
                                    style={styles.navBtn}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                    <Text style={styles.navBtnText}>›</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Weekday Row */}
                            <View style={styles.weekdaysRow}>
                                {WEEKDAYS.map((day) => (
                                    <View key={day} style={styles.weekdayCol}>
                                        <Text style={styles.weekdayText}>{day}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Days Grid */}
                            <View style={styles.daysGrid}>
                                {/* Pre-padding */}
                                {Array.from({ length: firstDayIndex }).map((_, i) => (
                                    <View key={`empty-${i}`} style={styles.dayCell} />
                                ))}

                                {/* Actual Month Days */}
                                {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const dayNum = i + 1;
                                    const dayKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;

                                    const isSelected = selectedDateKey === dayKey;
                                    const today = new Date();
                                    const isToday =
                                        today.getFullYear() === year &&
                                        today.getMonth() === month &&
                                        today.getDate() === dayNum;

                                    const daySessions = sessionsByDate[dayKey] || [];
                                    const hasSessions = daySessions.length > 0;

                                    // Determine day attendance status
                                    let statusColor = null;
                                    let statusBg = null;
                                    let statusBorder = null;

                                    if (hasSessions) {
                                        const hasPresent = daySessions.some(
                                            (s) => s.attendanceStatus === "PRESENT"
                                        );
                                        const hasAbsent = daySessions.some(
                                            (s) => s.attendanceStatus === "ABSENT"
                                        );
                                        const hasHoliday = daySessions.some(
                                            (s) =>
                                                s.attendanceStatus === "HOLIDAY" ||
                                                s.sessionStatus === "HOLIDAY"
                                        );

                                        if (hasPresent) {
                                            statusColor = COLORS.success;
                                            statusBg = COLORS.successLight;
                                            statusBorder = "#86EFAC";
                                        } else if (hasAbsent) {
                                            statusColor = COLORS.danger;
                                            statusBg = COLORS.dangerLight;
                                            statusBorder = "#FCA5A5";
                                        } else if (hasHoliday) {
                                            statusColor = COLORS.holiday;
                                            statusBg = COLORS.holidayLight;
                                            statusBorder = "#D8B4FE";
                                        } else {
                                            // Scheduled / Upcoming
                                            statusColor = COLORS.warning;
                                            statusBg = COLORS.warningLight;
                                            statusBorder = "#FDE68A";
                                        }
                                    }

                                    return (
                                        <TouchableOpacity
                                            key={`day-${dayNum}`}
                                            activeOpacity={0.6}
                                            onPress={() => setSelectedDateKey(dayKey)}
                                            style={[
                                                styles.dayCell,
                                                statusBg && { backgroundColor: statusBg },
                                                statusBorder && { borderColor: statusBorder, borderWidth: 1 },
                                                isToday && styles.todayCell,
                                                isSelected && styles.selectedCell,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.dayNumber,
                                                    statusColor && { color: statusColor, fontWeight: "700" },
                                                    isSelected && styles.selectedDayNumber,
                                                ]}
                                            >
                                                {dayNum}
                                            </Text>

                                            {/* Micro-dot indicator for multi-status */}
                                            {hasSessions ? (
                                                <View
                                                    style={[
                                                        styles.statusDot,
                                                        { backgroundColor: statusColor || COLORS.primary },
                                                    ]}
                                                />
                                            ) : null}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Color Legend */}
                            <View style={styles.legendContainer}>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
                                    <Text style={styles.legendText}>Present (Attended)</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: COLORS.danger }]} />
                                    <Text style={styles.legendText}>Absent (Missed)</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: COLORS.holiday }]} />
                                    <Text style={styles.legendText}>Holiday / Off</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
                                    <Text style={styles.legendText}>Upcoming</Text>
                                </View>
                            </View>
                        </Card>

                        {/* Selected Date Details Panel */}
                        <View style={styles.dayDetailsSection}>
                            <View style={styles.dayDetailsHeader}>
                                <Text style={styles.dayDetailsTitle}>
                                    Classes on {selectedDateKey}
                                </Text>
                                <Badge
                                    label={`${selectedDaySessions.length} Lecture${selectedDaySessions.length !== 1 ? "s" : ""}`}
                                    variant="TEACHER"
                                />
                            </View>

                            {selectedDaySessions.length === 0 ? (
                                <View style={styles.noLecturesCard}>
                                    <Text style={styles.noLecturesText}>
                                        No lectures scheduled on this date.
                                    </Text>
                                </View>
                            ) : (
                                selectedDaySessions.map((session) => (
                                    <Card key={session.sessionId} style={styles.daySessionCard}>
                                        <View style={styles.daySessionRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.daySessionTitle}>{session.title}</Text>
                                                <Text style={styles.daySessionTime}>
                                                    ⏰ {formatTime(session.startsAt)} - {formatTime(session.endsAt)}
                                                </Text>
                                            </View>
                                            <Badge
                                                label={session.attendanceStatus}
                                                variant={session.attendanceStatus}
                                            />
                                        </View>

                                        {session.markedAt ? (
                                            <Text style={styles.dayMarkedTime}>
                                                ✓ Verified via Thumb Biometric at {formatTime(session.markedAt)}
                                            </Text>
                                        ) : null}

                                        {session.attendanceStatus === "ABSENT" ? (
                                            <Text style={styles.dayAbsentNote}>
                                                ✕ Did not check in during attendance window.
                                            </Text>
                                        ) : null}

                                        {session.attendanceStatus === "HOLIDAY" ? (
                                            <Text style={styles.dayHolidayNote}>
                                                🏖 Scheduled Holiday • Attendance not counted.
                                            </Text>
                                        ) : null}
                                    </Card>
                                ))
                            )}
                        </View>
                    </View>
                ) : (
                    /* LIST VIEW */
                    <View style={styles.listSection}>
                        {/* Filter Chips Bar */}
                        <View style={styles.filterBar}>
                            {[
                                { key: "ALL", label: `All (${history.length})` },
                                {
                                    key: "PRESENT",
                                    label: `Present (${history.filter((h) => h.attendanceStatus === "PRESENT").length})`,
                                    color: COLORS.success,
                                },
                                {
                                    key: "ABSENT",
                                    label: `Absent (${history.filter((h) => h.attendanceStatus === "ABSENT").length})`,
                                    color: COLORS.danger,
                                },
                                {
                                    key: "HOLIDAY",
                                    label: `Holidays (${history.filter((h) => h.attendanceStatus === "HOLIDAY" || h.attendanceStatus === "CANCELLED").length})`,
                                    color: COLORS.holiday,
                                },
                            ].map((tab) => {
                                const isCurrent = listFilter === tab.key;
                                return (
                                    <TouchableOpacity
                                        key={tab.key}
                                        onPress={() => setListFilter(tab.key)}
                                        style={[
                                            styles.listFilterChip,
                                            isCurrent && styles.listFilterChipActive,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.listFilterText,
                                                isCurrent && styles.listFilterTextActive,
                                                !isCurrent && tab.color ? { color: tab.color } : null,
                                            ]}
                                        >
                                            {tab.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {loading && !refreshing ? (
                            <Loading message="Loading history..." />
                        ) : filteredHistory.length === 0 ? (
                            <EmptyState
                                title="No records found"
                                message="No lectures match the selected filter."
                            />
                        ) : (
                            filteredHistory.map((item) => (
                                <View key={item.sessionId}>
                                    {renderHistoryItem({ item })}
                                </View>
                            ))
                        )}
                    </View>
                )}

                <View style={{ height: SPACING.xxl }} />
            </ScrollView>
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
        borderColor: COLORS.border,
    },
    percentageRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    percentageCircle: {
        width: 76,
        height: 76,
        borderRadius: 38,
        borderWidth: 3.5,
        alignItems: "center",
        justifyContent: "center",
        marginRight: SPACING.lg,
    },
    percentageNumber: {
        fontSize: 20,
        fontWeight: "800",
    },
    rateLabel: {
        fontSize: 10,
        fontWeight: "600",
        color: COLORS.textSecondary,
        marginTop: -2,
    },
    statsCol: {
        flex: 1,
    },
    statsHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    statsTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    statBreakdown: {
        gap: 3,
    },
    statItem: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    adviceBox: {
        marginTop: SPACING.md,
        padding: SPACING.sm + 2,
        borderRadius: RADIUS.md,
    },
    adviceText: {
        fontSize: 12,
        fontWeight: "600",
        lineHeight: 17,
    },
    viewToggleContainer: {
        flexDirection: "row",
        backgroundColor: COLORS.surfaceMuted,
        padding: 4,
        borderRadius: RADIUS.full,
        marginVertical: SPACING.md,
    },
    viewToggleBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: "center",
        borderRadius: RADIUS.full,
    },
    viewToggleBtnActive: {
        backgroundColor: COLORS.surface,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    viewToggleText: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    viewToggleTextActive: {
        color: COLORS.primaryDark,
        fontWeight: "700",
    },
    calendarSection: {
        marginBottom: SPACING.lg,
    },
    calendarCard: {
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
    },
    calendarHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: SPACING.md,
    },
    navBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: COLORS.surfaceMuted,
        alignItems: "center",
        justifyContent: "center",
    },
    navBtnText: {
        fontSize: 22,
        fontWeight: "600",
        color: COLORS.textPrimary,
        marginTop: -2,
    },
    monthTitleWrapper: {
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.sm,
    },
    monthTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    todayPill: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.primaryLight,
    },
    todayPillText: {
        fontSize: 11,
        fontWeight: "700",
        color: COLORS.primaryDark,
    },
    weekdaysRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: SPACING.xs,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingBottom: 6,
    },
    weekdayCol: {
        width: "14.28%",
        alignItems: "center",
    },
    weekdayText: {
        fontSize: 11,
        fontWeight: "700",
        color: COLORS.textMuted,
    },
    daysGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    dayCell: {
        width: "14.28%",
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: RADIUS.sm,
        marginVertical: 2,
    },
    todayCell: {
        borderWidth: 1.5,
        borderColor: COLORS.primary,
    },
    selectedCell: {
        backgroundColor: COLORS.primaryLight,
        borderColor: COLORS.primary,
        borderWidth: 2,
    },
    dayNumber: {
        fontSize: 13,
        fontWeight: "500",
        color: COLORS.textPrimary,
    },
    selectedDayNumber: {
        color: COLORS.primaryDark,
        fontWeight: "800",
    },
    statusDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        marginTop: 2,
    },
    legendContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: SPACING.md,
        marginTop: SPACING.md,
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        justifyContent: "space-between",
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 11,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    dayDetailsSection: {
        marginTop: SPACING.md,
    },
    dayDetailsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: SPACING.sm,
    },
    dayDetailsTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    noLecturesCard: {
        padding: SPACING.lg,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: "center",
    },
    noLecturesText: {
        fontSize: 13,
        color: COLORS.textMuted,
        fontStyle: "italic",
    },
    daySessionCard: {
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        backgroundColor: COLORS.surface,
    },
    daySessionRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    daySessionTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    daySessionTime: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    dayMarkedTime: {
        fontSize: 12,
        color: COLORS.success,
        fontWeight: "600",
        marginTop: SPACING.xs,
    },
    dayAbsentNote: {
        fontSize: 12,
        color: COLORS.danger,
        fontWeight: "500",
        marginTop: SPACING.xs,
    },
    dayHolidayNote: {
        fontSize: 12,
        color: COLORS.holiday,
        fontWeight: "500",
        marginTop: SPACING.xs,
    },
    listSection: {
        marginBottom: SPACING.lg,
    },
    filterBar: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: SPACING.sm,
        marginBottom: SPACING.md,
    },
    listFilterChip: {
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
        borderRadius: RADIUS.full,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    listFilterChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    listFilterText: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    listFilterTextActive: {
        color: COLORS.surface,
        fontWeight: "700",
    },
    historyCard: {
        padding: SPACING.md,
        marginBottom: SPACING.sm,
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
