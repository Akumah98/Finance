import { API_URL } from "@/constants/config";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const insightsData = {
  weeklySummary:
    "Great momentum! You're spending 18% less on Dining Out this week. If you keep this up, you'll hit your savings goal 3 weeks early.",
  overspendingAlerts: [
    { category: "Shopping", overBy: 67, budget: 300, icon: "shopping" },
    { category: "Entertainment", overBy: 32, budget: 120, icon: "gamepad-2" },
  ],
  recommendations: [
    "Switch to a cheaper phone plan → Save $48/month",
    "Cancel 'HBO Max' (last used 72 days ago) → Save $15.99",
    "Cook 3 dinners at home this week → Save ~$85",
  ],
  cashFlowForecast: {
    current: 12850,
    projected: 14290,
    trend: "positive",
  },
  budgets: [
    { category: "Dining Out", spent: 168, total: 350, color: "#10B981" },
    { category: "Groceries", spent: 412, total: 600, color: "#3B82F6" },
    { category: "Transport", spent: 94, total: 200, color: "#8B5CF6" },
    { category: "Shopping", spent: 367, total: 300, color: "#EF4444" },
  ],
};

const InsightsScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const [insightsData, setInsightsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInsights = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_URL}/insights/${user.id || user._id}`);
      const data = await response.json();
      if (response.ok) {
        setInsightsData(data);
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchInsights();
    }, [user])
  );

  if (isLoading || !insightsData) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <LinearGradient
            colors={["#0F0F1A", "#1E1B4B", "#0F172A"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#8B5CF6" />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {/* Background */}
        <LinearGradient
          colors={["#0F0F1A", "#1E1B4B", "#0F172A"]}
          style={StyleSheet.absoluteFill}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(600)}>
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>AI Coach</Text>
                <Text style={styles.title}>Your Money, Smarter</Text>
              </View>
            </View>
          </Animated.View>

          {/* 1. Weekly Spending Insights */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.section}>
            <Text style={styles.sectionTitle}>This Week’s Insight</Text>
            <BlurView intensity={80} tint="dark" style={styles.glassCard}>
              <LinearGradient
                colors={["rgba(139, 92, 246, 0.2)", "rgba(59, 130, 246, 0.1)"]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.insightHeader}>
                <Ionicons name="sparkles" size={28} color="#A78BFA" />
                <Text style={styles.insightText}>{insightsData.weeklySummary}</Text>
              </View>
            </BlurView>
          </Animated.View>

          {/* 2. Overspending Alerts */}
          <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.section}>
            <Text style={styles.sectionTitle}>Overspending Alerts</Text>
            {insightsData.overspendingAlerts.length > 0 ? (
              insightsData.overspendingAlerts.map((alert: any, i: number) => (
                <BlurView key={i} intensity={70} style={styles.alertCard}>
                  <View style={styles.alertIcon}>
                    <MaterialCommunityIcons name={alert.icon as any} size={24} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertTitle}>{alert.category}</Text>
                    <Text style={styles.alertSubtitle}>
                      Over budget by <Text style={styles.alertBold}>{formatAmount(alert.overBy)}</Text>
                    </Text>
                  </View>
                  <Ionicons name="warning" size={28} color="#F59E0B" />
                </BlurView>
              ))
            ) : (
              <BlurView intensity={70} style={styles.emptyStateCard}>
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                <Text style={styles.emptyStateTitle}>No Overspending Detected</Text>
                <Text style={styles.emptyStateText}>
                  Start tracking your transactions to see spending alerts and stay within budget
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(main)/add-transaction')}
                  style={styles.emptyStateButton}
                >
                  <Ionicons name="add-circle" size={20} color="#8B5CF6" />
                  <Text style={styles.emptyStateButtonText}>Add Transaction</Text>
                </TouchableOpacity>
              </BlurView>
            )}
          </Animated.View>

          {/* 3. Budget Progress Tracker */}
          <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.section}>
            <Text style={styles.sectionTitle}>Budget Progress</Text>
            <BlurView intensity={80} style={styles.glassCard}>
              {insightsData.budgets.length > 0 ? (
                insightsData.budgets.map((budget: any, i: number) => {
                  const progress = (budget.spent / budget.total) * 100;
                  const isOver = progress > 100;
                  return (
                    <View key={i} style={styles.budgetItem}>
                      <View style={styles.budgetHeader}>
                        <Text style={styles.budgetCategory}>{budget.category}</Text>
                        <Text style={[styles.budgetAmount, isOver && { color: "#EF4444" }]}>
                          {formatAmount(budget.spent)} / {formatAmount(budget.total)}
                        </Text>
                      </View>
                      <View style={styles.progressContainer}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${Math.min(progress, 100)}%`, backgroundColor: budget.color },
                          ]}
                        />
                        {isOver && (
                          <View
                            style={[
                              styles.progressFill,
                              { left: "100%", width: `${progress - 100}%`, backgroundColor: "#EF4444" },
                            ]}
                          />
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyStateBudget}>
                  <Ionicons name="wallet-outline" size={48} color="#8B5CF6" />
                  <Text style={styles.emptyStateTitle}>No Budgets Set</Text>
                  <Text style={styles.emptyStateText}>
                    Set category budgets to track your spending and get personalized alerts
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push('/(main)/budgets')}
                    style={styles.emptyStateButton}
                  >
                    <Ionicons name="settings" size={20} color="#8B5CF6" />
                    <Text style={styles.emptyStateButtonText}>Set Budget</Text>
                  </TouchableOpacity>
                </View>
              )}
            </BlurView>
          </Animated.View>

          {/* 4. Cash Flow Forecast - Only show if enough data */}
          {insightsData.cashFlowForecast.hasEnoughData && (
            <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.section}>
              <Text style={styles.sectionTitle}>30-Day Cash Flow</Text>
              <BlurView intensity={80} style={styles.glassCard}>
                {/* Expected Income */}
                <View style={styles.cashFlowRow}>
                  <View style={styles.cashFlowIcon}>
                    <Ionicons name="arrow-down" size={24} color="#10B981" />
                  </View>
                  <View style={styles.cashFlowDetails}>
                    <Text style={styles.cashFlowLabel}>Expected Income</Text>
                    <Text style={styles.cashFlowSubtext}>Based on 3-month average</Text>
                  </View>
                  <Text style={[styles.cashFlowAmount, { color: "#10B981" }]}>
                    +{formatAmount(insightsData.cashFlowForecast.expectedIncome)}
                  </Text>
                </View>

                {/* Divider */}
                <View style={styles.cashFlowDivider} />

                {/* Expected Expenses */}
                <View style={styles.cashFlowRow}>
                  <View style={[styles.cashFlowIcon, { backgroundColor: "rgba(239, 68, 68, 0.1)" }]}>
                    <Ionicons name="arrow-up" size={24} color="#EF4444" />
                  </View>
                  <View style={styles.cashFlowDetails}>
                    <Text style={styles.cashFlowLabel}>Expected Expenses</Text>
                    <Text style={styles.cashFlowSubtext}>Including upcoming bills</Text>
                  </View>
                  <Text style={[styles.cashFlowAmount, { color: "#EF4444" }]}>
                    -{formatAmount(insightsData.cashFlowForecast.expectedExpenses)}
                  </Text>
                </View>

                {/* Divider */}
                <View style={styles.cashFlowDivider} />

                {/* Net Flow */}
                <View style={[styles.cashFlowRow, { marginTop: 8 }]}>
                  <View style={[
                    styles.cashFlowIcon,
                    { backgroundColor: parseFloat(insightsData.cashFlowForecast.netFlow) >= 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)" }
                  ]}>
                    <Ionicons
                      name={parseFloat(insightsData.cashFlowForecast.netFlow) >= 0 ? "trending-up" : "trending-down"}
                      size={24}
                      color={parseFloat(insightsData.cashFlowForecast.netFlow) >= 0 ? "#10B981" : "#EF4444"}
                    />
                  </View>
                  <View style={styles.cashFlowDetails}>
                    <Text style={[styles.cashFlowLabel, { fontWeight: "700", fontSize: 16 }]}>Net Flow</Text>
                    <Text style={styles.cashFlowSubtext}>{insightsData.cashFlowForecast.insight}</Text>
                  </View>
                  <Text style={[
                    styles.cashFlowAmount,
                    {
                      color: parseFloat(insightsData.cashFlowForecast.netFlow) >= 0 ? "#10B981" : "#EF4444",
                      fontSize: 20,
                      fontWeight: "800"
                    }
                  ]}>
                    {parseFloat(insightsData.cashFlowForecast.netFlow) >= 0 ? "+" : ""}{formatAmount(Math.abs(parseFloat(insightsData.cashFlowForecast.netFlow)))}
                  </Text>
                </View>
              </BlurView>
            </Animated.View>
          )}

          {/* 5. Personalized Recommendations */}
          <Animated.View entering={FadeInDown.delay(600).duration(600)} style={styles.section}>
            <Text style={styles.sectionTitle}>Smart Recommendations</Text>
            <BlurView intensity={70} style={[styles.recCard, { flexDirection: 'column', alignItems: 'center', padding: 32, gap: 16 }]}>
              <View style={[styles.recIcon, { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(245, 158, 11, 0.2)" }]}>
                <Ionicons name="sparkles" size={32} color="#F59E0B" />
              </View>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}>Coming Soon</Text>
                <Text style={{ color: "#94A3B8", fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
                  AI-powered smart recommendations are on the way! We're training our models to give you personalized financial advice.
                </Text>
              </View>
            </BlurView>
          </Animated.View>


        </ScrollView>
      </SafeAreaView>

      {/* Search/Chat Floating Action Button */}
      <TouchableOpacity
        style={styles.fabContainer}
        onPress={() => router.push('/(main)/chat')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#8B5CF6', '#6366F1']}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="chatbubble-ellipses" size={24} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaProvider>
  );
};

export default InsightsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  fabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 110,
    right: 20,
    shadowColor: "#8B5CF6",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  scrollContent: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 32 },
  greeting: { color: "#CBD5E1", fontSize: 16, fontWeight: "500" },
  title: { color: "#FFFFFF", fontSize: 32, fontWeight: "900", marginTop: 4 },

  section: { marginBottom: 32 },
  sectionTitle: { color: "#FFFFFF", fontSize: 22, fontWeight: "800", marginBottom: 16 },

  glassCard: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(120, 120, 255, 0.2)",
    padding: 20,
  },

  // Weekly Insight
  insightHeader: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  insightText: { flex: 1, color: "#E2E8F0", fontSize: 16, lineHeight: 24, fontWeight: "500" },

  // Alerts
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(251, 146, 60, 0.3)",
    backgroundColor: "rgba(251, 146, 60, 0.08)",
  },
  alertIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#F59E0B30", justifyContent: "center", alignItems: "center", marginRight: 16 },
  alertTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  alertSubtitle: { color: "#94A3B8", fontSize: 14, marginTop: 4 },
  alertBold: { color: "#F59E0B", fontWeight: "700" },

  // Budget Progress
  budgetItem: { marginBottom: 20 },
  budgetHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  budgetCategory: { color: "#E2E8F0", fontSize: 15, fontWeight: "600" },
  budgetAmount: { color: "#94A3B8", fontSize: 14 },
  progressContainer: { height: 10, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 8, overflow: "hidden", position: "relative" },
  progressFill: { height: "100%", borderRadius: 8, position: "absolute", left: 0 },

  // Forecast
  forecastHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  forecastLabel: { color: "#94A3B8", fontSize: 14 },
  forecastValue: { color: "#10B981", fontSize: 28, fontWeight: "900" },
  forecastTrend: { alignItems: "center" },
  forecastTrendText: { color: "#10B981", fontWeight: "700", marginTop: 4 },
  chartPlaceholder: { height: 120, justifyContent: "center", alignItems: "center", position: "relative", overflow: "hidden", borderRadius: 16, backgroundColor: "rgba(16, 185, 129, 0.1)" },
  chartLine: { position: "absolute", height: 4, width: "100%", top: 60, borderRadius: 2 },
  chartText: { color: "#10B981", fontWeight: "600", marginTop: 50 },

  // Recommendations
  recCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(251, 146, 60, 0.2)",
  },
  recIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#F59E0B20", justifyContent: "center", alignItems: "center", marginRight: 16 },
  recText: { flex: 1, color: "#E2E8F0", fontSize: 15, lineHeight: 22 },

  // Empty States
  emptyStateCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    backgroundColor: "rgba(16, 185, 129, 0.05)",
  },
  emptyStateBudget: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  emptyStateButtonText: {
    color: "#8B5CF6",
    fontSize: 15,
    fontWeight: "600",
  },

  // Cash Flow
  cashFlowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cashFlowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cashFlowDetails: {
    flex: 1,
  },
  cashFlowLabel: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "600",
  },
  cashFlowSubtext: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  cashFlowAmount: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "700",
  },
  cashFlowDivider: {
    height: 1,
    backgroundColor: "rgba(120, 120, 255, 0.1)",
    marginVertical: 12,
    marginLeft: 56,
  },

  // Chat
  // Message Preview Card
  messagePreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(120, 120, 255, 0.2)",
    gap: 16,
  },
  previewAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#8B5CF6", justifyContent: "center", alignItems: "center" },
  previewAvatarText: { color: "white", fontSize: 16, fontWeight: "bold" },
  previewContent: { flex: 1 },
  previewHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  previewName: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  previewTime: { color: "#94A3B8", fontSize: 12 },
  previewMessage: { color: "#CBD5E1", fontSize: 14 },
});