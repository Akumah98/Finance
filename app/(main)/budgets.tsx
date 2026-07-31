import { api } from "@/lib/api";
import { localCache } from "@/lib/localCache";
import { BudgetsSkeleton } from "@/components/shimmer/BudgetsSkeleton";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { formatAmount as formatInputAmount, parseAmount } from "@/utils/inputValidation";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const colors = {
    bg: "#0F0F1A",
    surface: "rgba(20, 20, 40, 0.7)",
    card: "rgba(30, 30, 70, 0.6)",
    glass: "rgba(255, 255, 255, 0.08)",
    border: "rgba(120, 120, 255, 0.2)",
    primary: "#6D28D9",
    gradient1: "#8B5CF6",
    gradient2: "#3B82F6",
    success: "#10B981",
    danger: "#EF4444",
    text: "#F8FAFC",
    textSecondary: "#CBD5E1",
    textMuted: "#94A3B8",
};

const COMMON_CATEGORIES = [
    "Food",
    "Shopping",
    "Transport",
    "Entertainment",
    "Bills",
    "Groceries",
    "Health",
    "Education",
    "Other"
];

interface BudgetItemProps {
    item: any;
    formatAmount: (amount: number) => string;
    onEdit: (item: any) => void;
    onDelete: (id: string) => void;
}

const BudgetItem = React.memo(({ item, formatAmount, onEdit, onDelete }: BudgetItemProps) => (
    <BlurView intensity={70} style={styles.budgetCard}>
        <View style={styles.budgetIcon}>
            <Ionicons name="wallet" size={24} color={colors.primary} />
        </View>
        <View style={styles.budgetDetails}>
            <Text style={styles.budgetCategory}>{item.category}</Text>
            <Text style={styles.budgetPeriod}>Monthly Budget</Text>
        </View>
        <Text style={styles.budgetAmount}>{formatAmount(item.amount)}</Text>
        <View style={styles.budgetActions}>
            <TouchableOpacity onPress={() => onEdit(item)} style={styles.actionButton}>
                <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(item._id)} style={styles.actionButton}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
        </View>
    </BlurView>
));

const BudgetsScreen = () => {
    const router = useRouter();
    const { user } = useAuth();
    const { currency, formatAmount } = useCurrency();
    const [budgets, setBudgets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedBudget, setSelectedBudget] = useState<any>(null);
    const [category, setCategory] = useState("");
    const [amount, setAmount] = useState("");

    const budgetsCacheKey = `budgets_${user?._id || user?.id || 'guest'}`;

    const fetchBudgets = async () => {
        if (!user) return;
        try {
            const cached = await localCache.get<any[]>(budgetsCacheKey);
            if (cached) {
                setBudgets(cached);
                setIsLoading(false);
            }

            const { data } = await api.get('/budgets');
            if (data) {
                setBudgets(data);
                await localCache.set(budgetsCacheKey, data);
            }
        } catch (error) {
            console.error("Failed to fetch budgets:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchBudgets();
        } finally {
            setRefreshing(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            fetchBudgets();
        }, [user])
    );

    const handleSaveBudget = async () => {
        if (!category.trim() || !amount.trim()) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }

        const budgetData = {
            category: category.trim(),
            amount: parseFloat(parseAmount(amount)),
            period: "monthly",
        };

        try {
            const { data: savedBudget, error } = selectedBudget
                ? await api.put(`/budgets/${selectedBudget._id}`, budgetData)
                : await api.post('/budgets', budgetData);

            if (savedBudget) {
                if (selectedBudget) {
                    setBudgets((prev) =>
                        prev.map((b) => (b._id === savedBudget._id ? savedBudget : b))
                    );
                } else {
                    setBudgets((prev) => [...prev, savedBudget]);
                }
                setModalVisible(false);
                resetForm();
            } else {
                Alert.alert("Error", "Failed to save budget");
            }
        } catch (error) {
            Alert.alert("Error", "Failed to save budget");
        }
    };

    const handleDeleteBudget = useCallback(async (id: string) => {
        Alert.alert(
            "Delete Budget",
            "Are you sure you want to delete this budget?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { data, error } = await api.delete(`/budgets/${id}`);
                            if (data) {
                                setBudgets((prev) => prev.filter((b) => b._id !== id));
                            }
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete budget");
                        }
                    },
                },
            ]
        );
    }, []);

    const openEditModal = useCallback((budget: any) => {
        setSelectedBudget(budget);
        setCategory(budget.category);
        setAmount(formatInputAmount(budget.amount.toString()));
        setModalVisible(true);
    }, []);

    const openAddModal = () => {
        resetForm();
        setModalVisible(true);
    };

    const resetForm = () => {
        setSelectedBudget(null);
        setCategory("");
        setAmount("");
    };

    const renderBudgetItem = useCallback(
        ({ item }: { item: any }) => (
            <BudgetItem
                item={item}
                formatAmount={formatAmount}
                onEdit={openEditModal}
                onDelete={handleDeleteBudget}
            />
        ),
        [formatAmount, openEditModal, handleDeleteBudget]
    );

    if (isLoading) {
        return (
            <SafeAreaProvider>
                <SafeAreaView style={styles.container}>
                    <LinearGradient colors={[colors.bg, "#0F172A"]} style={StyleSheet.absoluteFill} />
                    <BudgetsSkeleton />
                </SafeAreaView>
            </SafeAreaProvider>
        );
    }

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <LinearGradient colors={[colors.bg, "#0F172A"]} style={StyleSheet.absoluteFill} />

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Budgets</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Budget List */}
                <FlatList
                    data={budgets}
                    keyExtractor={(item) => item._id}
                    renderItem={renderBudgetItem}
                    contentContainerStyle={styles.listContent}
                    removeClippedSubviews
                    maxToRenderPerBatch={10}
                    windowSize={10}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="wallet-outline" size={64} color={colors.textMuted} />
                            <Text style={styles.emptyTitle}>No Budgets Yet</Text>
                            <Text style={styles.emptyText}>
                                Set budgets for different categories to track your spending
                            </Text>
                        </View>
                    }
                />

                {/* Add Button */}
                <TouchableOpacity style={styles.fab} onPress={openAddModal} activeOpacity={0.8}>
                    <LinearGradient colors={[colors.gradient1, colors.primary]} style={styles.fabGradient}>
                        <Ionicons name="add" size={32} color="white" />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Add/Edit Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.modalOverlay}
                    >
                        <TouchableOpacity
                            activeOpacity={1}
                            onPress={() => setModalVisible(false)}
                            style={styles.modalOverlay}
                        >
                            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                                <BlurView intensity={90} style={styles.modalContent}>
                                    <ScrollView
                                        showsVerticalScrollIndicator={false}
                                        keyboardShouldPersistTaps="handled"
                                    >
                                        <Text style={styles.modalTitle}>
                                            {selectedBudget ? "Edit Budget" : "Add Budget"}
                                        </Text>

                                        {/* Category Dropdown/Input */}
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Category</Text>
                                            <View style={styles.categorySelector}>
                                                {COMMON_CATEGORIES.map((cat) => (
                                                    <TouchableOpacity
                                                        key={cat}
                                                        style={[
                                                            styles.categoryChip,
                                                            category === cat && styles.categoryChipActive,
                                                        ]}
                                                        onPress={() => setCategory(cat)}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.categoryChipText,
                                                                category === cat && styles.categoryChipTextActive,
                                                            ]}
                                                        >
                                                            {cat}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>

                                        {/* Amount Input */}
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Monthly Amount ({currency.symbol})</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Enter amount"
                                                placeholderTextColor={colors.textMuted}
                                                value={amount}
                                                onChangeText={(text) => setAmount(formatInputAmount(text))}
                                                keyboardType="numeric"
                                                returnKeyType="done"
                                            />
                                        </View>

                                        {/* Buttons */}
                                        <View style={styles.modalButtons}>
                                            <TouchableOpacity
                                                style={[styles.modalButton, styles.cancelButton]}
                                                onPress={() => {
                                                    setModalVisible(false);
                                                    resetForm();
                                                }}
                                            >
                                                <Text style={styles.cancelButtonText}>Cancel</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.modalButton, styles.saveButton]}
                                                onPress={handleSaveBudget}
                                            >
                                                <LinearGradient
                                                    colors={[colors.gradient1, colors.primary]}
                                                    style={styles.saveButtonGradient}
                                                >
                                                    <Text style={styles.saveButtonText}>
                                                        {selectedBudget ? "Update" : "Save"}
                                                    </Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        </View>
                                    </ScrollView>
                                </BlurView>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                </Modal>
            </SafeAreaView>
        </SafeAreaProvider>
    );
};

