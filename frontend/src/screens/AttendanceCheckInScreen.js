import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as Location from "expo-location";
import { useAuth } from "../context/AuthContext.js";
import { apiRequest } from "../api/client.js";
import { Header } from "../components/Header.js";
import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import { COLORS, SPACING, RADIUS } from "../constants/theme.js";

// Haversine distance calculator in meters
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (val) => (val * Math.PI) / 180;
    const R = 6371000; // Earth radius in metres
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
};

export const AttendanceCheckInScreen = ({ classItem, session, onBack, onSuccess }) => {
    const { token } = useAuth();
    const classLocation = classItem.location;

    const [gpsLoading, setGpsLoading] = useState(true);
    const [coords, setCoords] = useState(null);
    const [distance, setDistance] = useState(null);
    const [isInsideRadius, setIsInsideRadius] = useState(false);

    const [scanningThumb, setScanningThumb] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successResult, setSuccessResult] = useState(null);

    const readLocationAndCheckGeofence = useCallback(async () => {
        setGpsLoading(true);
        setError("");

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                setError("Location permission is required to verify your classroom presence");
                setGpsLoading(false);
                return;
            }

            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            if (loc && loc.coords) {
                setCoords(loc.coords);

                if (
                    classLocation &&
                    classLocation.latitude !== undefined &&
                    classLocation.longitude !== undefined
                ) {
                    const dist = calculateDistance(
                        classLocation.latitude,
                        classLocation.longitude,
                        loc.coords.latitude,
                        loc.coords.longitude
                    );
                    setDistance(dist);

                    const allowed = classLocation.radiusMeters || 100;
                    setIsInsideRadius(dist <= allowed);
                } else {
                    setError("Teacher has not configured the classroom location yet.");
                    setIsInsideRadius(false);
                }
            }
        } catch (err) {
            setError(err.message || "Failed to read device GPS");
        } finally {
            setGpsLoading(false);
        }
    }, [classLocation]);

    useEffect(() => {
        readLocationAndCheckGeofence();
    }, [readLocationAndCheckGeofence]);

    const handleThumbScanCheckIn = async () => {
        if (!isInsideRadius) {
            setError(
                `You are currently outside the classroom (${distance}m away). Move inside the ${classLocation?.radiusMeters}m radius to check in.`
            );
            return;
        }

        setError("");
        setScanningThumb(true);

        try {
            // Check biometric hardware
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (!hasHardware) {
                setError("Your device does not support biometric thumb scanning.");
                setScanningThumb(false);
                return;
            }

            if (!isEnrolled) {
                setError("No fingerprint/thumb is enrolled on this device. Please set up a fingerprint in device settings.");
                setScanningThumb(false);
                return;
            }

            // Prompt native fingerprint / thumb scan
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: "Scan thumb to mark attendance",
                fallbackLabel: "Use Device Passcode",
                cancelLabel: "Cancel",
            });

            if (!result.success) {
                setError("Thumb scan verification did not match or was cancelled.");
                setScanningThumb(false);
                return;
            }

            // Thumb scan matched! Send JSON check-in request to backend
            setSubmitting(true);
            const data = await apiRequest(
                `/api/classes/${classItem._id}/sessions/${session._id}/check-in`,
                {
                    method: "POST",
                    token,
                    body: {
                        latitude: coords.latitude,
                        longitude: coords.longitude,
                        biometricVerified: true,
                    },
                }
            );

            setSuccessResult(data.attendance);
            if (onSuccess) {
                setTimeout(onSuccess, 1800);
            }
        } catch (err) {
            setError(err.message || "Failed to record biometric attendance");
        } finally {
            setScanningThumb(false);
            setSubmitting(false);
        }
    };

    if (successResult) {
        return (
            <View style={styles.container}>
                <Header title="Attendance Verified" onBack={onBack} />
                <View style={styles.center}>
                    <View style={styles.successCircle}>
                        <Text style={styles.successMark}>👍</Text>
                    </View>
                    <Text style={styles.successTitle}>Attendance Marked!</Text>
                    <Text style={styles.successDesc}>
                        Status: PRESENT • Verified via Biometric Thumb Scan
                    </Text>
                    <Text style={styles.distanceSuccessText}>
                        Distance to Classroom: {successResult.distanceMeters ?? distance ?? 0}m
                    </Text>
                    <Button
                        title="Return to Sessions"
                        onPress={onBack}
                        style={{ marginTop: SPACING.xl }}
                    />
                </View>
            </View>
        );
    }

    const radiusAllowed = classLocation?.radiusMeters || 100;

    return (
        <View style={styles.container}>
            <Header
                title="Thumb Scan Check-In"
                subtitle={session.title}
                onBack={onBack}
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                {/* Session Context Banner */}
                <Card style={styles.sessionBanner}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <Text style={styles.sessionSubtitle}>
                        Class: {classItem.name} ({classItem.subject})
                    </Text>
                </Card>

                {/* Geofence Status Card */}
                <Card
                    style={[
                        styles.geoCard,
                        isInsideRadius ? styles.geoCardInside : styles.geoCardOutside,
                    ]}
                >
                    <View style={styles.geoRow}>
                        <View style={styles.geoIconCircle}>
                            <Text style={styles.geoIcon}>{isInsideRadius ? "📍" : "🚫"}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.geoStatusTitle}>
                                {gpsLoading
                                    ? "Acquiring GPS Signal..."
                                    : isInsideRadius
                                    ? "Inside Classroom Radius"
                                    : "Outside Classroom Radius"}
                            </Text>
                            {gpsLoading ? (
                                <ActivityIndicator
                                    size="small"
                                    color={COLORS.primary}
                                    style={{ alignSelf: "flex-start", marginTop: 4 }}
                                />
                            ) : distance !== null ? (
                                <Text style={styles.geoStatusText}>
                                    Your distance:{" "}
                                    <Text
                                        style={{
                                            fontWeight: "800",
                                            color: isInsideRadius ? COLORS.success : COLORS.danger,
                                        }}
                                    >
                                        {distance} metres
                                    </Text>{" "}
                                    (Permitted radius: {radiusAllowed}m)
                                </Text>
                            ) : (
                                <Text style={styles.geoStatusText}>
                                    Reading location coordinates...
                                </Text>
                            )}
                        </View>
                        <TouchableOpacity
                            onPress={readLocationAndCheckGeofence}
                            style={styles.refreshBtn}
                            disabled={gpsLoading}
                        >
                            <Text style={styles.refreshBtnText}>Refresh</Text>
                        </TouchableOpacity>
                    </View>
                </Card>

                {/* Thumb Scan Verification Area */}
                <View style={styles.thumbArea}>
                    <View
                        style={[
                            styles.thumbIconContainer,
                            isInsideRadius ? styles.thumbActive : styles.thumbDisabled,
                        ]}
                    >
                        <Text style={styles.thumbBigIcon}>👍</Text>
                    </View>

                    <Text style={styles.thumbInstructionTitle}>
                        {isInsideRadius
                            ? "Geofence Verified"
                            : "Move Closer to Classroom"}
                    </Text>

                    <Text style={styles.thumbInstructionDesc}>
                        {isInsideRadius
                            ? "Place your thumb on your phone's fingerprint sensor to mark your attendance."
                            : `You must be within ${radiusAllowed}m of the classroom. Currently ${
                                  distance !== null ? `${distance}m away` : "determining location"
                              }.`}
                    </Text>
                </View>

                {/* Thumb Scan Action Button */}
                {session.myAttendance?.status === "PRESENT" ? (
                    <Button
                        title="✓ Attendance Already Marked (PRESENT)"
                        variant="outline"
                        disabled={true}
                        style={[styles.actionButton, { borderColor: COLORS.success, backgroundColor: COLORS.successLight }]}
                        textStyle={{ color: COLORS.success, fontWeight: "700" }}
                    />
                ) : (
                    <Button
                        title={
                            scanningThumb || submitting
                                ? "Verifying Thumb..."
                                : isInsideRadius
                                ? "👍 Scan Thumb to Mark Attendance"
                                : "⚠️ Disabled: Must Be Inside Classroom"
                        }
                        variant={isInsideRadius ? "primary" : "outline"}
                        disabled={!isInsideRadius || scanningThumb || submitting || gpsLoading}
                        loading={scanningThumb || submitting}
                        onPress={handleThumbScanCheckIn}
                        style={styles.actionButton}
                    />
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
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: SPACING.xl,
    },
    sessionBanner: {
        padding: SPACING.md,
        marginBottom: SPACING.md,
    },
    sessionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    sessionSubtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    geoCard: {
        padding: SPACING.md,
        marginBottom: SPACING.lg,
        borderWidth: 1.5,
    },
    geoCardInside: {
        borderColor: COLORS.success,
        backgroundColor: COLORS.successLight,
    },
    geoCardOutside: {
        borderColor: "#FECACA",
        backgroundColor: COLORS.dangerLight,
    },
    geoRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    geoIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.surface,
        alignItems: "center",
        justifyContent: "center",
        marginRight: SPACING.md,
    },
    geoIcon: {
        fontSize: 22,
    },
    geoStatusTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.textPrimary,
    },
    geoStatusText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 3,
        lineHeight: 16,
    },
    refreshBtn: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    refreshBtnText: {
        fontSize: 12,
        fontWeight: "700",
        color: COLORS.primary,
    },
    thumbArea: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: SPACING.xl,
    },
    thumbIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: SPACING.lg,
        borderWidth: 3,
    },
    thumbActive: {
        backgroundColor: COLORS.primaryLight,
        borderColor: COLORS.primary,
    },
    thumbDisabled: {
        backgroundColor: COLORS.surfaceMuted,
        borderColor: COLORS.border,
    },
    thumbBigIcon: {
        fontSize: 54,
    },
    thumbInstructionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
        textAlign: "center",
    },
    thumbInstructionDesc: {
        fontSize: 13,
        color: COLORS.textSecondary,
        textAlign: "center",
        lineHeight: 18,
        paddingHorizontal: SPACING.lg,
    },
    actionButton: {
        minHeight: 52,
        marginTop: SPACING.md,
    },
    errorBox: {
        backgroundColor: COLORS.dangerLight,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: "#FECACA",
    },
    errorText: {
        color: COLORS.danger,
        fontSize: 13,
        fontWeight: "500",
    },
    successCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.successLight,
        borderWidth: 3,
        borderColor: COLORS.success,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: SPACING.lg,
    },
    successMark: {
        fontSize: 36,
    },
    successTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    successDesc: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: "center",
    },
    distanceSuccessText: {
        fontSize: 13,
        color: COLORS.success,
        fontWeight: "600",
        marginTop: SPACING.sm,
    },
});
