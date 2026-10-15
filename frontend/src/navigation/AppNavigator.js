import React, { useState, useEffect } from "react";
import { StatusBar, StyleSheet, BackHandler } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext.js";
import { Loading } from "../components/Loading.js";
import { COLORS } from "../constants/theme.js";

// Screens
import { LoginScreen } from "../screens/LoginScreen.js";
import { RegisterScreen } from "../screens/RegisterScreen.js";
import { MyClassesScreen } from "../screens/MyClassesScreen.js";
import { ClassDetailsScreen } from "../screens/ClassDetailsScreen.js";
import { StudentsScreen } from "../screens/StudentsScreen.js";
import { TeachersScreen } from "../screens/TeachersScreen.js";
import { LocationSettingsScreen } from "../screens/LocationSettingsScreen.js";
import { SessionsScreen } from "../screens/SessionsScreen.js";
import { AttendanceCheckInScreen } from "../screens/AttendanceCheckInScreen.js";
import { AttendanceRegisterScreen } from "../screens/AttendanceRegisterScreen.js";
import { MyAttendanceScreen } from "../screens/MyAttendanceScreen.js";

export const AppNavigator = () => {
    const { token, isLoading } = useAuth();

    // Auth screen mode: 'login' | 'register'
    const [authScreen, setAuthScreen] = useState("login");

    // Main App Navigation Stack: array of { screen: string, params: object }
    const [navStack, setNavStack] = useState([{ screen: "MyClasses", params: {} }]);

    const currentRoute = navStack[navStack.length - 1] || { screen: "MyClasses", params: {} };

    const push = (screen, params = {}) => {
        setNavStack((prev) => [...prev, { screen, params }]);
    };

    const pop = () => {
        setNavStack((prev) => (prev.length > 1 ? prev.slice(0, prev.length - 1) : prev));
    };

    const resetTo = (screen, params = {}) => {
        setNavStack([{ screen, params }]);
    };

    // Handle Android hardware/swipe-from-edge back action
    useEffect(() => {
        const onHardwareBack = () => {
            if (!token) {
                if (authScreen === "register") {
                    setAuthScreen("login");
                    return true;
                }
                return false;
            }

            if (navStack.length > 1) {
                pop();
                return true; // Handled back navigation; do not exit app
            }
            return false; // Exit app only at root
        };

        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            onHardwareBack
        );
        return () => backHandler.remove();
    }, [token, authScreen, navStack.length]);

    if (isLoading) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
                <Loading message="Restoring session..." />
            </SafeAreaView>
        );
    }

    if (!token) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
                {authScreen === "login" ? (
                    <LoginScreen onNavigateToRegister={() => setAuthScreen("register")} />
                ) : (
                    <RegisterScreen onNavigateToLogin={() => setAuthScreen("login")} />
                )}
            </SafeAreaView>
        );
    }

    // Authenticated Screen Rendering
    let screenComponent = null;

    switch (currentRoute.screen) {
        case "MyClasses":
            screenComponent = (
                <MyClassesScreen
                    onSelectClass={(classItem) =>
                        push("ClassDetails", { classItem })
                    }
                />
            );
            break;

        case "ClassDetails":
            screenComponent = (
                <ClassDetailsScreen
                    classItem={currentRoute.params.classItem}
                    onBack={pop}
                    onNavigateStudents={() =>
                        push("Students", { classItem: currentRoute.params.classItem })
                    }
                    onNavigateTeachers={() =>
                        push("Teachers", { classItem: currentRoute.params.classItem })
                    }
                    onNavigateLocation={() =>
                        push("LocationSettings", { classItem: currentRoute.params.classItem })
                    }
                    onNavigateSessions={() =>
                        push("Sessions", { classItem: currentRoute.params.classItem })
                    }
                    onNavigateMyAttendance={() =>
                        push("MyAttendance", { classItem: currentRoute.params.classItem })
                    }
                />
            );
            break;

        case "Students":
            screenComponent = (
                <StudentsScreen
                    classItem={currentRoute.params.classItem}
                    onBack={pop}
                />
            );
            break;

        case "Teachers":
            screenComponent = (
                <TeachersScreen
                    classItem={currentRoute.params.classItem}
                    onBack={pop}
                />
            );
            break;

        case "LocationSettings":
            screenComponent = (
                <LocationSettingsScreen
                    classItem={currentRoute.params.classItem}
                    onBack={pop}
                    onUpdateClass={(updatedClass) => {
                        // Update in-memory params so back navigation retains new location
                        currentRoute.params.classItem = updatedClass;
                    }}
                />
            );
            break;

        case "Sessions":
            screenComponent = (
                <SessionsScreen
                    classItem={currentRoute.params.classItem}
                    onBack={pop}
                    onNavigateCheckIn={(session, onRefreshSessions) =>
                        push("AttendanceCheckIn", {
                            classItem: currentRoute.params.classItem,
                            session,
                            onRefreshSessions,
                        })
                    }
                    onNavigateRegister={(session) =>
                        push("AttendanceRegister", {
                            classItem: currentRoute.params.classItem,
                            session,
                        })
                    }
                />
            );
            break;

        case "AttendanceCheckIn":
            screenComponent = (
                <AttendanceCheckInScreen
                    classItem={currentRoute.params.classItem}
                    session={currentRoute.params.session}
                    onBack={pop}
                    onSuccess={() => {
                        if (typeof currentRoute.params.onRefreshSessions === "function") {
                            currentRoute.params.onRefreshSessions();
                        }
                        pop();
                    }}
                />
            );
            break;

        case "AttendanceRegister":
            screenComponent = (
                <AttendanceRegisterScreen
                    classItem={currentRoute.params.classItem}
                    session={currentRoute.params.session}
                    onBack={pop}
                />
            );
            break;

        case "MyAttendance":
            screenComponent = (
                <MyAttendanceScreen
                    classItem={currentRoute.params.classItem}
                    onBack={pop}
                />
            );
            break;

        default:
            screenComponent = (
                <MyClassesScreen
                    onSelectClass={(classItem) =>
                        push("ClassDetails", { classItem })
                    }
                />
            );
            break;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />
            {screenComponent}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
});
