import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { MoneyPlanSkeleton } from "@/components/shimmer/MoneyPlanSkeleton";
import { useCurrency } from "@/context/CurrencyContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

const colors = {
  bg: "#0F0F1A",
  glass: "rgba(255, 255, 255, 0.08)",
  border: "rgba(120, 120, 255, 0.2)",
  primary: "#6D28D9",
  gradient1: "#8B5CF6",
  gradient2: "#3B82F6",
  success: "#10B981",
  danger: "#EF4444",
  warning: "#F59E0B",
  text: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
};

interface Bucket {
  allocated: number;
  spent: number;
  left: number;
  overspent: boolean;
}

interface MoneyPlanData {
  plan: {
    needsPct: number;
    wantsPct: number;
    futurePct: number;
    needsCategories: string[];
    wantsCategories: string[];
  };
  month: {
    totalIncome: number;
    buckets: {
      needs: Bucket;
      wants: Bucket;
      future: Bucket;
    };
  };
}

const BUCKET_CONFIG = [
  {
    key: "needs" as const,
    label: "Needs",
    subtitle: "Rent, food, transport, utilities",
    icon: "home" as const,
    gradientColors: ["#3B82F620", "#2563EB20"] as [string, string],
    barColor: "#3B82F6",
    pctKey: "needsPct" as const,
  },
  {
    key: "wants" as const,
    label: "Wants",
    subtitle: "Dining, entertainment, shopping",
    icon: "sparkles" as const,
    gradientColors: ["#8B5CF620", "#6D28D920"] as [string, string],
    barColor: "#8B5CF6",
    pctKey: "wantsPct" as const,
  },
  {
    key: "future" as const,
    label: "Future",
    subtitle: "Savings, investments, debt",
    icon: "trending-up" as const,
    gradientColors: ["#10B98120", "#059B6820"] as [string, string],
    barColor: "#10B981",
    pctKey: "futurePct" as const,
  },
];

