import { colors } from "@/constants/colors";
import { API_URL } from "@/constants/config";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useFocusEffect, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, SectionList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

// Mock Data


const FilterTab = ({ label, active, onPress }: { label: string, active: boolean, onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={[styles.filterTab, active && styles.filterTabActive]}>
    <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const TransactionItem = ({ item, onLongPress }: { item: any, onLongPress: (item: any) => void }) => {
  const { formatAmount } = useCurrency();
  const dateObj = new Date(item.date);
  const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <TouchableOpacity activeOpacity={0.7} onLongPress={() => onLongPress(item)} delayLongPress={500}>
      <BlurView intensity={20} style={styles.transactionItem}>
        <View style={[styles.iconContainer, { backgroundColor: item.type === 'income' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)' }]}>
          <MaterialCommunityIcons name={item.type === 'income' ? "cash" : "cart"} size={24} color={item.type === 'income' ? colors.success : colors.text} />
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionTitle}>{item.note || item.category}</Text>
          <Text style={styles.transactionSub}>{item.category} • {formattedDate}</Text>
        </View>
        <Text style={[styles.transactionAmount, { color: item.type === 'income' ? colors.success : colors.text }]}>
          {item.type === 'income' ? '+' : ''}{formatAmount(Math.abs(item.amount))}
        </Text>
      </BlurView>
    </TouchableOpacity>
  )
};

const TransactionsScreen = () => {
  const router = useRouter();
  const { formatAmount } = useCurrency();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date()); // For month/year selection

  const { user, token } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API_URL}/transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setTransactions(data);
      }
    } catch (error) {
      console.error('Failed to fetch transactions', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/transactions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setTransactions(prev => prev.filter(t => (t._id || t.id) !== id));
      } else {
        Alert.alert('Error', 'Failed to delete transaction');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete transaction');
    }
  };

  const handleTransactionAction = (item: any) => {
    Alert.alert(
      'Manage Transaction',
      'Choose an action',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit',
          onPress: () => router.push({
            pathname: "/(main)/add-transaction",
            params: {
              id: item._id || item.id,
              initialType: item.type,
              initialAmount: item.amount.toString(),
              initialCategory: item.category,
              initialDate: item.date,
              initialNote: item.note
            }
          })
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Delete',
              'Are you sure you want to delete this transaction?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(item._id || item.id) }
              ]
            );
          }
        }
      ]
    );
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchTransactions();
    }, [])
  );

  // Navigate months
  const previousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  // Calculate Month Stats
  const monthStats = useMemo(() => {
    const monthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === selectedDate.getMonth() &&
        tDate.getFullYear() === selectedDate.getFullYear();
    });

    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + parseFloat(t.amount), 0);

    const expense = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + parseFloat(t.amount), 0);

    return {
      income,
      expense,
      net: income - expense
    };
  }, [transactions, selectedDate]);

  // Format selected month/year for display
  const formattedMonth = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Filter and Group Data
  const groupedData = useMemo(() => {
    // 1. Filter
    const filtered = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      if (transactionDate.getMonth() !== selectedDate.getMonth() ||
        transactionDate.getFullYear() !== selectedDate.getFullYear()) {
        return false;
      }
      if (activeFilter === 'Income' && t.type !== 'income') return false;
      if (activeFilter === 'Expense' && t.type !== 'expense') return false;
      const title = t.note || t.category;
      if (searchQuery && !title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

    // 2. Group by Date
    const groups: { [key: string]: { title: string, data: any[], totalIncome: number, totalExpense: number, date: Date } } = {};

    filtered.forEach(t => {
      const date = new Date(t.date);
      const dateKey = date.toDateString(); // "Fri Jan 10 2025"

      if (!groups[dateKey]) {
        let title = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) title = "Today";
        if (date.toDateString() === yesterday.toDateString()) title = "Yesterday";

        groups[dateKey] = {
          title,
          data: [],
          totalIncome: 0,
          totalExpense: 0,
          date
        };
      }

      groups[dateKey].data.push(t);
      if (t.type === 'income') groups[dateKey].totalIncome += parseFloat(t.amount);
      else groups[dateKey].totalExpense += parseFloat(t.amount);
    });

    // 3. Convert to Array and Sort
    return Object.values(groups).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions, selectedDate, activeFilter, searchQuery]);


  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[colors.bg, '#0F172A']}
          style={StyleSheet.absoluteFill}
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.monthNavigator}>
            <TouchableOpacity onPress={previousMonth} style={styles.navButton}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.monthSelector}>
              <Text style={styles.monthText}>{formattedMonth}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="stats-chart" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Search & Filter */}
        <View style={styles.filterSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search transactions..."
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <View style={styles.tabsContainer}>
            {['All', 'Expense', 'Income'].map(tab => (
              <FilterTab key={tab} label={tab} active={activeFilter === tab} onPress={() => setActiveFilter(tab)} />
            ))}
          </View>

          {/* Monthly Totals Display */}
          <View style={styles.statsContainer}>
            <Text style={styles.statsLabel}>
              {activeFilter === 'All' ? 'Net for ' + selectedDate.toLocaleString('default', { month: 'short' }) :
                activeFilter === 'Income' ? 'Total Income' : 'Total Expenses'}
            </Text>
            <Text style={[
              styles.statsValue,
              activeFilter === 'Income' ? { color: colors.success } :
                activeFilter === 'Expense' ? { color: colors.danger } :
                  { color: monthStats.net >= 0 ? colors.success : colors.text }
            ]}>
              {activeFilter === 'All' ? (monthStats.net > 0 ? '+' : monthStats.net < 0 ? '-' : '') + formatAmount(monthStats.net) :
                activeFilter === 'Income' ? '+' + formatAmount(monthStats.income) :
                  '-' + formatAmount(monthStats.expense)}
            </Text>
          </View>
        </View>

        {/* Section List */}
        <SectionList
          sections={groupedData}
          keyExtractor={item => item._id || item.id}
          renderItem={({ item }) => <TransactionItem item={item} onLongPress={handleTransactionAction} />}
          renderSectionHeader={({ section: { title, totalIncome, totalExpense } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
              <View style={styles.sectionTotals}>
                {totalIncome > 0 && <Text style={styles.incomeTotal}>+{formatAmount(totalIncome)}</Text>}
                {totalExpense > 0 && <Text style={styles.expenseTotal}>-{formatAmount(totalExpense)}</Text>}
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          }
          stickySectionHeadersEnabled={false}
        />

        {/* FAB */}
        <Link href="/(main)/add-transaction" asChild>
          <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
            <LinearGradient
              colors={[colors.gradient1, colors.primary]}
              style={styles.fabGradient}
            >
              <Ionicons name="add" size={32} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </Link>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default TransactionsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.glass,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterSection: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  statsContainer: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: colors.glass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsLabel: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '500',
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: 'white',
    fontWeight: '700',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100, // Space for FAB
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sectionTotals: {
    flexDirection: 'row',
    gap: 12,
  },
  incomeTotal: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  expenseTotal: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionSub: {
    color: colors.textMuted,
    fontSize: 13,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: colors.textMuted,
  },
  fab: {
    position: 'absolute',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
});