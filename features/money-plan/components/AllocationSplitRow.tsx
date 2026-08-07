import React from "react";
import { Text, View } from "react-native";
import moneyPlanData from "../data/moneyPlanData.json";
import { MoneyPlanData, BucketConfig } from "../types/moneyPlan.types";
import { styles } from "../styles/moneyPlan.styles";

interface AllocationSplitRowProps {
  plan: MoneyPlanData["plan"];
}

const bucketConfigs = moneyPlanData.buckets as BucketConfig[];

export const AllocationSplitRow: React.FC<AllocationSplitRowProps> = ({ plan }) => {
  return (
    <View style={styles.splitRow}>
      {bucketConfigs.map((b) => (
        <View key={b.key} style={styles.splitPill}>
          <View style={[styles.splitDot, { backgroundColor: b.barColor }]} />
          <Text style={styles.splitText}>
            {plan[b.pctKey]}% {b.label}
          </Text>
        </View>
      ))}
    </View>
  );
};