export default function MoneyPlanScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();

  const [data, setData] = useState<MoneyPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit state for the settings modal
  const [editNeeds, setEditNeeds] = useState("50");
  const [editWants, setEditWants] = useState("30");
  const [editFuture, setEditFuture] = useState("20");

  const userId = user?.id || user?._id;

  const fetchPlan = async () => {
    if (!userId) return;
    try {
      const { data: json, error } = await api.get('/money-plan');
      if (!error && json) {
        setData(json);
        setEditNeeds(String(json.plan.needsPct));
        setEditWants(String(json.plan.wantsPct));
        setEditFuture(String(json.plan.futurePct));
      }
    } catch {
      // silent — show stale data if available
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPlan();
    }, [userId])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPlan();
  };

  const pctTotal = Number(editNeeds) + Number(editWants) + Number(editFuture);
  const pctValid = Math.round(pctTotal) === 100;

  const handleSaveSettings = async () => {
    if (!pctValid) {
      Alert.alert("Invalid split", `Percentages must add up to 100. Currently: ${pctTotal}`);
      return;
    }
    setSaving(true);
    try {
      const { error } = await api.put('/money-plan', {
        needsPct: Number(editNeeds),
        wantsPct: Number(editWants),
        futurePct: Number(editFuture),
      });
      if (!error) {
        setSettingsVisible(false);
        fetchPlan();
      }
    } catch {
      Alert.alert("Error", "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const getProgressPct = (bucket: Bucket) => {
    if (bucket.allocated === 0) return 0;
    return Math.min((bucket.spent / bucket.allocated) * 100, 100);
  };

  const getBarColor = (bucket: Bucket, baseColor: string) => {
    if (bucket.overspent) return colors.danger;
    const pct = getProgressPct(bucket);
    if (pct >= 85) return colors.warning;
    return baseColor;
  };

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <LinearGradient colors={["#1E1B4B", "#0F0F1A", "#0F172A"]} style={StyleSheet.absoluteFill} />
          <MoneyPlanSkeleton />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const noIncome = !data || data.month.totalIncome === 0;

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
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Money Plan</Text>
              <Text style={styles.headerSub}>This month's allocation</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => setSettingsVisible(true)}
            >
              <Ionicons name="options-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Total Income Card */}
          <BlurView intensity={60} tint="dark" style={styles.incomeCard}>
            <LinearGradient
              colors={["rgba(109,40,217,0.35)", "rgba(59,130,246,0.2)"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.incomeCardRow}>
              <View>
                <Text style={styles.incomeLabel}>Total income this month</Text>
                <Text style={styles.incomeAmount}>
                  {data ? formatAmount(data.month.totalIncome) : "—"}
                </Text>
              </View>
              <View style={styles.incomeIconBg}>
                <Ionicons name="wallet" size={28} color={colors.gradient1} />
              </View>
            </View>
            {noIncome && (
              <View style={styles.noIncomeHint}>
                <Ionicons name="information-circle" size={16} color={colors.warning} />
                <Text style={styles.noIncomeText}>
                  Log income transactions and your buckets will update automatically.
                </Text>
              </View>
            )}
          </BlurView>

          {/* Allocation split pill */}
          {data && (
            <View style={styles.splitRow}>
              {BUCKET_CONFIG.map((b, i) => (
                <View key={b.key} style={styles.splitPill}>
                  <View style={[styles.splitDot, { backgroundColor: b.barColor }]} />
                  <Text style={styles.splitText}>
                    {data.plan[b.pctKey]}% {b.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Bucket Cards */}
          <View style={styles.section}>
            {data &&
              BUCKET_CONFIG.map((cfg) => {
                const bucket = data.month.buckets[cfg.key];
                const progressPct = getProgressPct(bucket);
                const barColor = getBarColor(bucket, cfg.barColor);

                return (
                  <BlurView key={cfg.key} intensity={50} tint="dark" style={styles.bucketCard}>
                    <LinearGradient
                      colors={cfg.gradientColors}
                      style={StyleSheet.absoluteFill}
                    />
                    {/* Card header */}
                    <View style={styles.bucketHeader}>
                      <View style={[styles.bucketIconBg, { backgroundColor: cfg.barColor + "20" }]}>
                        <Ionicons name={cfg.icon} size={20} color={cfg.barColor} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.bucketLabel}>{cfg.label}</Text>
                        <Text style={styles.bucketSubtitle}>{cfg.subtitle}</Text>
                      </View>
                      {bucket.overspent && (
                        <View style={styles.overspentBadge}>
                          <Text style={styles.overspentText}>Over</Text>
                        </View>
                      )}
                    </View>

                    {/* Amounts row */}
                    <View style={styles.amountsRow}>
                      <View style={styles.amountCol}>
                        <Text style={styles.amountMeta}>Allocated</Text>
                        <Text style={styles.amountValue}>{formatAmount(bucket.allocated)}</Text>
                      </View>
                      <View style={styles.amountDivider} />
                      <View style={styles.amountCol}>
                        <Text style={styles.amountMeta}>Spent</Text>
                        <Text style={[styles.amountValue, { color: bucket.overspent ? colors.danger : colors.textSecondary }]}>
                          {formatAmount(bucket.spent)}
                        </Text>
                      </View>
                      <View style={styles.amountDivider} />
                      <View style={styles.amountCol}>
                        <Text style={styles.amountMeta}>Left</Text>
                        <Text style={[styles.amountValue, { color: bucket.left >= 0 ? colors.success : colors.danger }]}>
                          {bucket.left >= 0 ? formatAmount(bucket.left) : `-${formatAmount(Math.abs(bucket.left))}`}
                        </Text>
                      </View>
                    </View>

                    {/* Progress bar */}
                    <View style={styles.barBg}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${progressPct}%`,
                            backgroundColor: barColor,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, { color: barColor }]}>
                      {noIncome
                        ? "Log income to see progress"
                        : bucket.overspent
                        ? `${formatAmount(Math.abs(bucket.left))} over budget`
                        : progressPct >= 85
                        ? `${Math.round(progressPct)}% used — getting close`
                        : `${Math.round(progressPct)}% used`}
                    </Text>
                  </BlurView>
                );
              })}
          </View>

          {/* How it works tip */}
          <View style={styles.tipCard}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color={colors.warning} />
            <Text style={styles.tipText}>
              Every time you log income, your buckets grow. Tap the options icon to change your split.
            </Text>
          </View>
        </ScrollView>

        {/* Settings Modal */}
        <Modal
          visible={settingsVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setSettingsVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={20} style={StyleSheet.absoluteFill} />
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Adjust Your Split</Text>
              <Text style={styles.modalSub}>Percentages must add up to 100</Text>

              {[
                { label: "Needs %", value: editNeeds, onChange: setEditNeeds, color: "#3B82F6" },
                { label: "Wants %", value: editWants, onChange: setEditWants, color: "#8B5CF6" },
                { label: "Future %", value: editFuture, onChange: setEditFuture, color: "#10B981" },
              ].map((field) => (
                <View key={field.label} style={styles.fieldRow}>
                  <View style={[styles.fieldDot, { backgroundColor: field.color }]} />
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={field.value}
                    onChangeText={field.onChange}
                    keyboardType="numeric"
                    maxLength={3}
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={styles.fieldSuffix}>%</Text>
                </View>
              ))}

              <Text
                style={[
                  styles.totalLine,
                  { color: pctValid ? colors.success : colors.danger },
                ]}
              >
                Total: {pctTotal}% {pctValid ? "✓" : `(need ${100 - pctTotal > 0 ? "+" : ""}${100 - pctTotal} more)`}
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setSettingsVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.saveBtn, !pctValid && { opacity: 0.4 }]}
                  onPress={handleSaveSettings}
                  disabled={!pctValid || saving}
                >
                  {saving ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save</Text>
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
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.glass,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: colors.text, fontSize: 22, fontWeight: "800" },
  headerSub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.glass,
    justifyContent: "center",
    alignItems: "center",
  },

  incomeCard: {
    margin: 20,
    marginBottom: 8,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
  },
  incomeCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  incomeLabel: { color: colors.textMuted, fontSize: 13, fontWeight: "500" },
  incomeAmount: { color: colors.text, fontSize: 36, fontWeight: "900", marginTop: 4 },
  incomeIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(139,92,246,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  noIncomeHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    backgroundColor: "rgba(245,158,11,0.1)",
    padding: 10,
    borderRadius: 12,
  },
  noIncomeText: { color: colors.warning, fontSize: 12, flex: 1, lineHeight: 18 },

  splitRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  splitPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.glass,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  splitDot: { width: 8, height: 8, borderRadius: 4 },
  splitText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },

  section: { paddingHorizontal: 20, gap: 16 },

  bucketCard: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  bucketHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  bucketIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  bucketLabel: { color: colors.text, fontSize: 16, fontWeight: "700" },
  bucketSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  overspentBadge: {
    backgroundColor: colors.danger + "20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.danger + "50",
  },
  overspentText: { color: colors.danger, fontSize: 11, fontWeight: "700" },

  amountsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  amountCol: { flex: 1, alignItems: "center" },
  amountMeta: { color: colors.textMuted, fontSize: 11, fontWeight: "500", marginBottom: 4 },
  amountValue: { color: colors.text, fontSize: 15, fontWeight: "700" },
  amountDivider: { width: 1, backgroundColor: colors.border, alignSelf: "stretch" },

  barBg: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  barFill: { height: "100%", borderRadius: 4 },
  barLabel: { fontSize: 11, fontWeight: "600" },

  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
    borderRadius: 16,
    padding: 14,
  },
  tipText: { color: colors.textSecondary, fontSize: 13, flex: 1, lineHeight: 20 },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#1E1B4B",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: "800", marginBottom: 4 },
  modalSub: { color: colors.textMuted, fontSize: 13, marginBottom: 24 },

  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  fieldDot: { width: 10, height: 10, borderRadius: 5 },
  fieldLabel: { color: colors.textSecondary, fontSize: 15, fontWeight: "600", flex: 1 },
  fieldInput: {
    width: 64,
    backgroundColor: colors.glass,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 10,
  },
  fieldSuffix: { color: colors.textMuted, fontSize: 16, fontWeight: "600" },

  totalLine: { fontSize: 14, fontWeight: "700", textAlign: "center", marginBottom: 24 },

  modalButtons: { flexDirection: "row", gap: 12 },
  modalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtn: { backgroundColor: colors.glass },
  saveBtn: { backgroundColor: colors.primary },
  cancelBtnText: { color: colors.text, fontWeight: "600", fontSize: 15 },
  saveBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
});
