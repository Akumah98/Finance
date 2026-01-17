"use client";
import { API_URL } from "@/constants/config";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { formatAmount as formatInputAmount, parseAmount } from "@/utils/inputValidation";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

// Modern Premium Color Palette (Same as Dashboard)
const colors = {
    bg: "#0F0F1A",
    glass: "rgba(255, 255, 255, 0.08)",
    border: "rgba(120, 120, 255, 0.2)",
    primary: "#6D28D9",
    gradient1: "#8B5CF6",
    gradient2: "#3B82F6",
    accent: "#F59E0B",
    success: "#10B981",
    danger: "#EF4444",
    text: "#F8FAFC",
    textSecondary: "#CBD5E1",
    textMuted: "#94A3B8",
};

export default function GoalsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { currency, formatAmount } = useCurrency();
    const [goals, setGoals] = useState<any[]>([]);
    const [selectedGoal, setSelectedGoal] = useState<any>(null);
    const [addFundsModalVisible, setAddFundsModalVisible] = useState(false);
    const [addAmount, setAddAmount] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchGoals = async () => {
        if (!user) return;
        try {
            const response = await fetch(`${API_URL}/savings-goals/${user.id || user._id}`);
            const data = await response.json();
            if (response.ok) {
                setGoals(data);
            }
        } catch (error) {
            console.error('Failed to fetch goals');
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchGoals();
        }, [user])
    );

    const handleAddFunds = async () => {
        if (!selectedGoal || !addAmount) return;
        setIsUpdating(true);
        try {
            const response = await fetch(`${API_URL}/savings-goals/${selectedGoal._id || selectedGoal.id}/add-funds`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: parseFloat(parseAmount(addAmount)) })
            });
            if (response.ok) {
                fetchGoals();
                setAddFundsModalVisible(false);
                setAddAmount('');
                setSelectedGoal(null);
            }
        } catch (error) {
            console.error('Failed to add funds');
        } finally {
            setIsUpdating(false);
        }
    };



    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <LinearGradient
                    colors={["#1E1B4B", "#0F0F1A", "#0F172A"]}
                    style={StyleSheet.absoluteFill}
                />

                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Goals</Text>
                    <Link href="/(main)/add-goal" asChild>
                        <TouchableOpacity style={styles.addButton}>
                            <Ionicons name="add" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </Link>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                    {goals.length === 0 ? (
                        <View style={styles.emptyState}>
                            <MaterialCommunityIcons name="piggy-bank-outline" size={64} color={colors.textMuted} />
                            <Text style={styles.emptyText}>No goals yet. Start saving today!</Text>
                            <Link href="/(main)/add-goal" asChild>
                                <TouchableOpacity style={styles.createButton}>
                                    <Text style={styles.createButtonText}>Create Goal</Text>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    ) : (
                        goals.map((goal, index) => {
                            const percent = (goal.currentAmount / goal.targetAmount) * 100;
                            return (
                                <TouchableOpacity
                                    key={goal._id || index}
                                    style={{ marginBottom: 12 }}
                                    onPress={() => {
                                        setSelectedGoal(goal);
                                        setAddFundsModalVisible(true);
                                    }}
                                    onLongPress={() => {
                                        Alert.alert(
                                            "Manage Goal",
                                            `What do you want to do with "${goal.name}"?`,
                                            [
                                                { text: "Cancel", style: "cancel" },
                                                {
                                                    text: "Edit",
                                                    onPress: () => {
                                                        router.push({
                                                            pathname: "/(main)/add-goal",
                                                            params: {
                                                                id: goal._id || goal.id,
                                                                name: goal.name,
                                                                targetAmount: goal.targetAmount,
                                                                currentAmount: goal.currentAmount,
                                                                icon: goal.icon,
                                                                deadline: goal.deadline
                                                            }
                                                        });
                                                    }
                                                },
                                                {
                                                    text: "Delete",
                                                    style: "destructive",
                                                    onPress: () => {
                                                        Alert.alert(
                                                            "Delete Goal",
                                                            "What happened to the funds?",
                                                            [
                                                                { text: "Cancel", style: "cancel" },
                                                                {
                                                                    text: "I kept it",
                                                                    onPress: async () => {
                                                                        try {
                                                                            await fetch(`${API_URL}/transactions`, {
                                                                                method: 'POST',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({
                                                                                    userId: user.id || user._id,
                                                                                    type: 'income',
                                                                                    amount: parseFloat(goal.currentAmount),
                                                                                    category: 'Savings',
                                                                                    date: new Date(),
                                                                                    note: `Recovered from ${goal.name}`
                                                                                })
                                                                            });
                                                                            await fetch(`${API_URL}/savings-goals/${goal._id || goal.id}`, {
                                                                                method: 'DELETE'
                                                                            });
                                                                            fetchGoals();
                                                                        } catch (error) {
                                                                            Alert.alert("Error", "Failed to delete goal");
                                                                        }
                                                                    }
                                                                },
                                                                {
                                                                    text: "I used it",
                                                                    onPress: () => {
                                                                        router.push({
                                                                            pathname: "/(main)/add-transaction",
                                                                            params: {
                                                                                initialAmount: String(goal.currentAmount),
                                                                                initialNote: `Savings Goal: ${goal.name}`,
                                                                                initialType: 'expense',
                                                                                deleteGoalId: goal._id || goal.id
                                                                            }
                                                                        });
                                                                    }
                                                                }
                                                            ]
                                                        );
                                                    }
                                                }
                                            ]
                                        );
                                    }}
                                >
                                    <View style={styles.savingsContainer}>
                                        <View style={{ marginRight: 12 }}>
                                            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: (goal.color || colors.primary) + '20', justifyContent: 'center', alignItems: 'center' }}>
                                                <MaterialCommunityIcons name={goal.icon || 'star'} size={22} color={goal.color || colors.primary} />
                                            </View>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                                <Text style={styles.savingsText}>{goal.name}</Text>
                                                <Text style={styles.savingsAmount}>{formatAmount(goal.currentAmount)} / {formatAmount(goal.targetAmount)}</Text>
                                            </View>
                                            <View style={styles.progressContainer}>
                                                <View style={styles.progressBg}>
                                                    <LinearGradient
                                                        colors={[goal.color || colors.gradient1, goal.color ? goal.color + '80' : colors.gradient2]}
                                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                                        style={[styles.progressFill, { width: `${Math.min(percent, 100)}%`, backgroundColor: goal.color || colors.primary }]}
                                                    />
                                                </View>
                                                <Text style={styles.savingsPercent}>{Math.round(percent)}%</Text>
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>

                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={addFundsModalVisible}
                    onRequestClose={() => setAddFundsModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Add to Savings</Text>
                            <Text style={styles.modalSubtitle}>Adding funds to {selectedGoal?.name}</Text>

                            <View style={styles.inputContainer}>
                                <Text style={styles.currencyPrefix}>{currency.symbol}</Text>
                                <TextInput
                                    style={styles.amountInput}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                    value={addAmount}
                                    onChangeText={(text) => setAddAmount(formatInputAmount(text))}
                                    autoFocus
                                />
                            </View>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => setAddFundsModalVisible(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalButton, styles.confirmButton]}
                                    onPress={handleAddFunds}
                                    disabled={isUpdating || !addAmount}
                                >
                                    {isUpdating ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <Text style={styles.confirmButtonText}>Add Funds</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
    addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
    content: { padding: 20 },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { color: colors.textMuted, fontSize: 16, marginTop: 16, marginBottom: 24, fontWeight: '500' },
    createButton: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
    createButtonText: { color: 'white', fontWeight: '700' },

    savingsContainer: {
        backgroundColor: colors.glass,
        padding: 16,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    savingsText: { color: colors.text, fontSize: 16, fontWeight: '700' },
    savingsAmount: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        width: '100%',
    },
    progressBg: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: "hidden" },
    progressFill: { height: "100%", borderRadius: 4 },
    savingsPercent: {
        color: colors.text,
        fontSize: 12,
        fontWeight: '700',
        minWidth: 30,
        textAlign: 'right'
    },

    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { width: '85%', backgroundColor: '#1E1B4B', borderRadius: 24, padding: 24, paddingVertical: 32, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    modalTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
    modalSubtitle: { color: colors.textMuted, fontSize: 14, marginBottom: 24 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingHorizontal: 20, marginBottom: 24, width: '100%' },
    currencyPrefix: { color: colors.textMuted, fontSize: 24, fontWeight: '600', marginRight: 8 },
    amountInput: { flex: 1, color: colors.text, fontSize: 32, fontWeight: '700', paddingVertical: 16 },
    modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
    modalButton: { flex: 1, paddingVertical: 16, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    cancelButton: { backgroundColor: 'rgba(255,255,255,0.05)' },
    confirmButton: { backgroundColor: colors.primary },
    cancelButtonText: { color: colors.text, fontWeight: '600', fontSize: 16 },
    confirmButtonText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
