import { colors } from "@/constants/colors";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function GroupsScreen() {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 800);
    }, []);

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <LinearGradient colors={[colors.bg, '#0F172A']} style={StyleSheet.absoluteFill} />

                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Group Wallets</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
                    }
                >
                    <View style={styles.comingSoonContainer}>
                        <View style={styles.iconCircle}>
                            <FontAwesome5 name="users" size={48} color={colors.primary} />
                        </View>
                        <Text style={styles.comingSoonTitle}>Coming Soon</Text>
                        <Text style={styles.comingSoonText}>
                            Split expenses with friends, track group spending, and settle debts — all in one place.
                        </Text>
                        <View style={styles.featureList}>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                <Text style={styles.featureText}>Create shared wallets</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                <Text style={styles.featureText}>Split bills automatically</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                <Text style={styles.featureText}>Track who owes what</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                <Text style={styles.featureText}>Settle up with one tap</Text>
                            </View>
                        </View>
                        <View style={styles.badge}>
                            <Ionicons name="time-outline" size={16} color={colors.accent} />
                            <Text style={styles.badgeText}>In Development</Text>
                        </View>
                    </View>
                </ScrollView>

            </SafeAreaView>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },

    comingSoonContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    comingSoonTitle: { color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: 12 },
    comingSoonText: { color: colors.textMuted, fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
    featureList: { alignSelf: 'stretch', paddingHorizontal: 20, marginBottom: 32 },
    featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    featureText: { color: colors.textSecondary, fontSize: 15 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.glass, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    badgeText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
});
