import { API_URL } from "@/constants/config";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const colors = {
  bg: "#0F0F1A",
  glass: "rgba(255, 255, 255, 0.08)",
  border: "rgba(120, 120, 255, 0.2)",
  primary: "#6D28D9",
  gradient1: "#8B5CF6",
  success: "#10B981",
  danger: "#EF4444",
  warning: "#F59E0B",
  text: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
};

const BUCKET_COLORS = {
  needs: "#3B82F6",
  wants: "#8B5CF6",
  future: "#10B981",
};

interface ReviewData {
  period: { year: number; month: number; label: string };
  summary: {
    totalIncome: number;
    totalExpenses: number;
    savedAmount: number;
    savingsRate: number;
    savingsRateTarget: number;
    netBalance: number;
  };
  buckets: {
    needs: BucketData;
    wants: BucketData;
    future: BucketData;
  };
  categoryBreakdown: CategoryItem[];
  topWin: CategoryItem | null;
  topMiss: CategoryItem | null;
  bills: { total: number; paid: number; missed: number };
  tip: string;
  hasPlan: boolean;
}

interface BucketData {
  label: string;
  planned: number;
  actual: number;
  pct: number;
  diff: number;
  status: "ok" | "over";
}

interface CategoryItem {
  category: string;
  amount: number;
  budget: number | null;
  overBudget: boolean;
  overBy: number;
}

// Build last 3 months as selectable options
const buildMonthOptions = () => {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleString("default", { month: "short", year: "numeric" }),
      isCurrent: i === 0,
    });
  }
  return opts;
};

