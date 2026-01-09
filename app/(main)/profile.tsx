import { colors } from '@/constants/colors';
import { API_URL } from '@/constants/config';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, token, register } = useAuth(); // using register as a way to update local user state if login isn't suitable, but ideally AuthContext should expose an 'updateUser'
    const [userName, setUserName] = useState('');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        if (user) {
            setUserName(user.userName);
            setEmail(user.email);
            fetchStats();
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            const response = await fetch(`${API_URL}/users/${user.id}/stats`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    const handleSave = async () => {
        if (!userName.trim() || !email.trim()) {
            Alert.alert('Error', 'Name and Email are required');
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch(`${API_URL}/users/${user.id}/profile`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ userName, email }),
            });

            const data = await response.json();

            if (response.ok) {
                // Update local context
                // Assuming AuthContext's register or login function can update the state, 
                // or we manually update it if exposed. 
                // For now, we'll assume 'register' serves as a generic 'setUser/setToken' wrapper based on context implementation.
                // Re-using register(token, data) to update context state.
                await register(token!, { ...user, userName: data.userName, email: data.email });

                await register(token!, { ...user, userName: data.userName, email: data.email });
                setIsEditing(false); // Exit edit mode

                Alert.alert('Success', 'Profile updated successfully');
            } else {
                Alert.alert('Error', data.message || 'Failed to update profile');
            }
        } catch (error) {
            Alert.alert('Error', 'Network error. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const getAchievementColor = (tier: string) => {
        switch (tier?.toLowerCase()) {
            case 'gold': return '#F59E0B';
            case 'silver': return '#94A3B8'; // Slate-400 looks kinda silver
            case 'bronze': return '#B45309';
            default: return colors.primary;
        }
    };

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <LinearGradient colors={[colors.bg, '#0F172A']} style={StyleSheet.absoluteFill} />

                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                        <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>
                            {isEditing ? 'Cancel' : 'Edit'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.content}>

                        {/* Avatar Section */}
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{userName?.[0]?.toUpperCase() || "U"}</Text>
                            </View>
                            {isEditing && (
                                <TouchableOpacity style={styles.changePhotoBtn}>
                                    <Text style={styles.changePhotoText}>Change Photo (Coming Soon)</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Edit Form */}
                        <View style={styles.formSection}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Full Name</Text>
                                <TextInput
                                    editable={isEditing}
                                    style={[styles.input, !isEditing && styles.inputReadonly]}
                                    value={userName}
                                    onChangeText={setUserName}
                                    placeholder="Enter your name"
                                    placeholderTextColor={colors.textMuted}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Email Address</Text>
                                <TextInput
                                    editable={isEditing}
                                    style={[styles.input, !isEditing && styles.inputReadonly]}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="Enter your email"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        {/* Read-Only Stats */}
                        <Text style={styles.sectionTitle}>Your Progress</Text>

                        <View style={styles.statsGrid}>

                            {/* Streak Card */}
                            <View style={styles.statCard}>
                                <View style={[styles.iconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                                    <Ionicons name="flame" size={24} color="#EF4444" />
                                </View>
                                <View>
                                    <Text style={styles.statValue}>{stats?.streak || 0} Days</Text>
                                    <Text style={styles.statLabel}>Current Streak</Text>
                                </View>
                            </View>

                            {/* Achievements with Tiers */}
                            {stats?.achievements && Object.entries(stats.achievements).map(([key, data]: [string, any]) => {
                                // Map key to readable name
                                const names: Record<string, string> = {
                                    budgetMaster: "Budget Master",
                                    savingsPro: "Savings Pro",
                                    streakKing: "Streak King",
                                    debtSlayer: "Debt Slayer"
                                };

                                return (
                                    <View key={key} style={styles.statCard}>
                                        <View style={[styles.iconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
                                            <Text style={{ fontSize: 20 }}>{data.emoji || '🏆'}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.statValue}>{names[key]}</Text>
                                            <Text style={[styles.statLabel, { color: getAchievementColor(data.tier) }]}>
                                                {data.tier} • Lvl {data.level}
                                            </Text>
                                        </View>
                                    </View>
                                )
                            })}

                        </View>

                    </ScrollView>
                </KeyboardAvoidingView>

                {isEditing && (
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.saveButton, isSaving && styles.disabledButton]}
                            onPress={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

            </SafeAreaView>
        </SafeAreaProvider >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
    backButton: { padding: 8, borderRadius: 20, backgroundColor: colors.glass },
    headerTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },

    content: { padding: 20, paddingBottom: 100 },

    avatarContainer: { alignItems: 'center', marginBottom: 32 },
    avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 4, borderColor: colors.glass },
    avatarText: { color: 'white', fontSize: 40, fontWeight: '700' },
    changePhotoBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.glass, borderRadius: 20 },
    changePhotoText: { color: colors.textMuted, fontSize: 14 },

    formSection: { marginBottom: 32 },
    inputGroup: { marginBottom: 20 },
    label: { color: colors.textSecondary, marginBottom: 8, fontSize: 14, fontWeight: '600' },
    input: {
        backgroundColor: colors.glass,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 16,
        color: colors.text,
        fontSize: 16
    },
    inputReadonly: {
        borderWidth: 0,
        backgroundColor: 'transparent',
        paddingHorizontal: 0,
        color: colors.text
    },

    sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 16 },
    statsGrid: { gap: 12 },
    statCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.glass,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        gap: 16
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValue: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 2 },
    statLabel: { color: colors.textMuted, fontSize: 14 },

    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.glass
    },
    saveButton: {
        backgroundColor: colors.primary,
        padding: 16,
        borderRadius: 14,
        alignItems: 'center'
    },
    disabledButton: { opacity: 0.7 },
    saveButtonText: { color: 'white', fontSize: 16, fontWeight: '700' }
});


