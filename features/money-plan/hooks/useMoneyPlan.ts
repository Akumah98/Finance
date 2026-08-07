import { useAuth } from "@/context/AuthContext";
import { localCache } from "@/lib/localCache";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { fetchMoneyPlanService, updateMoneyPlanService } from "../services/moneyPlanService";
import { Bucket, MoneyPlanData } from "../types/moneyPlan.types";
import { colors } from "../styles/moneyPlan.styles";

export function useMoneyPlan() {
  const { user } = useAuth();
  const userId = user?.id || user?._id;
  const cacheKey = `moneyplan_${userId}`;

  const [data, setData] = useState<MoneyPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editNeeds, setEditNeeds] = useState("50");
  const [editWants, setEditWants] = useState("30");
  const [editFuture, setEditFuture] = useState("20");

  const syncPlan = (planData: MoneyPlanData) => {
    setData(planData);
    setEditNeeds(String(planData.plan.needsPct));
    setEditWants(String(planData.plan.wantsPct));
    setEditFuture(String(planData.plan.futurePct));
  };

  const fetchPlan = async () => {
    if (!userId) return;
    try {
      const cached = await localCache.get<MoneyPlanData>(cacheKey);
      if (cached) {
        syncPlan(cached);
        setLoading(false);
      }
      const { data: remoteData, error } = await fetchMoneyPlanService();
      if (!error && remoteData) {
        syncPlan(remoteData);
        await localCache.set(cacheKey, remoteData);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchPlan(); }, [userId]));

  const pctTotal = Number(editNeeds) + Number(editWants) + Number(editFuture);
  const pctValid = Math.round(pctTotal) === 100;

  const handleSaveSettings = async () => {
    if (!pctValid) return Alert.alert("Invalid split", `Percentages must add up to 100. Currently: ${pctTotal}`);
    setSaving(true);
    try {
      const { error } = await updateMoneyPlanService({
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

  const getProgressPct = (bucket: Bucket, isFuture: boolean = false) => {
    if (bucket.allocated === 0) return 0;
    const currentVal = isFuture ? (bucket.saved ?? bucket.spent) : bucket.spent;
    return Math.min((currentVal / bucket.allocated) * 100, 100);
  };

  const getBarColor = (bucket: Bucket, baseColor: string, isFuture: boolean = false) => {
    if (!isFuture && bucket.overspent) return colors.danger;
    const pct = getProgressPct(bucket, isFuture);
    return (!isFuture && pct >= 85) ? colors.warning : baseColor;
  };

  return {
    data, loading, refreshing, settingsVisible, saving,
    editNeeds, editWants, editFuture, pctTotal, pctValid,
    setEditNeeds, setEditWants, setEditFuture, setSettingsVisible,
    handleRefresh: () => { setRefreshing(true); fetchPlan(); },
    handleSaveSettings, getProgressPct, getBarColor,
  };
}

