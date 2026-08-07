import React from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { colors, styles } from "../styles/moneyPlan.styles";

interface MoneyPlanSettingsModalProps {
  visible: boolean;
  saving: boolean;
  editNeeds: string;
  editWants: string;
  editFuture: string;
  pctTotal: number;
  pctValid: boolean;
  onClose: () => void;
  onSave: () => void;
  setEditNeeds: (val: string) => void;
  setEditWants: (val: string) => void;
  setEditFuture: (val: string) => void;
}

export const MoneyPlanSettingsModal: React.FC<MoneyPlanSettingsModalProps> = ({
  visible,
  saving,
  editNeeds,
  editWants,
  editFuture,
  pctTotal,
  pctValid,
  onClose,
  onSave,
  setEditNeeds,
  setEditWants,
  setEditFuture,
}) => {
  const fields = [
    { label: "Needs %", value: editNeeds, onChange: setEditNeeds, color: "#3B82F6" },
    { label: "Wants %", value: editWants, onChange: setEditWants, color: "#8B5CF6" },
    { label: "Future %", value: editFuture, onChange: setEditFuture, color: "#10B981" },
  ];

  const diff = 100 - pctTotal;
  const diffText = pctValid
    ? "✓"
    : `(need ${diff > 0 ? "+" : ""}${diff} more)`;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Adjust Your Split</Text>
          <Text style={styles.modalSub}>Percentages must add up to 100</Text>

          {fields.map((f) => (
            <View key={f.label} style={styles.fieldRow}>
              <View style={[styles.fieldDot, { backgroundColor: f.color }]} />
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <TextInput
                style={styles.fieldInput}
                value={f.value}
                onChangeText={f.onChange}
                keyboardType="numeric"
                maxLength={3}
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.fieldSuffix}>%</Text>
            </View>
          ))}

          <Text style={pctValid ? styles.totalLineValid : styles.totalLineInvalid}>
            Total: {pctTotal}% {diffText}
          </Text>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.cancelBtn]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalBtn,
                styles.saveBtn,
                (!pctValid || saving) && styles.saveBtnDisabled,
              ]}
              onPress={onSave}
              disabled={!pctValid || saving}
              activeOpacity={0.7}
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
  );
};
