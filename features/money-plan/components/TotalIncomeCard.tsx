import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useCurrency } from "@/context/CurrencyContext";
import { colors, styles } from "../styles/moneyPlan.styles";

interface TotalIncomeCardProps {
  totalIncome?: number;
  noIncome: boolean;
}

export const TotalIncomeCard: React.FC<TotalIncomeCardProps> = ({ totalIncome, noIncome }) => {
  const { formatAmount } = useCurrency();

  return (
    <BlurView intensity={60} tint="dark" style={styles.incomeCard}>
      <LinearGradient
        colors={["rgba(109,40,217,0.35)", "rgba(59,130,246,0.2)"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.incomeCardRow}>
        <View>
          <Text style={styles.incomeLabel}>Total income this month</Text>
          <Text style={styles.incomeAmount}>
            {totalIncome !== undefined ? formatAmount(totalIncome) : "—"}
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
  );
};
