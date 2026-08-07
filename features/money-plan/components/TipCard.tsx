import React from "react";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, styles } from "../styles/moneyPlan.styles";

export const TipCard: React.FC = () => {
  return (
    <View style={styles.tipCard}>
      <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color={colors.warning} />
      <Text style={styles.tipText}>
        Every time you log income, your buckets grow. Tap the options icon to change your split.
      </Text>
    </View>
  );
};
