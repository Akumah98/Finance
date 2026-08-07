import React from "react";
import { RefreshControl, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MoneyPlanSkeleton } from "@/components/shimmer/MoneyPlanSkeleton";
import moneyPlanData from "@/features/money-plan/data/moneyPlanData.json";
import { BucketConfig } from "@/features/money-plan/types/moneyPlan.types";
import { useMoneyPlan } from "@/features/money-plan/hooks/useMoneyPlan";
import { colors, styles } from "@/features/money-plan/styles/moneyPlan.styles";
import { MoneyPlanHeader } from "@/features/money-plan/components/MoneyPlanHeader";
import { TotalIncomeCard } from "@/features/money-plan/components/TotalIncomeCard";
import { AllocationSplitRow } from "@/features/money-plan/components/AllocationSplitRow";
import { BucketCard } from "@/features/money-plan/components/BucketCard";
import { TipCard } from "@/features/money-plan/components/TipCard";
import { MoneyPlanSettingsModal } from "@/features/money-plan/components/MoneyPlanSettingsModal";

const bucketConfigs = moneyPlanData.buckets as BucketConfig[];

export default function MoneyPlanScreen() {
  const planState = useMoneyPlan();
  const { data, loading, refreshing, handleRefresh, getProgressPct, getBarColor } = planState;

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
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        >
          <MoneyPlanHeader onOpenSettings={() => planState.setSettingsVisible(true)} />
          <TotalIncomeCard totalIncome={data?.month.totalIncome} noIncome={noIncome} />
          {data && <AllocationSplitRow plan={data.plan} />}

          <View style={styles.section}>
            {data && bucketConfigs.map((cfg) => {
              const bucket = data.month.buckets[cfg.key];
              const isFuture = cfg.key === "future";
              return (
                <BucketCard
                  key={cfg.key}
                  config={cfg}
                  bucket={bucket}
                  noIncome={noIncome}
                  progressPct={getProgressPct(bucket, isFuture)}
                  barColor={getBarColor(bucket, cfg.barColor, isFuture)}
                />
              );
            })}
          </View>
          <TipCard />
        </ScrollView>

        <MoneyPlanSettingsModal
          visible={planState.settingsVisible}
          saving={planState.saving}
          editNeeds={planState.editNeeds}
          editWants={planState.editWants}
          editFuture={planState.editFuture}
          pctTotal={planState.pctTotal}
          pctValid={planState.pctValid}
          onClose={() => planState.setSettingsVisible(false)}
          onSave={planState.handleSaveSettings}
          setEditNeeds={planState.setEditNeeds}
          setEditWants={planState.setEditWants}
          setEditFuture={planState.setEditFuture}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

