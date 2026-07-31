import { api } from "@/lib/api";
import { localCache } from "@/lib/localCache";
import { InsightsSkeleton } from "@/components/shimmer/InsightsSkeleton";
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
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");


const InsightsScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const [insightsData, setInsightsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const insightsCacheKey = `insights_${user?._id || user?.id || 'guest'}`;

  const fetchInsights = async (force: boolean = false) => {
    if (!user) return;
    try {
      if (!force) {
        const cached = await localCache.get<any>(insightsCacheKey);
        if (cached) {
          setInsightsData(cached);
          setIsLoading(false);
        }
      }

      const endpoint = force ? '/insights?force=true' : '/insights';
      const { data } = await api.get(endpoint);
      if (data) {
        setInsightsData(data);
        await localCache.set(insightsCacheKey, data);
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchInsights(true);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

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
          <InsightsSkeleton />
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" colors={["#8B5CF6"]} />
          }
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

          {/* 5. Financial Health Score */}
          {insightsData.score && (
            <Animated.View entering={FadeInDown.delay(500).duration(600)} style={styles.section}>
              <Text style={styles.sectionTitle}>Financial Health</Text>
              <BlurView intensity={80} style={styles.glassCard}>
                <View style={styles.scoreContainer}>
                  <View style={[
                    styles.scoreCircle,
                    insightsData.score.color ? { borderColor: insightsData.score.color, backgroundColor: insightsData.score.color + '15' } : null
                  ]}>
                    <Text style={styles.scoreValue}>{insightsData.score.value}</Text>
                    <Text style={styles.scoreMax}>/100</Text>
                  </View>
                  <View style={styles.scoreDetails}>
                    <Text style={[
                      styles.scoreLabel,
                      insightsData.score.color ? { color: insightsData.score.color } : null
                    ]}>
                      {insightsData.score.label}
                    </Text>
                    <Text style={styles.scoreTip}>{insightsData.score.tip}</Text>
                  </View>
                </View>
              </BlurView>
            </Animated.View>
          )}

          {/* 6. Anomaly Detection */}
          {insightsData.anomalies && insightsData.anomalies.length > 0 && (
            <Animated.View entering={FadeInDown.delay(600).duration(600)} style={styles.section}>
              <Text style={styles.sectionTitle}>Unusual Activity</Text>
              {insightsData.anomalies.map((anomaly: any, i: number) => (
                <BlurView key={i} intensity={70} style={styles.anomalyCard}>
                  <View style={styles.anomalyIcon}>
                    <Ionicons
                      name={anomaly.severity === 'warning' ? 'alert-circle' : 'information-circle'}
                      size={24}
                      color={anomaly.severity === 'warning' ? '#F59E0B' : '#3B82F6'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.anomalyCategory}>{anomaly.category}</Text>
                    <Text style={styles.anomalyDescription}>{anomaly.description}</Text>
                  </View>
                  {anomaly.amount > 0 && (
                    <Text style={styles.anomalyAmount}>{formatAmount(anomaly.amount)}</Text>
                  )}
                </BlurView>
              ))}
            </Animated.View>
          )}

          {/* 7. Predictive Budget */}
          {insightsData.predictiveBudget && (
            <Animated.View entering={FadeInDown.delay(700).duration(600)} style={styles.section}>
              <Text style={styles.sectionTitle}>Month-End Projection</Text>
              <BlurView intensity={80} style={styles.glassCard}>
                <View style={styles.projectionRow}>
                  <View style={styles.projectionIcon}>
                    <Ionicons name="telescope" size={24} color="#A78BFA" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.projectionLabel}>Projected End Balance</Text>
                    <Text style={[styles.projectionAmount, {
                      color: insightsData.predictiveBudget.projectedEndOfMonth >= 0 ? '#10B981' : '#EF4444'
                    }]}>
                      {formatAmount(Math.abs(insightsData.predictiveBudget.projectedEndOfMonth))}
                      {insightsData.predictiveBudget.projectedEndOfMonth < 0 ? ' deficit' : ' surplus'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.projectionSuggestion}>
                  {insightsData.predictiveBudget.suggestion}
                </Text>
              </BlurView>
            </Animated.View>
          )}

          {/* 8. AI Recommendations */}
          <Animated.View entering={FadeInDown.delay(800).duration(600)} style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.sectionTitle}>Smart Recommendations</Text>
              {insightsData.aiPowered && (
                <View style={styles.aiBadge}>
                  <Ionicons name="sparkles" size={12} color="#A78BFA" />
                  <Text style={styles.aiBadgeText}>AI</Text>
                </View>
              )}
            </View>
            {insightsData.recommendations && insightsData.recommendations.length > 0 ? (
              insightsData.recommendations.map((rec: any, i: number) => {
                const isObject = typeof rec === 'object';
                const text = isObject ? rec.text : rec;
                const savings = isObject ? rec.savings : null;
                const priority = isObject ? rec.priority : 'medium';
                return (
                  <BlurView key={i} intensity={70} style={styles.recCard}>
                    <View style={[styles.recIcon, {
                      backgroundColor: priority === 'high' ? 'rgba(239, 68, 68, 0.2)' :
                        priority === 'medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'
                    }]}>
                      <Ionicons
                        name={priority === 'high' ? 'flash' : priority === 'medium' ? 'bulb' : 'leaf'}
                        size={20}
                        color={priority === 'high' ? '#EF4444' : priority === 'medium' ? '#F59E0B' : '#10B981'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recText}>{text}</Text>
                      {savings && <Text style={styles.recSavings}>Potential savings: {savings}</Text>}
                    </View>
                  </BlurView>
                );
              })
            ) : (
              <BlurView intensity={70} style={[styles.recCard, { justifyContent: 'center', padding: 24 }]}>
                <Text style={{ color: '#94A3B8', textAlign: 'center' }}>Add more transactions to get personalized recommendations</Text>
              </BlurView>
            )}
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
  recSavings: { color: "#10B981", fontSize: 13, marginTop: 4, fontWeight: "600" },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(139, 92, 246, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  aiBadgeText: { color: '#A78BFA', fontSize: 11, fontWeight: '700' },

  // Health Score
  scoreContainer: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  scoreCircle: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', backgroundColor: 'rgba(139, 92, 246, 0.1)' },
  scoreValue: { color: '#FFFFFF', fontSize: 24, fontWeight: '900' },
  scoreMax: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginLeft: 1, marginTop: 4 },
  scoreDetails: { flex: 1 },
  scoreLabel: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  scoreTip: { color: '#94A3B8', fontSize: 14, lineHeight: 20 },

  // Anomalies
  anomalyCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)' },
  anomalyIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(245, 158, 11, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  anomalyCategory: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  anomalyDescription: { color: '#94A3B8', fontSize: 13, marginTop: 2 },
  anomalyAmount: { color: '#F59E0B', fontSize: 15, fontWeight: '700' },

  // Predictive Budget
  projectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  projectionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(139, 92, 246, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  projectionLabel: { color: '#94A3B8', fontSize: 13 },
  projectionAmount: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  projectionSuggestion: { color: '#CBD5E1', fontSize: 14, lineHeight: 20, paddingLeft: 58 },

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