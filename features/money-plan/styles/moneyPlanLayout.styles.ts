import { StyleSheet } from "react-native";
import moneyPlanData from "../data/moneyPlanData.json";

export const colors = moneyPlanData.colors;

export const layoutStyles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  headerTitleContainer: { flex: 1 },
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
});
