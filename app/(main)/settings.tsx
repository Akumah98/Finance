import { colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import React from "react";
import { Alert, Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const SettingItem = ({ icon, label, value, type = 'arrow', link }: { icon: any, label: string, value?: string, type?: 'arrow' | 'switch' | 'none', link?: string }) => {
  const router = useRouter();
  const Content = (
    <View style={styles.settingItem}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={20} color={colors.text} />
      </View>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {type === 'arrow' && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
        {type === 'switch' && <Switch trackColor={{ false: "#767577", true: colors.primary }} thumbColor={"white"} value={true} />}
      </View>
    </View>
  );

  if (link) {
    return <Link href={link as any} asChild><TouchableOpacity>{Content}</TouchableOpacity></Link>;
  }
  return <TouchableOpacity>{Content}</TouchableOpacity>;
};

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const { currency, setCurrencyCode, availableCurrencies } = useCurrency();
  const [currencyModalVisible, setCurrencyModalVisible] = React.useState(false);

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Log Out",
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to log out');
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={[colors.bg, '#0F172A']} style={StyleSheet.absoluteFill} />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Profile Card */}
          <TouchableOpacity onPress={() => router.push('/(main)/profile')}>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.userName?.[0]?.toUpperCase() || "U"}</Text>
              </View>
              <View>
                <Text style={styles.userName}>{user?.userName || "User Name"}</Text>
                <Text style={styles.userEmail}>{user?.email || "user@example.com"}</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>

            <TouchableOpacity onPress={() => setCurrencyModalVisible(true)}>
              <View style={styles.settingItem}>
                <View style={styles.settingIcon}>
                  <Ionicons name="wallet-outline" size={20} color={colors.text} />
                </View>
                <Text style={styles.settingLabel}>Currency</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.settingValue}>{currency.code} ({currency.symbol})</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </View>
            </TouchableOpacity>

            <SettingItem icon="language-outline" label="Language" value="English" />
            <SettingItem icon="moon-outline" label="Dark Mode" type="switch" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customization</Text>
            <SettingItem icon="grid-outline" label="Manage Categories" link="/(main)/manage-categories" />
            <SettingItem icon="color-palette-outline" label="App Theme" value="Glitch Purple" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>
            <SettingItem icon="finger-print-outline" label="Biometric Unlock" type="switch" />
            <SettingItem icon="key-outline" label="Change Password" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data</Text>
            <SettingItem icon="download-outline" label="Export Data (CSV/PDF)" />
            <SettingItem icon="cloud-upload-outline" label="Backup & Sync" value="On" />
          </View>


          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <Text style={styles.version}>Version 1.0.0 (Build 2025)</Text>

        </ScrollView>

        {/* Currency Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={currencyModalVisible}
          onRequestClose={() => setCurrencyModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Currency</Text>
                <TouchableOpacity onPress={() => setCurrencyModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {availableCurrencies.map((c) => (
                <TouchableOpacity
                  key={c.code}
                  style={[styles.currencyOption, currency.code === c.code && styles.selectedCurrency]}
                  onPress={() => {
                    setCurrencyCode(c.code);
                    setCurrencyModalVisible(false);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 24 }}>{c.symbol}</Text>
                    <View>
                      <Text style={styles.currencyName}>{c.name}</Text>
                      <Text style={styles.currencyCode}>{c.code}</Text>
                    </View>
                  </View>
                  {currency.code === c.code && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: 20, paddingBottom: 10 },
  headerTitle: { color: colors.text, fontSize: 32, fontWeight: '800' },
  content: { padding: 20, paddingBottom: 40 },

  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.glass, padding: 20, borderRadius: 24, marginBottom: 32, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  userName: { color: colors.text, fontSize: 18, fontWeight: '700' },
  userEmail: { color: colors.textMuted, fontSize: 14 },
  editBtn: { marginLeft: 'auto', width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },

  section: { marginBottom: 28 },
  sectionTitle: { color: colors.textSecondary, marginBottom: 12, fontWeight: '600', marginLeft: 4 },

  settingItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.glass, padding: 16, marginBottom: 1, borderRadius: 0 },
  settingIcon: { width: 32, alignItems: 'center', marginRight: 12 },
  settingLabel: { flex: 1, color: colors.text, fontSize: 16 },
  settingValue: { color: colors.textMuted, fontSize: 14 },

  logoutBtn: { alignItems: 'center', padding: 16, marginTop: 10 },
  logoutText: { color: colors.danger, fontSize: 16, fontWeight: '600' },
  version: { textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: 20 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  currencyOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  selectedCurrency: { backgroundColor: 'rgba(139, 92, 246, 0.1)', marginHorizontal: -20, paddingHorizontal: 20 },
  currencyName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  currencyCode: { color: colors.textMuted, fontSize: 14 },
});