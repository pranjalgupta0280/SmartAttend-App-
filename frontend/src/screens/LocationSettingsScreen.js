import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import { useAuth } from "../context/AuthContext.js";
import { apiRequest } from "../api/client.js";
import { Header } from "../components/Header.js";
import { Input } from "../components/Input.js";
import { Button } from "../components/Button.js";
import { Card } from "../components/Card.js";
import { COLORS, SPACING, RADIUS } from "../constants/theme.js";

export const LocationSettingsScreen = ({ classItem, onBack, onUpdateClass }) => {
    const { token } = useAuth();
    const currentLocation = classItem.location || {};

    const [latitude, setLatitude] = useState(
        currentLocation.latitude !== undefined ? String(currentLocation.latitude) : ""
    );
    const [longitude, setLongitude] = useState(
        currentLocation.longitude !== undefined ? String(currentLocation.longitude) : ""
    );
    const [radiusMeters, setRadiusMeters] = useState(
        currentLocation.radiusMeters !== undefined ? String(currentLocation.radiusMeters) : "100"
    );

    const [fetchingGps, setFetchingGps] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const handleGetCurrentLocation = async () => {
        setError("");
        setSuccessMessage("");
        setFetchingGps(true);

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                setError(
                    "Permission to access device location was denied. Please allow location permissions in settings."
                );
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            if (location && location.coords) {
                setLatitude(String(location.coords.latitude.toFixed(6)));
                setLongitude(String(location.coords.longitude.toFixed(6)));
                setSuccessMessage("Captured GPS coordinates from your device!");
            }
        } catch (err) {
            setError(err.message || "Failed to retrieve device location");
        } finally {
            setFetchingGps(false);
        }
    };

    const handleSave = async () => {
        setError("");
        setSuccessMessage("");

        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        const rad = parseInt(radiusMeters, 10);

        if (isNaN(lat) || lat < -90 || lat > 90) {
            setError("Valid latitude between -90 and 90 is required");
            return;
        }

        if (isNaN(lon) || lon < -180 || lon > 180) {
            setError("Valid longitude between -180 and 180 is required");
            return;
        }

        if (isNaN(rad) || rad < 1 || rad > 1000) {
            setError("Radius must be a number between 1 and 1000 metres");
            return;
        }

        setSaving(true);
        try {
            const data = await apiRequest(`/api/classes/${classItem._id}/location`, {
                method: "PATCH",
                token,
                body: {
                    latitude: lat,
                    longitude: lon,
                    radiusMeters: rad,
                },
            });

            setSuccessMessage(data.message || "Location saved successfully!");

            if (onUpdateClass) {
                onUpdateClass({
                    ...classItem,
                    location: data.location,
                });
            }
        } catch (err) {
            setError(err.message || "Failed to update attendance location");
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <Header
                title="Classroom Location"
                subtitle={classItem.name}
                onBack={onBack}
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Card style={styles.infoCard}>
                    <Text style={styles.infoTitle}>📍 Geofence Configuration</Text>
                    <Text style={styles.infoDesc}>
                        Students must be physically present within this radius of the
                        classroom coordinates when submitting their photo check-in.
                    </Text>
                </Card>

                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                {successMessage ? (
                    <View style={styles.successBox}>
                        <Text style={styles.successText}>{successMessage}</Text>
                    </View>
                ) : null}

                <View style={styles.formCard}>
                    <Button
                        title="📡 Use My Current Location"
                        variant="outline"
                        onPress={handleGetCurrentLocation}
                        loading={fetchingGps}
                        style={styles.gpsBtn}
                    />

                    <Input
                        label="Latitude (-90 to 90) *"
                        value={latitude}
                        onChangeText={setLatitude}
                        placeholder="e.g. 28.613939"
                        keyboardType="numeric"
                    />

                    <Input
                        label="Longitude (-180 to 180) *"
                        value={longitude}
                        onChangeText={setLongitude}
                        placeholder="e.g. 77.209021"
                        keyboardType="numeric"
                    />

                    <Input
                        label="Allowed Radius (1 - 1000 metres) *"
                        value={radiusMeters}
                        onChangeText={setRadiusMeters}
                        placeholder="e.g. 100"
                        keyboardType="number-pad"
                    />

                    <Button
                        title="Save Geofence"
                        onPress={handleSave}
                        loading={saving}
                        style={styles.saveBtn}
                    />
                </View>
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
    infoCard: {
        padding: SPACING.md,
        backgroundColor: COLORS.secondaryLight,
        borderColor: "#BFDBFE",
    },
    infoTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: COLORS.secondary,
        marginBottom: 4,
    },
    infoDesc: {
        fontSize: 13,
        color: COLORS.textPrimary,
        lineHeight: 18,
    },
    formCard: {
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginTop: SPACING.md,
    },
    gpsBtn: {
        marginBottom: SPACING.lg,
    },
    saveBtn: {
        marginTop: SPACING.md,
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
    successBox: {
        backgroundColor: COLORS.successLight,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginTop: SPACING.md,
    },
    successText: {
        color: COLORS.success,
        fontSize: 13,
        fontWeight: "600",
    },
});
