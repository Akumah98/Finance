"use client";
import { API_URL } from "@/constants/config";
import { useAuth } from "@/context/AuthContext";
import { calculateLevel, getProgressToNextLevel, getTierEmoji, getTierName } from '@/utils/achievementLevels';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

// Modern Premium Color Palette (2025 Fintech Vibes)
const colors = {
  bg: "#0F0F1A",           // Deep space navy
  surface: "rgba(20, 20, 40, 0.7)",
  card: "rgba(30, 30, 70, 0.6)",
  glass: "rgba(255, 255, 255, 0.08)",
  border: "rgba(120, 120, 255, 0.2)",

  primary: "#6D28D9",       // Rich purple
  gradient1: "#8B5CF6",     // Purple
  gradient2: "#3B82F6",     // Blue
  gradient3: "#10B981",     // Emerald
  accent: "#F59E0B",        // Amber glow
  success: "#10B981",
  danger: "#EF4444",
  text: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
};

interface BalanceState {
  isHidden: boolean;
  isBlurred: boolean;
}

import { useCurrency } from "@/context/CurrencyContext";
import { useOffline } from "@/context/OfflineContext";


export default function DashboardScreen() {
  const router = useRouter();
  const { currency, formatAmount } = useCurrency();
  const { isOffline, queue } = useOffline();
  const [balanceState, setBalanceState] = useState<BalanceState>({
    isHidden: false,
    isBlurred: false,
  });
  const [spendingPeriod, setSpendingPeriod] = useState('Weekly');
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [addFundsModalVisible, setAddFundsModalVisible] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  // Removed hardcoded currency vars

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const { user, token } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState({
    income: 0,
    expense: 0,
    periodSpending: 0,
    spendingChange: 0,
    streak: 0
  });
  const [userAchievements, setUserAchievements] = useState({
    budgetMaster: 0,
    savingsPro: 0,
    streakKing: 0,
    debtSlayer: 0
  });

  useEffect(() => {
    Animated.parallel([
      Animated.spring(fadeAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  const fetchGoals = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_URL}/savings-goals/${user.id || user._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setGoals(data);
      }
    } catch (error) {
      console.error('Failed to fetch goals');
    }
  };

  const fetchTransactions = async () => {
    if (!user) return;
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
      console.error('Failed to fetch transactions');
    }
  };

  const fetchBills = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_URL}/bills/${user.id || user._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setBills(data);
      }
    } catch (error) {
      console.error('Failed to fetch bills');
    }
  };

  const fetchUserStats = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_URL}/users/${user.id || user._id}/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setDashboardData(prev => ({ ...prev, streak: data.streak || 0 }));
        setUserAchievements(data.achievements || {
          budgetMaster: false,
          savingsPro: false,
          streakKing: false,
          debtSlayer: false
        });
      }
    } catch (error) {
      console.error('Failed to fetch user stats');
    }
  };

  const syncStatsToBackend = async (streak: number, achievements: any) => {
    if (!user) return;
    try {
      await fetch(`${API_URL}/users/${user.id || user._id}/stats`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          streak,
          lastActivityDate: new Date(),
          achievements
        })
      });
    } catch (error) {
      console.error('Failed to sync stats');
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGoals();
      fetchTransactions();
      fetchBills();
      fetchUserStats();
    }, [user])
  );

  useEffect(() => {
    if (!transactions.length) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let filteredTransactions = [];
    let previousPeriodTransactions = [];

    if (spendingPeriod === 'Daily') {
      filteredTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= today;
      });
      // Previous day for comparison
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      previousPeriodTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= yesterday && tDate < today;
      });
    } else if (spendingPeriod === 'Weekly') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday as start
      filteredTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= startOfWeek;
      });
      // Previous week for comparison
      const startOfPrevWeek = new Date(startOfWeek);
      startOfPrevWeek.setDate(startOfPrevWeek.getDate() - 7);
      previousPeriodTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= startOfPrevWeek && tDate < startOfWeek;
      });
    } else if (spendingPeriod === 'Monthly') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      filteredTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= startOfMonth;
      });
      // Previous month for comparison
      const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      previousPeriodTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= startOfPrevMonth && tDate < startOfMonth;
      });
    }

    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

    const expense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

    const prevExpense = previousPeriodTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

    let change = 0;
    if (prevExpense > 0) {
      change = ((expense - prevExpense) / prevExpense) * 100;
    } else if (expense > 0) {
      change = 100; // If previous was 0 and now we have expense, it's 100% increase (or treat as infinite)
    }

    setDashboardData(prev => ({
      ...prev,
      income,
      expense,
      periodSpending: expense,
      spendingChange: change,
      streak: calculateStreak(transactions)
    }));

  }, [transactions, spendingPeriod]);

  // Calculate streak: consecutive days with at least 1 transaction
  const calculateStreak = (txns: any[]) => {
    if (!txns.length) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    let currentDate = new Date(today);

    // Check each day going backwards
    while (true) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Check if there's a transaction on this day
      const hasTransaction = txns.some(t => {
        const tDate = new Date(t.date);
        return tDate >= dayStart && tDate <= dayEnd;
      });

      if (hasTransaction) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        // If it's today and no transaction, streak is 0
        // If it's not today and no transaction, break
        if (streak === 0 && currentDate.getTime() === today.getTime()) {
          break;
        } else if (streak > 0) {
          break;
        } else {
          break;
        }
      }
    }

    return streak;
  };


  const handleAddFunds = async () => {
    if (!selectedGoal || !addAmount) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`${API_URL}/savings-goals/${selectedGoal._id || selectedGoal.id}/add-funds`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(addAmount) })
      });
      if (response.ok) {
        fetchGoals(); // Refresh goals
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

  // Removed local formatCurrency


  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const greeting = getTimeBasedGreeting();

  const quickActions = [
    { label: "Add Expense/Income", icon: "add-circle", color: "#8B5CF6", link: "/(main)/add-transaction" },
    { label: "My Goals", icon: "ribbon", color: "#8B5CF6", link: "/(main)/goals" },
    { label: "Add Budget", icon: "wallet", color: "#8B5CF6", link: "/(main)/budgets" },
    { label: "Groups", icon: "people", color: "#8B5CF6", link: "/(main)/groups" },
    { label: "Export", icon: "download", color: "#8B5CF6", link: "/(main)/settings" },
  ];

  const insights = [
    { title: "This Week", value: "$842", change: "+12%", trend: "up" },
    { title: "Dining Alert", value: "$238", change: "+38%", trend: "alert" },
    { title: "30-Day Forecast", value: "+$3,240", change: "Healthy", trend: "good" },
  ];

  const recommendations = [
    "Reduce dining spend by $120 this month",
    "Cancel 2 unused subscriptions → Save $68/mo",
  ];

  const upcomingBills = bills
    .map(bill => {
      const dueDate = new Date(bill.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = dueDate.getTime() - today.getTime();
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        name: bill.name,
        amount: bill.amount,
        days: days,
        isOverdue: days < 0,
        isPaid: bill.isPaid
      };
    })
    .sort((a, b) => a.days - b.days) // Sort by soonest (overdue first)
    .slice(0, 3); // Show top 3



  const calculateAchievements = () => {
    const achievements = [];

    const goalsCompleted = goals.filter(g => (g.currentAmount / g.targetAmount) >= 0.5).length;
    const billsPaid = bills.filter(b => b.isPaid).length;

    // Budget Master
    const budgetMasterProgress = getProgressToNextLevel('budgetMaster', transactions.length);
    achievements.push({
      name: "Budget Master",
      icon: "bullseye",
      level: budgetMasterProgress.level,
      tier: getTierName(budgetMasterProgress.level),
      tierEmoji: getTierEmoji(budgetMasterProgress.level),
      progress: budgetMasterProgress.progress,
      current: budgetMasterProgress.current,
      target: budgetMasterProgress.target,
      description: `Level ${budgetMasterProgress.level} - ${budgetMasterProgress.current}/${budgetMasterProgress.target} transactions`
    });

    // Savings Pro
    const savingsProProgress = getProgressToNextLevel('savingsPro', goalsCompleted);
    achievements.push({
      name: "Savings Pro",
      icon: "star",
      level: savingsProProgress.level,
      tier: getTierName(savingsProProgress.level),
      tierEmoji: getTierEmoji(savingsProProgress.level),
      progress: savingsProProgress.progress,
      current: savingsProProgress.current,
      target: savingsProProgress.target,
      description: `Level ${savingsProProgress.level} - ${savingsProProgress.current}/${savingsProProgress.target} goals`
    });

    // Streak King
    const streakKingProgress = getProgressToNextLevel('streakKing', dashboardData.streak);
    achievements.push({
      name: "Streak King",
      icon: "fire",
      level: streakKingProgress.level,
      tier: getTierName(streakKingProgress.level),
      tierEmoji: getTierEmoji(streakKingProgress.level),
      progress: streakKingProgress.progress,
      current: streakKingProgress.current,
      target: streakKingProgress.target,
      description: `Level ${streakKingProgress.level} - ${streakKingProgress.current}/${streakKingProgress.target} days`
    });

    // Debt Slayer
    const debtSlayerProgress = getProgressToNextLevel('debtSlayer', billsPaid);
    achievements.push({
      name: "Debt Slayer",
      icon: "skull-crossbones",
      level: debtSlayerProgress.level,
      tier: getTierName(debtSlayerProgress.level),
      tierEmoji: getTierEmoji(debtSlayerProgress.level),
      progress: debtSlayerProgress.progress,
      current: debtSlayerProgress.current,
      target: debtSlayerProgress.target,
      description: `Level ${debtSlayerProgress.level} - ${debtSlayerProgress.current}/${debtSlayerProgress.target} bills paid`
    });

    return achievements;
  };

  const achievements = calculateAchievements();

  // Sync achievements and streak to backend when they change
  useEffect(() => {
    if (!user || !transactions.length) return;

    // Calculate total goals completed (reached 50%+)
    const goalsCompleted = goals.filter(g => (g.currentAmount / g.targetAmount) >= 0.5).length;
    const billsPaid = bills.filter(b => b.isPaid).length;

    const currentAchievements = {
      budgetMaster: calculateLevel('budgetMaster', transactions.length),
      savingsPro: calculateLevel('savingsPro', goalsCompleted),
      streakKing: calculateLevel('streakKing', dashboardData.streak),
      debtSlayer: calculateLevel('debtSlayer', billsPaid)
    };

    // Check if any achievement changed
    const achievementsChanged =
      currentAchievements.budgetMaster !== userAchievements.budgetMaster ||
      currentAchievements.savingsPro !== userAchievements.savingsPro ||
      currentAchievements.streakKing !== userAchievements.streakKing ||
      currentAchievements.debtSlayer !== userAchievements.debtSlayer;

    if (achievementsChanged) {
      setUserAchievements(currentAchievements);
      syncStatsToBackend(dashboardData.streak, currentAchievements);
    }
  }, [transactions, goals, dashboardData.streak, bills, userAchievements]);

  // Sync streak to backend when it changes
  useEffect(() => {
    if (!user || dashboardData.streak === 0) return;
    syncStatsToBackend(dashboardData.streak, userAchievements);
  }, [dashboardData.streak]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* Background Gradient */}
        <LinearGradient
          colors={["#1E1B4B", "#0F0F1A", "#0F172A"]}
          style={StyleSheet.absoluteFill}
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

          {/* Offline Banner */}
          {isOffline && (
            <View style={{ backgroundColor: colors.accent, padding: 8, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#000', fontWeight: 'bold' }}>
                Offline Mode - {queue.length} item{queue.length !== 1 ? 's' : ''} pending sync
              </Text>
            </View>
          )}

          {/* Header */}
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.userName}>{user?.userName ? user.userName.split(' ')[0] : 'User'}</Text>
            </View>
            <TouchableOpacity style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.userName ? user.userName.charAt(0).toUpperCase() : 'U'}</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* AI Spending Summary Card */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <BlurView intensity={80} tint="dark" style={styles.aiSummaryCard}>
              <LinearGradient
                colors={["rgba(139, 92, 246, 0.3)", "rgba(107, 70, 193, 0.2)"]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.aiSummaryHeader}>
                <MaterialCommunityIcons name="robot-happy-outline" size={24} color={colors.text} />
                <Text style={styles.aiSummaryTitle}>AI Spending Coach</Text>
              </View>
              <Text style={[styles.aiSummaryText, { color: colors.textMuted }]}>
                Your spending on <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Dining Out</Text> is up <Text style={{ color: colors.textMuted, fontWeight: '600' }}>15%</Text> this week.
              </Text>
              <TouchableOpacity style={styles.aiSummaryButton}>
                <Text style={styles.aiSummaryButtonText}>View Insights</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.text} />
              </TouchableOpacity>
            </BlurView>
          </Animated.View>

          {/* Spending Summary, Income/Expense, Savings Goal */}
          <View style={styles.section}>
            {/* Spending Summary */}
            <Text style={styles.sectionTitle}>Spending Summary</Text>
            <View style={styles.periodSelector}>
              {['Daily', 'Weekly', 'Monthly'].map(period => (
                <TouchableOpacity key={period} onPress={() => setSpendingPeriod(period)}>
                  <View style={[styles.periodButton, spendingPeriod === period && styles.periodButtonActive]}>
                    <Text style={[styles.periodText, spendingPeriod === period && styles.periodTextActive]}>{period}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <BlurView intensity={60} style={styles.insightCard}>
              <View style={styles.insightContent}>
                <View>
                  <Text style={styles.insightTitle}>{spendingPeriod} Spending</Text>
                  <Text style={styles.insightValue}>{formatAmount(dashboardData.periodSpending)}</Text>
                </View>
                <View style={styles.insightRight}>
                  <Text style={[styles.insightChange, { color: dashboardData.spendingChange >= 0 ? colors.danger : colors.success }]}>
                    {dashboardData.spendingChange >= 0 ? '+' : ''}{dashboardData.spendingChange.toFixed(0)}%
                  </Text>
                </View>
              </View>
            </BlurView>

            {/* Income vs Expense */}
            <BlurView intensity={60} style={[styles.insightCard, { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16 }]}>
              <View style={styles.incomeExpenseItem}>
                <Text style={styles.ieLabel}>Income</Text>
                <Text style={styles.iePositive}>+{formatAmount(dashboardData.income)}</Text>
              </View>
              <View style={styles.ieDivider} />
              <View style={styles.incomeExpenseItem}>
                <Text style={styles.ieLabel}>Expenses</Text>
                <Text style={styles.ieNegative}>-{formatAmount(dashboardData.expense)}</Text>
              </View>
            </BlurView>

            {/* Savings Goal */}
            {/* Savings Goals */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.sectionTitle}>Savings Goals</Text>
              <Link href="/(main)/add-goal" asChild>
                <TouchableOpacity>
                  <Ionicons name="add-circle" size={24} color={colors.primary} />
                </TouchableOpacity>
              </Link>
            </View>

            {goals.length === 0 ? (
              <Link href="/(main)/add-goal" asChild>
                <TouchableOpacity style={styles.savingsContainer}>
                  <View style={{ flex: 1, alignItems: 'center', padding: 10 }}>
                    <Text style={styles.savingsText}>Create your first goal</Text>
                  </View>
                </TouchableOpacity>
              </Link>
            ) : (
              goals.map((goal, index) => {
                const percent = (goal.currentAmount / goal.targetAmount) * 100;
                return (
                  <TouchableOpacity
                    key={goal._id || index}
                    style={{ marginBottom: 10 }}
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
                                      // Create Income Transaction and Delete Goal
                                      try {
                                        // 1. Create Income
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

                                        // 2. Delete Goal
                                        await fetch(`${API_URL}/savings-goals/${goal._id || goal.id}`, {
                                          method: 'DELETE'
                                        });

                                        fetchGoals(); // Refresh
                                      } catch (error) {
                                        Alert.alert("Error", "Failed to delete goal");
                                      }
                                    }
                                  },
                                  {
                                    text: "I used it",
                                    onPress: () => {
                                      // Navigate to Add Transaction with special flag
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
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: (goal.color || colors.primary) + '20', justifyContent: 'center', alignItems: 'center' }}>
                          <MaterialCommunityIcons name={goal.icon || 'star'} size={20} color={goal.color || colors.primary} />
                        </View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
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
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              {quickActions.map((action, i) => (
                <Link key={i} href={action.link as any} asChild>
                  <TouchableOpacity style={styles.actionCard} activeOpacity={0.8}>
                    <LinearGradient colors={[action.color + "20", action.color + "10"]} style={styles.actionGradient}>
                      <View style={[styles.actionIcon, { backgroundColor: action.color + "30" }]}>
                        <Ionicons name={action.icon as any} size={28} color={action.color} />
                      </View>
                      <Text style={styles.actionLabel}>{action.label}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Link>
              ))}
            </View>
          </View>

          {/* AI Insights */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Insights</Text>
            {insights.map((insight, i) => (
              <BlurView key={i} intensity={60} style={styles.insightCard}>
                <View style={styles.insightContent}>
                  <View>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <Text style={styles.insightValue}>{insight.value}</Text>
                  </View>
                  <View style={styles.insightRight}>
                    <Text style={[
                      styles.insightChange,
                      insight.trend === "alert" ? { color: colors.danger } : { color: colors.success }
                    ]}>
                      {insight.change}
                    </Text>
                    <Ionicons
                      name={insight.trend === "alert" ? "alert-circle" : "trending-up"}
                      size={20}
                      color={insight.trend === "alert" ? colors.danger : colors.success}
                    />
                  </View>
                </View>
              </BlurView>
            ))}
          </View>

          {/* Recommendations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Smart Recommendations</Text>
            {recommendations.map((rec, i) => (
              <View key={i} style={styles.recCard}>
                <Ionicons name="sparkles" size={20} color="#8B5CF6" />
                <Text style={styles.recText}>{rec}</Text>
              </View>
            ))}
          </View>

          {/* Upcoming Bills */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bills</Text>
            {upcomingBills.length === 0 ? (
              <Link href="/(main)/add-bill" asChild>
                <TouchableOpacity style={styles.billCard}>
                  <View style={{ flex: 1, alignItems: 'center', padding: 10 }}>
                    <Text style={styles.billName}>Add your first bill to track payments</Text>
                  </View>
                </TouchableOpacity>
              </Link>
            ) : (
              upcomingBills.map((bill, i) => (
                <View key={i} style={styles.billCard}>
                  <View style={styles.billLeft}>
                    <View style={[styles.billDot, bill.isPaid && { backgroundColor: colors.success }]} />
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.billName}>{bill.name}</Text>
                        {bill.isPaid && (
                          <View style={{ backgroundColor: colors.success + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ color: colors.success, fontSize: 10, fontWeight: '600' }}>PAID</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.billDue}>
                        {bill.isOverdue
                          ? `Overdue by ${Math.abs(bill.days)} days`
                          : `Due in ${bill.days} days`}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.billAmount}>-{formatAmount(bill.amount)}</Text>
                </View>
              ))
            )}

          </View>

          {/* Streak */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Streak</Text>
            <LinearGradient colors={["#8B5CF620", "#6D28D920"]} style={styles.streakCard}>
              <View style={styles.streakIcon}>
                <Ionicons name="flame" size={48} color="#8B5CF6" />
              </View>
              <View>
                <Text style={styles.streakDays}>{dashboardData.streak} Days</Text>
                <Text style={styles.streakSub}>Keep logging daily!</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Achievements */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <View style={styles.achievementsGrid}>
              {achievements.map((badge, i) => (
                <View key={i} style={styles.badgeCard}>
                  {/* Tier Badge at top-right */}
                  <View style={styles.tierBadge}>
                    <Text style={styles.tierEmoji}>{badge.tierEmoji}</Text>
                  </View>

                  {/* Icon */}
                  <View style={[styles.badgeIconContainer, {
                    backgroundColor: badge.level > 0 ? colors.primary + '30' : colors.glass,
                    borderColor: badge.level >= 100 ? '#FFD700' : 'transparent',
                    borderWidth: badge.level >= 100 ? 2 : 0
                  }]}>
                    <FontAwesome5
                      name={badge.icon as any}
                      size={24}
                      color={badge.level > 0 ? colors.primary : colors.textMuted}
                    />
                  </View>

                  {/* Name and Level */}
                  <Text style={styles.badgeLabel}>{badge.name}</Text>
                  <Text style={styles.badgeLevel}>Level {badge.level}</Text>
                  <Text style={styles.badgeTier}>{badge.tier}</Text>

                  {/* Progress Bar */}
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBarFill, { width: `${badge.progress}%` }]} />
                  </View>

                  {/* Description */}
                  <Text style={styles.badgeDescription}>{badge.description}</Text>
                </View>
              ))}
            </View>
          </View>

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
                <Text style={styles.currencyPrefix}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={addAmount}
                  onChangeText={setAddAmount}
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

// Premium Modern Styles
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 10 },
  greeting: { color: colors.textMuted, fontSize: 16, fontWeight: "500" },
  userName: { color: colors.text, fontSize: 32, fontWeight: "800", marginTop: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#8B5CF6", justifyContent: "center", alignItems: "center" },
  avatarText: { color: "white", fontSize: 20, fontWeight: "bold" },
  aiSummaryCard: {
    margin: 20,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 20,
    backgroundColor: 'rgba(40, 40, 90, 0.5)',
  },
  aiSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  aiSummaryTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
    opacity: 0.9,
  },
  aiSummaryText: {
    color: colors.textMuted,
    fontSize: 17,
    fontWeight: "400",
    lineHeight: 25,
    marginTop: 14,
    marginBottom: 18,
  },
  aiSummaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  aiSummaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.95,
  },

  section: { marginHorizontal: 20, marginBottom: 28 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: "800", marginBottom: 16 },

  actionsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  actionCard: { width: "48%", borderRadius: 20, overflow: "hidden" },
  actionGradient: { padding: 20, alignItems: "center" },
  actionIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  actionLabel: { color: colors.text, fontWeight: "600", fontSize: 13 },

  insightCard: { borderRadius: 20, overflow: "hidden", marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  insightContent: { padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  insightTitle: { color: colors.textSecondary, fontSize: 14 },
  insightValue: { color: colors.text, fontSize: 24, fontWeight: "800", marginTop: 4 },
  insightRight: { alignItems: "flex-end" },
  insightChange: { color: colors.success, fontWeight: "700", fontSize: 14 },

  recCard: { backgroundColor: colors.glass, padding: 16, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  recText: { color: colors.text, flex: 1, fontSize: 14, fontWeight: "500" },

  billCard: { backgroundColor: colors.glass, padding: 16, borderRadius: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  billLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  billDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#8B5CF6" },
  billName: { color: colors.text, fontWeight: "600" },
  billDue: { color: colors.textMuted, fontSize: 12 },
  billAmount: { color: colors.danger, fontWeight: "700" },

  streakCard: { borderRadius: 24, padding: 24, flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#8B5CF640" },
  streakIcon: { marginRight: 20, justifyContent: 'center', alignItems: 'center', width: 64, height: 64 },
  streakDays: { color: colors.text, fontSize: 28, fontWeight: "900" },
  streakSub: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },

  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  badgeCard: {
    width: '48%',
    backgroundColor: colors.glass,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeLabel: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
  badgeDescription: {
    color: colors.textMuted,
    fontWeight: '500',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  tierBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  tierEmoji: {
    fontSize: 20,
  },
  badgeLevel: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 4,
  },
  badgeTier: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: colors.glass,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.glass,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  periodButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 12,
  },
  periodTextActive: {
    color: colors.text,
  },
  incomeExpenseItem: {
    alignItems: 'center',
    gap: 4,
  },
  ieLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  iePositive: { color: colors.success, fontSize: 18, fontWeight: "700" },
  ieNegative: { color: colors.danger, fontSize: 18, fontWeight: "700" },
  ieDivider: { width: 1, height: '80%', backgroundColor: colors.border },
  savingsContainer: {
    backgroundColor: colors.glass,
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    borderWidth: 1,
    borderColor: colors.border,
  },
  savingsText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#1E1B4B',
    borderRadius: 24,
    padding: 24,
    paddingVertical: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8
  },
  modalSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 24
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingHorizontal: 20,
    marginBottom: 24,
    width: '100%'
  },
  currencyPrefix: {
    color: colors.textMuted,
    fontSize: 24,
    fontWeight: '600',
    marginRight: 8
  },
  amountInput: {
    flex: 1,
    color: colors.text,
    fontSize: 32,
    fontWeight: '700',
    paddingVertical: 16
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%'
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  confirmButton: {
    backgroundColor: colors.primary
  },
  cancelButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 16
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16
  }

});