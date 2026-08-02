import { colors } from "@/constants/colors";
import { api } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const CHALLENGE_ICONS: Record<string, string> = {
    no_spend: 'hand-left-outline',
    daily_log: 'create-outline',
    under_budget: 'shield-checkmark-outline',
    savings_streak: 'trending-up-outline',
};

export default function ChallengesScreen() {
    const router = useRouter();
    const [challenges, setChallenges] = useState<any[]>([]);
    const [available, setAvailable] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPicker, setShowPicker] = useState(false);
    const [checkingIn, setCheckingIn] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [{ data: userChallenges }, { data: availableList }] = await Promise.all([
                api.get('/challenges'),
                api.get('/challenges/available')
            ]);
            if (userChallenges) setChallenges(userChallenges);
            if (availableList) setAvailable(availableList);
        } catch {
            console.error('Failed to fetch challenges');
        } finally {
            setLoading(false);
        }
    };

    const startChallenge = async (challenge: any) => {
        try {
            const { data } = await api.post('/challenges', challenge);
            if (data) {
                setChallenges(prev => [data, ...prev]);
                setAvailable(prev => prev.filter(c => !(c.type === challenge.type && c.targetDays === challenge.targetDays)));
                setShowPicker(false);
            }
        } catch {
            Alert.alert('Error', 'Failed to start challenge');
        }
    };

    const checkIn = async (id: string) => {
        setCheckingIn(id);
        try {
            const { data } = await api.post(`/challenges/${id}/check-in`);
            if (data) {
                setChallenges(prev => prev.map(c => c._id === id ? data : c));
                if (data.completedAt) {
                    Alert.alert('Challenge Complete!', `You completed "${data.name}"! Best streak: ${data.bestStreak} days.`);
                }
            }
        } catch {
            Alert.alert('Error', 'Check-in failed');
        } finally {
            setCheckingIn(null);
        }
    };

    const abandonChallenge = (id: string, name: string) => {
        Alert.alert('Abandon Challenge', `Give up on "${name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Abandon', style: 'destructive', onPress: async () => {
                    try {
                        await api.delete(`/challenges/${id}`);
                        setChallenges(prev => prev.filter(c => c._id !== id));
                        fetchData();
                    } catch {
                        Alert.alert('Error', 'Failed to abandon challenge');
                    }
                }
            }
        ]);
    };

    const activeChallenges = challenges.filter(c => c.isActive);
    const completedChallenges = challenges.filter(c => !c.isActive);

    const renderChallenge = ({ item }: { item: any }) => {
        const progress = Math.min(100, Math.round((item.currentStreak / item.targetDays) * 100));
        const icon = CHALLENGE_ICONS[item.type] || 'trophy-outline';
        const isChecking = checkingIn === item._id;

        return (
            <View style={styles.challengeCard}>
                <View style={styles.cardTop}>
                    <View style={styles.iconCircle}>
                        <Ionicons name={icon as any} size={22} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.challengeName}>{item.name}</Text>
                        <Text style={styles.challengeDesc}>{item.description}</Text>
                    </View>
                    {item.isActive && (
                        <TouchableOpacity onPress={() => abandonChallenge(item._id, item.name)}>
                            <Ionicons name="close-circle-outline" size={22} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.streakRow}>
                    <View style={styles.streakStat}>
                        <Text style={styles.streakNumber}>{item.currentStreak}</Text>
                        <Text style={styles.streakLabel}>Current</Text>
                    </View>
                    <View style={styles.streakStat}>
                        <Text style={styles.streakNumber}>{item.bestStreak}</Text>
                        <Text style={styles.streakLabel}>Best</Text>
                    </View>
                    <View style={styles.streakStat}>
                        <Text style={styles.streakNumber}>{item.targetDays}</Text>
                        <Text style={styles.streakLabel}>Target</Text>
                    </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressText}>{progress}% complete</Text>

                {item.isActive && (
                    <TouchableOpacity
                        style={styles.checkInBtn}
                        onPress={() => checkIn(item._id)}
                        disabled={!!checkingIn}
                    >
                        {isChecking ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-circle" size={18} color="white" />
                                <Text style={styles.checkInText}>Check In Today</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                {!item.isActive && item.completedAt && (
                    <View style={styles.completedBadge}>
                        <Ionicons name="trophy" size={16} color={colors.accent} />
                        <Text style={styles.completedText}>Completed!</Text>
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaProvider>
                <SafeAreaView style={styles.container}>
                    <LinearGradient colors={[colors.bg, '#0F172A']} style={StyleSheet.absoluteFill} />
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                </SafeAreaView>
            </SafeAreaProvider>
        );
    }

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <LinearGradient colors={[colors.bg, '#0F172A']} style={StyleSheet.absoluteFill} />

                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Challenges</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={() => setShowPicker(true)}>
                        <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={[...activeChallenges, ...completedChallenges]}
                    renderItem={renderChallenge}
                    keyExtractor={item => item._id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="trophy-outline" size={64} color={colors.textMuted} />
                            <Text style={styles.emptyTitle}>No challenges yet</Text>
                            <Text style={styles.emptySubtitle}>Start a challenge to build better financial habits</Text>
                            <TouchableOpacity style={styles.startBtn} onPress={() => setShowPicker(true)}>
                                <Text style={styles.startBtnText}>Browse Challenges</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />

                {/* Challenge Picker Modal */}
                <Modal visible={showPicker} animationType="slide" transparent>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Start a Challenge</Text>
                                <TouchableOpacity onPress={() => setShowPicker(false)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            {available.length === 0 ? (
                                <Text style={styles.noAvailable}>You've started all available challenges!</Text>
                            ) : (
                                available.map((c, i) => (
                                    <TouchableOpacity key={i} style={styles.availableCard} onPress={() => startChallenge(c)}>
                                        <View style={styles.iconCircle}>
                                            <Ionicons name={(CHALLENGE_ICONS[c.type] || 'trophy-outline') as any} size={20} color={colors.primary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.availableName}>{c.name}</Text>
                                            <Text style={styles.availableDesc}>{c.description}</Text>
                                        </View>
                                        <Text style={styles.targetBadge}>{c.targetDays}d</Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    headerTitle: { color: colors.text, fontSize: 22, fontWeight: '700', flex: 1 },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },

    list: { padding: 20, paddingBottom: 40 },

    challengeCard: { backgroundColor: colors.glass, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
    cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
    iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(139, 92, 246, 0.15)', justifyContent: 'center', alignItems: 'center' },
    challengeName: { color: colors.text, fontSize: 16, fontWeight: '700' },
    challengeDesc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

    streakRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10 },
    streakStat: { alignItems: 'center' },
    streakNumber: { color: colors.text, fontSize: 20, fontWeight: '800' },
    streakLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },

    progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, marginBottom: 4 },
    progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
    progressText: { color: colors.textMuted, fontSize: 11, textAlign: 'right' },

    checkInBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.success, paddingVertical: 12, borderRadius: 10, marginTop: 12 },
    checkInText: { color: 'white', fontSize: 14, fontWeight: '700' },

    completedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 8 },
    completedText: { color: colors.accent, fontSize: 14, fontWeight: '700' },

    emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
    emptySubtitle: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
    startBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
    startBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '70%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
    noAvailable: { color: colors.textMuted, textAlign: 'center', paddingVertical: 20 },
    availableCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    availableName: { color: colors.text, fontSize: 15, fontWeight: '600' },
    availableDesc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    targetBadge: { color: colors.primary, fontSize: 14, fontWeight: '700', backgroundColor: 'rgba(139,92,246,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
});
