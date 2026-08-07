import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useCurrency } from "@/context/CurrencyContext";
import { Bucket, BucketConfig } from "../types/moneyPlan.types";
import { colors, styles } from "../styles/moneyPlan.styles";

interface BucketCardProps {
  config: BucketConfig;
  bucket: Bucket;
  noIncome: boolean;
  progressPct: number;
  barColor: string;
}

export const BucketCard: React.FC<BucketCardProps> = ({
  config,
  bucket,
  noIncome,
  progressPct,
  barColor,
}) => {
  const { formatAmount } = useCurrency();
  const isFuture = config.key === "future";

  const currentAmount = isFuture ? (bucket.saved ?? bucket.spent) : bucket.spent;
  const middleLabel = isFuture ? "Saved" : "Spent";
  const rightLabel = isFuture ? "Remaining" : "Left";

  const getMiddleStyle = () => {
    if (bucket.overspent && !isFuture) return styles.amountValueDanger;
    if (isFuture) return styles.amountValueSuccess;
    return styles.amountValueSecondary;
  };

  const getRightStyle = () => {
    return bucket.left >= 0 ? styles.amountValueSuccess : styles.amountValueDanger;
  };

  const getBarLabelText = () => {
    if (noIncome) return "Log income to see progress";
    if (isFuture) {
      return progressPct >= 100
        ? "Savings target reached!"
        : `${Math.round(progressPct)}% saved toward target`;
    }
    if (bucket.overspent) {
      return `${formatAmount(Math.abs(bucket.left))} over budget`;
    }
    return progressPct >= 85
      ? `${Math.round(progressPct)}% used — getting close`
      : `${Math.round(progressPct)}% used`;
  };

  return (
    <BlurView intensity={50} tint="dark" style={styles.bucketCard}>
      <LinearGradient colors={config.gradientColors} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.bucketHeader}>
        <View style={[styles.bucketIconBg, { backgroundColor: config.barColor + "20" }]}>
          <Ionicons name={config.icon} size={20} color={config.barColor} />
        </View>
        <View style={styles.bucketTitleGroup}>
          <Text style={styles.bucketLabel}>{config.label}</Text>
          <Text style={styles.bucketSubtitle}>{config.subtitle}</Text>
        </View>
        {bucket.overspent && !isFuture && (
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
          <Text style={styles.amountMeta}>{middleLabel}</Text>
          <Text style={getMiddleStyle()}>{formatAmount(currentAmount)}</Text>
        </View>
        <View style={styles.amountDivider} />
        <View style={styles.amountCol}>
          <Text style={styles.amountMeta}>{rightLabel}</Text>
          <Text style={getRightStyle()}>
            {bucket.left >= 0 ? formatAmount(bucket.left) : `-${formatAmount(Math.abs(bucket.left))}`}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${progressPct}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[styles.barLabel, { color: barColor }]}>{getBarLabelText()}</Text>
    </BlurView>
  );
};