export default function MonthlyReviewScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { formatAmount } = useCurrency();

  const monthOptions = buildMonthOptions();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userId = user?.id || user?._id;

  const fetchReview = async (idx: number) => {
    if (!userId) return;
    const { year, month } = monthOptions[idx];
    try {
      const res = await fetch(
        `${API_URL}/monthly-review/${userId}?year=${year}&month=${month}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) setData(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchReview(selectedIdx);
    }, [userId])
  );

  const handleSelectMonth = (idx: number) => {
    setSelectedIdx(idx);
    setLoading(true);
    fetchReview(idx);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReview(selectedIdx);
  };

  const getBucketBarWidth = (bucket: BucketData): string => {
    if (bucket.planned === 0) return "0%";
    return `${Math.min((bucket.actual / bucket.planned) * 100, 100)}%`;
  };

  const getBucketOverflowWidth = (bucket: BucketData): string => {
    if (bucket.planned === 0 || bucket.status !== "over") return "0%";
    const overflow = ((bucket.actual - bucket.planned) / bucket.planned) * 100;
    return `${Math.min(overflow, 30)}%`;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <LinearGradient colors={["#1E1B4B", "#0F0F1A", "#0F172A"]} style={StyleSheet.absoluteFill} />
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const noData = !data || data.summary.totalIncome === 0;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <LinearGradient colors={["#1E1B4B", "#0F0F1A", "#0F172A"]} style={StyleSheet.absoluteFill} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 48 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Month in Review</Text>
              <Text style={styles.headerSub}>How did you do?</Text>
            </View>
          </View>

          {/* Month selector */}
          <View style={styles.monthSelector}>
            {monthOptions.map((opt, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.monthPill, selectedIdx === i && styles.monthPillActive]}
                onPress={() => handleSelectMonth(i)}
              >
                <Text style={[styles.monthPillText, selectedIdx === i && styles.monthPillTextActive]}>
                  {opt.label}
                  {opt.isCurrent ? " •" : ""}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {noData ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={56} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No data for {data?.period.label ?? monthOptions[selectedIdx].label}</Text>
              <Text style={styles.emptySubtitle}>Log income and expenses during this month to see your review.</Text>
            </View>
          ) : (
            <>
              {/* Summary card */}
              <BlurView intensity={60} tint="dark" style={styles.summaryCard}>
                <LinearGradient
                  colors={["rgba(109,40,217,0.35)", "rgba(59,130,246,0.2)"]}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.summaryMonth}>{data!.period.label}</Text>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryCol}>
                    <Text style={styles.summaryMeta}>Income</Text>
                    <Text style={[styles.summaryVal, { color: colors.success }]}>
                      +{formatAmount(data!.summary.totalIncome)}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryCol}>
                    <Text style={styles.summaryMeta}>Expenses</Text>
                    <Text style={[styles.summaryVal, { color: colors.danger }]}>
                      -{formatAmount(data!.summary.totalExpenses)}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryCol}>
                    <Text style={styles.summaryMeta}>Saved</Text>
                    <Text style={[styles.summaryVal, { color: data!.summary.netBalance >= 0 ? colors.success : colors.danger }]}>
                      {data!.summary.netBalance >= 0 ? "+" : "-"}
                      {formatAmount(Math.abs(data!.summary.netBalance))}
                    </Text>
                  </View>
                </View>

                {/* Savings rate */}
                <View style={styles.savingsRateRow}>
                  <Text style={styles.savingsRateLabel}>Savings rate</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text
                      style={[
                        styles.savingsRateVal,
                        {
                          color:
                            data!.summary.savingsRate >= 20
                              ? colors.success
                              : data!.summary.savingsRate >= 10
                              ? colors.warning
                              : colors.danger,
                        },
                      ]}
                    >
                      {data!.summary.savingsRate}%
                    </Text>
                    <Text style={styles.savingsRateTarget}>/ 20% target</Text>
                  </View>
                </View>
                <View style={styles.savingsBarBg}>
                  <View
                    style={[
                      styles.savingsBarFill,
                      {
                        width: `${Math.min(data!.summary.savingsRate, 20) * 5}%`,
                        backgroundColor:
                          data!.summary.savingsRate >= 20
                            ? colors.success
                            : data!.summary.savingsRate >= 10
                            ? colors.warning
                            : colors.danger,
                      },
                    ]}
                  />
                  {/* target marker at 100% */}
                  <View style={styles.savingsBarMarker} />
                </View>
              </BlurView>

              {/* Planned vs Actual buckets */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Planned vs Actual</Text>
                {(["needs", "wants", "future"] as const).map((key) => {
                  const bucket = data!.buckets[key];
                  const barColor = BUCKET_COLORS[key];
                  const isOver = bucket.status === "over";
                  return (
                    <BlurView key={key} intensity={50} tint="dark" style={styles.bucketCard}>
                      <View style={styles.bucketRow}>
                        <View style={[styles.bucketDot, { backgroundColor: barColor }]} />
                        <Text style={styles.bucketLabel}>{bucket.label}</Text>
                        <View style={{ flex: 1 }} />
                        {isOver ? (
                          <View style={styles.overBadge}>
                            <Text style={styles.overBadgeText}>
                              +{formatAmount(Math.abs(bucket.diff))} over
                            </Text>
                          </View>
                        ) : (
                          <Text style={[styles.bucketUnder, { color: colors.success }]}>
                            {formatAmount(bucket.diff)} under
                          </Text>
                        )}
                      </View>

                      {/* Stacked bar: planned (ghost) + actual */}
                      <View style={styles.bucketBarOuter}>
                        {/* Ghost planned bar */}
                        <View style={[styles.bucketBarGhost, { backgroundColor: barColor + "25" }]} />
                        {/* Actual fill */}
                        <View
                          style={[
                            styles.bucketBarActual,
                            {
                              width: getBucketBarWidth(bucket),
                              backgroundColor: isOver ? colors.danger : barColor,
                            },
                          ]}
                        />
                        {/* Overflow indicator */}
                        {isOver && (
                          <View
                            style={[
                              styles.bucketBarOverflow,
                              { width: getBucketOverflowWidth(bucket) },
                            ]}
                          />
                        )}
                      </View>

                      <View style={styles.bucketAmounts}>
                        <Text style={styles.bucketAmountLabel}>
                          Actual: <Text style={{ color: isOver ? colors.danger : colors.text }}>{formatAmount(bucket.actual)}</Text>
                        </Text>
                        <Text style={styles.bucketAmountLabel}>
                          Planned: <Text style={{ color: barColor }}>{formatAmount(bucket.planned)}</Text>
                        </Text>
                      </View>
                    </BlurView>
                  );
                })}
              </View>

              {/* Win & Miss cards */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Highlights</Text>
                <View style={styles.highlightRow}>
                  {/* Top Win */}
                  <BlurView intensity={50} tint="dark" style={[styles.highlightCard, { borderColor: colors.success + "40" }]}>
                    <LinearGradient colors={["rgba(16,185,129,0.15)", "rgba(16,185,129,0.05)"]} style={StyleSheet.absoluteFill} />
                    <View style={[styles.highlightIcon, { backgroundColor: colors.success + "20" }]}>
                      <Ionicons name="trophy" size={20} color={colors.success} />
                    </View>
                    <Text style={styles.highlightTitle}>Top Win</Text>
                    {data!.topWin ? (
                      <>
                        <Text style={styles.highlightCategory}>{data!.topWin.category}</Text>
                        <Text style={[styles.highlightAmt, { color: colors.success }]}>
                          {formatAmount(data!.topWin.budget! - data!.topWin.amount)} under budget
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.highlightEmpty}>Set budgets to track wins</Text>
                    )}
                  </BlurView>

                  {/* Top Miss */}
                  <BlurView intensity={50} tint="dark" style={[styles.highlightCard, { borderColor: colors.danger + "40" }]}>
                    <LinearGradient colors={["rgba(239,68,68,0.15)", "rgba(239,68,68,0.05)"]} style={StyleSheet.absoluteFill} />
                    <View style={[styles.highlightIcon, { backgroundColor: colors.danger + "20" }]}>
                      <Ionicons name="alert-circle" size={20} color={colors.danger} />
                    </View>
                    <Text style={styles.highlightTitle}>Top Miss</Text>
                    {data!.topMiss ? (
                      <>
                        <Text style={styles.highlightCategory}>{data!.topMiss.category}</Text>
                        <Text style={[styles.highlightAmt, { color: colors.danger }]}>
                          {formatAmount(data!.topMiss.overBy)} over budget
                        </Text>
                      </>
                    ) : (
                      <Text style={[styles.highlightEmpty, { color: colors.success }]}>No overspends!</Text>
                    )}
                  </BlurView>
                </View>
              </View>

              {/* Bills */}
              {data!.bills.total > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Bills This Month</Text>
                  <BlurView intensity={50} tint="dark" style={styles.billsCard}>
                    <View style={styles.billsStat}>
                      <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                      <Text style={styles.billsStatVal}>{data!.bills.paid}</Text>
                      <Text style={styles.billsStatLabel}>Paid</Text>
                    </View>
                    <View style={styles.billsDivider} />
                    <View style={styles.billsStat}>
                      <Ionicons name="close-circle" size={24} color={data!.bills.missed > 0 ? colors.danger : colors.textMuted} />
                      <Text style={[styles.billsStatVal, { color: data!.bills.missed > 0 ? colors.danger : colors.textMuted }]}>
                        {data!.bills.missed}
                      </Text>
                      <Text style={styles.billsStatLabel}>Missed</Text>
                    </View>
                    <View style={styles.billsDivider} />
                    <View style={styles.billsStat}>
                      <Ionicons name="receipt-outline" size={24} color={colors.textMuted} />
                      <Text style={styles.billsStatVal}>{data!.bills.total}</Text>
                      <Text style={styles.billsStatLabel}>Total</Text>
                    </View>
                  </BlurView>
                </View>
              )}

              {/* Top spending categories */}
              {data!.categoryBreakdown.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Spending Breakdown</Text>
                  <BlurView intensity={50} tint="dark" style={styles.categoryCard}>
                    {data!.categoryBreakdown.slice(0, 6).map((cat, i) => {
                      const pct = data!.summary.totalExpenses > 0
                        ? (cat.amount / data!.summary.totalExpenses) * 100
                        : 0;
                      return (
                        <View key={i} style={styles.categoryRow}>
                          <Text style={styles.categoryName}>{cat.category}</Text>
                          <View style={styles.categoryBarBg}>
                            <View
                              style={[
                                styles.categoryBarFill,
                                {
                                  width: `${pct}%`,
                                  backgroundColor: cat.overBudget ? colors.danger : colors.gradient1,
                                },
                              ]}
                            />
                          </View>
                          <Text style={[styles.categoryAmt, cat.overBudget && { color: colors.danger }]}>
                            {formatAmount(cat.amount)}
                          </Text>
                        </View>
                      );
                    })}
                  </BlurView>
                </View>
              )}

              {/* Tip for next month */}
              <View style={styles.tipCard}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={22} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tipTitle}>For next month</Text>
                  <Text style={styles.tipText}>{data!.tip}</Text>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.glass,
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: { color: colors.text, fontSize: 22, fontWeight: "800" },
  headerSub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },

  monthSelector: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  monthPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  monthPillText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  monthPillTextActive: { color: colors.text },

  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: "700", textAlign: "center" },
  emptySubtitle: { color: colors.textMuted, fontSize: 14, textAlign: "center", lineHeight: 22 },

  summaryCard: {
    margin: 20,
    marginBottom: 8,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  summaryMonth: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 14 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  summaryCol: { flex: 1, alignItems: "center" },
  summaryMeta: { color: colors.textMuted, fontSize: 11, fontWeight: "500", marginBottom: 4 },
  summaryVal: { color: colors.text, fontSize: 15, fontWeight: "800" },
  summaryDivider: { width: 1, backgroundColor: colors.border },

  savingsRateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  savingsRateLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  savingsRateVal: { fontSize: 16, fontWeight: "800" },
  savingsRateTarget: { color: colors.textMuted, fontSize: 11 },
  savingsBarBg: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },
  savingsBarFill: { height: "100%", borderRadius: 4 },
  savingsBarMarker: {
    position: "absolute",
    right: 0,
    top: -2,
    width: 2,
    height: 12,
    backgroundColor: colors.textMuted,
    borderRadius: 1,
  },

  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginBottom: 12 },

  bucketCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  bucketRow: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
  bucketDot: { width: 10, height: 10, borderRadius: 5 },
  bucketLabel: { color: colors.text, fontSize: 14, fontWeight: "700" },
  overBadge: {
    backgroundColor: colors.danger + "20",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.danger + "40",
  },
  overBadgeText: { color: colors.danger, fontSize: 11, fontWeight: "700" },
  bucketUnder: { fontSize: 12, fontWeight: "600" },
  bucketBarOuter: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.06)",
    overflow: "hidden",
    marginBottom: 8,
    position: "relative",
  },
  bucketBarGhost: {
    position: "absolute",
    left: 0, top: 0, right: 0, bottom: 0,
    borderRadius: 5,
  },
  bucketBarActual: {
    position: "absolute",
    left: 0, top: 0, bottom: 0,
    borderRadius: 5,
  },
  bucketBarOverflow: {
    position: "absolute",
    right: 0, top: 0, bottom: 0,
    backgroundColor: colors.danger,
    borderRadius: 5,
  },
  bucketAmounts: { flexDirection: "row", justifyContent: "space-between" },
  bucketAmountLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "500" },

  highlightRow: { flexDirection: "row", gap: 12 },
  highlightCard: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  highlightIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: "center", alignItems: "center",
    marginBottom: 4,
  },
  highlightTitle: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
  highlightCategory: { color: colors.text, fontSize: 14, fontWeight: "700" },
  highlightAmt: { fontSize: 12, fontWeight: "600" },
  highlightEmpty: { color: colors.textMuted, fontSize: 12 },

  billsCard: {
    flexDirection: "row",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    justifyContent: "space-around",
  },
  billsStat: { alignItems: "center", gap: 4 },
  billsStatVal: { color: colors.text, fontSize: 22, fontWeight: "800" },
  billsStatLabel: { color: colors.textMuted, fontSize: 12 },
  billsDivider: { width: 1, backgroundColor: colors.border },

  categoryCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  categoryRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  categoryName: { color: colors.textSecondary, fontSize: 13, fontWeight: "600", width: 90 },
  categoryBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 4,
    overflow: "hidden",
  },
  categoryBarFill: { height: "100%", borderRadius: 4 },
  categoryAmt: { color: colors.text, fontSize: 12, fontWeight: "700", width: 70, textAlign: "right" },

  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginHorizontal: 20,
    marginTop: 4,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
    borderRadius: 16,
    padding: 16,
  },
  tipTitle: { color: colors.warning, fontSize: 12, fontWeight: "700", marginBottom: 4 },
  tipText: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
});