export default BudgetsScreen;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        paddingTop: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.glass,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.border,
    },
    title: {
        color: colors.text,
        fontSize: 24,
        fontWeight: "800",
    },
    listContent: { padding: 20, paddingBottom: 100 },
    budgetCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.glass,
        overflow: "hidden",
    },
    budgetIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + "20",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    budgetDetails: { flex: 1 },
    budgetCategory: {
        color: colors.text,
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 4,
    },
    budgetPeriod: { color: colors.textMuted, fontSize: 13 },
    budgetAmount: {
        color: colors.primary,
        fontSize: 18,
        fontWeight: "700",
        marginRight: 12,
    },
    budgetActions: { flexDirection: "row", gap: 8 },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.glass,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyState: {
        alignItems: "center",
        marginTop: 60,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        color: colors.text,
        fontSize: 20,
        fontWeight: "700",
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        color: colors.textMuted,
        fontSize: 15,
        textAlign: "center",
        lineHeight: 22,
    },
    fab: {
        position: "absolute",
        bottom: 24,
        right: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 8,
    },
    fabGradient: {
        flex: 1,
        borderRadius: 32,
        justifyContent: "center",
        alignItems: "center",
    },
    modalOverlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.7)",
    },
    modalContent: {
        width: "90%",
        maxWidth: 400,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
    },
    modalTitle: {
        color: colors.text,
        fontSize: 24,
        fontWeight: "800",
        marginBottom: 24,
        textAlign: "center",
    },
    inputGroup: { marginBottom: 20 },
    label: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
    },
    categorySelector: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    categoryChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.glass,
    },
    categoryChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    categoryChipText: {
        color: colors.textMuted,
        fontSize: 14,
        fontWeight: "500",
    },
    categoryChipTextActive: {
        color: "white",
        fontWeight: "700",
    },
    input: {
        backgroundColor: colors.glass,
        borderRadius: 12,
        padding: 16,
        color: colors.text,
        fontSize: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalButtons: {
        flexDirection: "row",
        gap: 12,
        marginTop: 24,
    },
    modalButton: { flex: 1, borderRadius: 12, overflow: "hidden" },
    cancelButton: {
        backgroundColor: colors.glass,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        alignItems: "center",
    },
    cancelButtonText: {
        color: colors.textSecondary,
        fontSize: 16,
        fontWeight: "600",
    },
    saveButton: { flex: 1 },
    saveButtonGradient: {
        padding: 16,
        alignItems: "center",
    },
    saveButtonText: {
        color: "white",
        fontSize: 16,
        fontWeight: "700",
    },
});
