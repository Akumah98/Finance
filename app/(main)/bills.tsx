import { colors } from "@/constants/colors";
import { API_URL } from "@/constants/config";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useFocusEffect, useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const SectionHeader = ({ title, icon }: { title: string, icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'] }) => (
  <View style={styles.sectionHeader}>
    <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const BillsScreen = () => {
  const router = useRouter();
  const [viewMode, setViewMode] = useState('List');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const [bills, setBills] = useState<any[]>([]);
  const [billHistory, setBillHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBillHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/bills/history/${user.id || user._id}`);
      const data = await response.json();
      if (response.ok) {
        setBillHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch history');
    }
  };

  const fetchBills = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/bills/${user.id || user._id}`);
      const data = await response.json();
      if (response.ok) {
        setBills(data);
      }
      fetchBillHistory();
    } catch (error) {
      console.error('Failed to fetch bills');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchBills();
    }, [])
  );

  const getDaysArray = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentMonth);
  const calendarDays = getDaysArray(currentMonth.getFullYear(), currentMonth.getMonth());

  // Helper to check if a bill matches a specific day in the current viewed month
  const hasBillForDay = (day: number) => {
    if (!day) return false;
    // For simplicity, we check if the bill's due date day matches the calendar day regardless of month/year for monthly bills
    // For specific date bills, we should match fully.
    return bills.some(b => {
      const billDate = new Date(b.dueDate);
      if (b.frequency === 'Monthly') {
        return billDate.getDate() === day;
      }
      // For one-time or yearly, check full date match (ignoring time)
      return billDate.getDate() === day && billDate.getMonth() === currentMonth.getMonth() && billDate.getFullYear() === currentMonth.getFullYear();
    });
  };

  const deleteBill = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/bills/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setBills(prev => prev.filter(b => (b._id || b.id) !== id));
      } else {
        Alert.alert('Error', 'Failed to delete bill');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete bill');
    }
  };

  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!selectedBill) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_URL}/bills/${selectedBill._id || selectedBill.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteReason }),
      });
      if (response.ok) {
        setBills(prev => prev.filter(b => (b._id || b.id) !== (selectedBill._id || selectedBill.id)));
        setSelectedBill(null);
        fetchBillHistory(); // Refresh history
      } else {
        Alert.alert('Error', 'Failed to delete bill');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete bill');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteReason('');
    }
  };

  const handleBillAction = (bill: any) => {
    Alert.alert(
      'Manage Bill',
      'Choose an action',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: bill.isPaid ? 'Mark as Unpaid' : 'Mark as Paid',
          onPress: async () => {
            if (!bill.isPaid) {
              // Marking as PAID - show warning about duplicates
              Alert.alert(
                'Mark as Paid',
                '⚠️ This will automatically create an expense transaction for this bill.\n\nIf you already have an expense recorded for this bill, please delete it first to avoid duplicates.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Continue',
                    onPress: async () => {
                      try {
                        const response = await fetch(`${API_URL}/bills/${bill._id || bill.id}/pay`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ isPaid: true })
                        });
                        if (response.ok) {
                          fetchBills();
                          Alert.alert('Success', 'Bill marked as paid and expense created!');
                        } else {
                          Alert.alert('Error', 'Failed to update bill status');
                        }
                      } catch (error) {
                        Alert.alert('Error', 'Failed to update bill status');
                      }
                    }
                  }
                ]
              );
            } else {
              // Marking as UNPAID - ask about deleting transaction
              Alert.alert(
                'Mark as Unpaid',
                `This bill has a linked transaction of ${formatAmount(bill.amount)}.\n\nWhat would you like to do?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Keep Transaction',
                    onPress: async () => {
                      try {
                        const response = await fetch(`${API_URL}/bills/${bill._id || bill.id}/pay`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ isPaid: false, deleteTransaction: false })
                        });
                        if (response.ok) {
                          fetchBills();
                        } else {
                          Alert.alert('Error', 'Failed to update bill status');
                        }
                      } catch (error) {
                        Alert.alert('Error', 'Failed to update bill status');
                      }
                    }
                  },
                  {
                    text: 'Delete Transaction',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        const response = await fetch(`${API_URL}/bills/${bill._id || bill.id}/pay`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ isPaid: false, deleteTransaction: true })
                        });
                        if (response.ok) {
                          fetchBills();
                          Alert.alert('Success', 'Bill unmarked and transaction deleted');
                        } else {
                          Alert.alert('Error', 'Failed to update bill status');
                        }
                      } catch (error) {
                        Alert.alert('Error', 'Failed to update bill status');
                      }
                    }
                  }
                ]
              );
            }
          }
        },
        {
          text: 'Edit',
          onPress: () => router.push({
            pathname: "/(main)/add-bill",
            params: {
              id: bill._id || bill.id,
              initialName: bill.name,
              initialAmount: bill.amount.toString(),
              initialFrequency: bill.frequency,
              initialCategory: bill.category,
              initialDate: bill.dueDate,
            }
          })
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setSelectedBill(bill);
            setShowDeleteModal(true);
          }
        }
      ]
    );
  };

  const upcomingBills = bills.filter(b => !b.isPaid); // Basic filter, can be refined

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[colors.bg, '#0F172A']}
          style={StyleSheet.absoluteFill}
        />

        <Modal
          visible={showDeleteModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={20} style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Delete Bill</Text>
                <Text style={styles.modalText}>
                  Are you sure you want to delete <Text style={{ fontWeight: '700', color: colors.text }}>{selectedBill?.name}</Text>?
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Reason for deletion (optional)"
                  placeholderTextColor={colors.textMuted}
                  value={deleteReason}
                  onChangeText={setDeleteReason}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowDeleteModal(false)}>
                    <Text style={styles.modalBtnTextCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalBtnDelete} onPress={confirmDelete}>
                    {isDeleting ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.modalBtnTextDelete}>Delete</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          </View>
        </Modal>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Bills & Income</Text>
            <Text style={styles.headerSubtitle}>Manage your recurring transactions</Text>
          </View>

          {/* Add Bill/Subscription Button */}
          <Link href="/(main)/add-bill" asChild>
            <TouchableOpacity style={styles.addButton} activeOpacity={0.8}>
              <LinearGradient
                colors={[colors.gradient1, colors.primary]}
                style={styles.addButtonGradient}
              >
                <Ionicons name="add-circle" size={22} color={colors.text} />
                <Text style={styles.addButtonText}>Add Bill or Subscription</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Link>

          {/* Upcoming Bills Section */}
          <View style={styles.section}>
            <SectionHeader title="Your Bills" icon="calendar-clock" />
            <View style={styles.viewModeToggle}>
              {['List', 'Calendar', 'History'].map(mode => (
                <TouchableOpacity key={mode} onPress={() => { setViewMode(mode); if (mode === 'History') fetchBillHistory(); }}>
                  <View style={[styles.toggleButton, viewMode === mode && styles.toggleButtonActive]}>
                    <Text style={[styles.toggleText, viewMode === mode && styles.toggleTextActive]}>{mode}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
            ) : viewMode === 'List' ? (
              <BlurView intensity={60} style={styles.card}>
                {bills.length === 0 ? (
                  <Text style={{ color: colors.textMuted, textAlign: 'center', padding: 20 }}>No bills found.</Text>
                ) : (
                  bills.map(bill => {
                    const billDate = new Date(bill.dueDate);
                    const formattedDate = billDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return (
                      <TouchableOpacity
                        key={bill._id || bill.id}
                        activeOpacity={0.7}
                        onLongPress={() => handleBillAction(bill)}
                        delayLongPress={500}
                      >
                        <View style={styles.billRow}>
                          <View style={styles.billIconContainer}>
                            <FontAwesome5 name="file-invoice-dollar" size={20} color={colors.text} />
                          </View>
                          <View style={styles.billDetails}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.billName}>{bill.name}</Text>
                              {bill.isPaid && (
                                <View style={{ backgroundColor: colors.success + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                  <Text style={{ color: colors.success, fontSize: 10, fontWeight: '600' }}>PAID</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.billCategory}>{bill.category} • {bill.frequency}</Text>
                          </View>
                          <View style={styles.billRight}>
                            <Text style={styles.billAmount}>{formatAmount(bill.amount)}</Text>
                            <Text style={styles.billDueDate}>Due: {formattedDate}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </BlurView>
            ) : viewMode === 'History' ? (
              <View style={{ gap: 10 }}>
                {billHistory.length === 0 ? (
                  <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 20 }}>No history yet.</Text>
                ) : (
                  billHistory.map((item, index) => (
                    <BlurView key={index} intensity={40} style={{ padding: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ color: colors.text, fontWeight: '700' }}>{item.billName}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{new Date(item.timestamp).toLocaleDateString()}</Text>
                      </View>
                      <Text style={{ color: item.changeType === 'DELETED' ? colors.danger : item.changeType === 'CREATED' ? colors.success : colors.primary, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>
                        {item.changeType}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{item.details}</Text>
                    </BlurView>
                  ))
                )}
              </View>
            ) : (
              <BlurView intensity={60} style={[styles.card, styles.calendarCard]}>
                {/* Calendar Header */}
                <View style={styles.calendarHeader}>
                  <Text style={styles.monthName}>{monthName}</Text>
                  <View style={styles.calendarNav}>
                    <TouchableOpacity onPress={prevMonth} style={{ padding: 4 }}>
                      <Ionicons name="chevron-back" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={nextMonth} style={{ padding: 4 }}>
                      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Days Header */}
                <View style={styles.daysHeader}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <Text key={i} style={styles.dayLabel}>{day}</Text>
                  ))}
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarGrid}>
                  {calendarDays.map((day, i) => {
                    const isRealDay = day !== null;
                    const isSelected = selectedDate === day;
                    const hasBill = isRealDay && hasBillForDay(day);

                    return (
                      <View key={i} style={styles.dayCell}>
                        {isRealDay ? (
                          <TouchableOpacity
                            style={[styles.dayBtn, isSelected && styles.dayBtnSelected]}
                            onPress={() => setSelectedDate(day)}
                          >
                            <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day}</Text>
                            {hasBill && !isSelected && <View style={styles.billDot} />}
                          </TouchableOpacity>
                        ) : (
                          <View style={{ width: 32, height: 32 }} />
                        )}
                      </View>
                    );
                  })}
                </View>
              </BlurView>
            )}
          </View>

        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default BillsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 4,
  },
  addButton: {
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 32,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    height: 56,
  },
  addButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.glass,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  toggleTextActive: {
    color: colors.text,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  billIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.glass,
    marginRight: 16,
  },
  billDetails: {
    flex: 1,
  },
  billName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  billCategory: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  billRight: {
    alignItems: 'flex-end',
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  billDueDate: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  priceAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 6,
  },
  priceAlertText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '700',
  },
  incomeReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.accent + '20',
    borderRadius: 16,
  },
  incomeReminderText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },

  // Calendar Styles
  calendarCard: { padding: 20 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  monthName: { color: colors.text, fontSize: 18, fontWeight: '700' },
  calendarNav: { flexDirection: 'row', gap: 16 },
  daysHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dayLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', width: 32, textAlign: 'center' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, justifyContent: 'space-between' },
  dayCell: { width: '13%', alignItems: 'center' },
  dayBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
  dayBtnSelected: { backgroundColor: colors.primary },
  dayText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  dayTextSelected: { color: 'white', fontWeight: '700' },
  billDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.danger, position: 'absolute', bottom: 4 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { borderRadius: 24, overflow: 'hidden', width: '100%', maxWidth: 400 },
  modalContent: { backgroundColor: colors.glass, padding: 24, borderRadius: 24, borderWidth: 1, borderColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  modalText: { color: colors.textSecondary, marginBottom: 16 },
  modalInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, color: colors.text, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtnCancel: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.glass, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  modalBtnDelete: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.danger, alignItems: 'center' },
  modalBtnTextCancel: { color: colors.text, fontWeight: '600' },
  modalBtnTextDelete: { color: 'white', fontWeight: '700' },
});