import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, styles } from "../styles/moneyPlan.styles";

interface MoneyPlanHeaderProps {
  onOpenSettings: () => void;
}

export const MoneyPlanHeader: React.FC<MoneyPlanHeaderProps> = ({ onOpenSettings }) => {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>Money Plan</Text>
        <Text style={styles.headerSub}>This month's allocation</Text>
      </View>
      <TouchableOpacity style={styles.settingsBtn} onPress={onOpenSettings} activeOpacity={0.7}>
        <Ionicons name="options-outline" size={22} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
};
