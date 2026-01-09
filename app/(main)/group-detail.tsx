import { colors } from "@/constants/colors";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const mockGroupExpenses = [
    { id: '1', title: 'Dinner at Mario\'s', amount: 120, payer: 'Alex', date: 'Dec 09' },
    { id: '2', title: 'Uber to Hotel', amount: 45, payer: 'John', date: 'Dec 08' },
    { id: '3', title: 'Grocery Run', amount: 88, payer: 'Sarah', date: 'Dec 08' },
];

export default function GroupDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [settleModalVisible, setSettleModalVisible] = useState(false);

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                <LinearGradient colors={[colors.bg, '#0F172A']} style={StyleSheet.absoluteFill} />

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerTitle}>Trip to Bali</Text>
                        <Text style={styles.headerSub}>4 members</Text>
                    </View>
                    <TouchableOpacity style={styles.settingsBtn}>
                        <Ionicons name="settings-outline" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Balances Summary */}
                <View style={styles.balancedCard}>
                    <Text style={styles.balanceTitle}>Your Balance</Text>
                    <Text style={styles.balanceAmountPositive}>+ $150.00</Text>
                    <Text style={styles.balanceSub}>You get back $150.00 in total</Text>

                    <TouchableOpacity style={styles.settleBtn} onPress={() => setSettleModalVisible(true)}>
                        <Text style={styles.settleBtnText}>Settle Up</Text>
                    </TouchableOpacity>
                </View>

                {/* Expenses List */}
                <View style={styles.listContainer}>
                    <View style={styles.listHeader}>
                        <Text style={styles.listTitle}>Recent Activity</Text>
                        <TouchableOpacity style={styles.addExpenseBtn}>
                            <Ionicons name="add" size={20} color="white" />
                            <Text style={styles.addExpenseText}>Add Expense</Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={mockGroupExpenses}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.expenseItem}>
                                <View style={styles.iconBox}>
                                    <MaterialCommunityIcons name="receipt" size={20} color={colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.expenseTitle}>{item.title}</Text>
                                    <Text style={styles.expenseSub}>{item.payer} paid ${item.amount}</Text>
                                </View>
                                <Text style={styles.expenseDate}>{item.date}</Text>
                            </View>
                        )}
                    />
                </View>

                {/* Settle Up Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={settleModalVisible}
                    onRequestClose={() => setSettleModalVisible(false)}
                >
                    <BlurView intensity={90} tint="dark" style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Settle Up</Text>
                            <Text style={styles.modalSub}>Record a payment made to you.</Text>

                            <View style={styles.payerSelector}>
                                <Text style={styles.pickerLabel}>Who paid you?</Text>
                                <View style={styles.userChip}>
                                    <View style={styles.avatar}><Text style={styles.avatarText}>J</Text></View>
                                    <Text style={styles.userName}>John</Text>
                                    <Ionicons name="chevron-down" size={16} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
                                </View>
                            </View>

                            <View style={styles.amountInputContainer}>
                                <Text style={styles.currency}>$</Text>
                                <TextInput
                                    style={styles.amountInput}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                    autoFocus
                                />
                            </View>

                            <TouchableOpacity style={styles.confirmBtn} onPress={() => setSettleModalVisible(false)}>
                                <Text style={styles.confirmText}>Confirm Payment</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setSettleModalVisible(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </BlurView>
                </Modal>

            </SafeAreaView>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
    settingsBtn: { marginLeft: 'auto', width: 40, height: 40, borderRadius: 20, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
    headerSub: { color: colors.textMuted, fontSize: 12 },

    balancedCard: { margin: 20, marginTop: 0, padding: 24, backgroundColor: colors.glass, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    balanceTitle: { color: colors.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 8 },
    balanceAmountPositive: { color: colors.success, fontSize: 32, fontWeight: '800', marginBottom: 4 },
    balanceSub: { color: colors.textMuted, fontSize: 13, marginBottom: 20 },
    settleBtn: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 16 },
    settleBtnText: { color: 'white', fontWeight: '700' },

    listContainer: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20 },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    listTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
    addExpenseBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.glass, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, gap: 4, borderWidth: 1, borderColor: colors.border },
    addExpenseText: { color: colors.text, fontSize: 12, fontWeight: '600' },

    expenseItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.glass, padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    expenseTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
    expenseSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    expenseDate: { color: colors.textMuted, fontSize: 12 },

    modalContainer: { flex: 1, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: colors.border },
    modalTitle: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
    modalSub: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 24 },

    payerSelector: { marginBottom: 24 },
    pickerLabel: { color: colors.textSecondary, marginBottom: 12, fontWeight: '600' },
    userChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.glass, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
    avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { color: colors.bg, fontWeight: 'bold' },
    userName: { color: colors.text, fontWeight: '600' },

    amountInputContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
    currency: { color: colors.success, fontSize: 32, fontWeight: '700', marginRight: 4 },
    amountInput: { color: colors.success, fontSize: 48, fontWeight: '700', minWidth: 100, textAlign: 'center' },

    confirmBtn: { backgroundColor: colors.success, padding: 18, borderRadius: 20, alignItems: 'center', marginBottom: 12 },
    confirmText: { color: 'white', fontSize: 16, fontWeight: '700' },
    cancelBtn: { padding: 16, alignItems: 'center' },
    cancelText: { color: colors.textMuted, fontWeight: '600' },
});
