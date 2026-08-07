import { StyleSheet } from "react-native";
import moneyPlanData from "../data/moneyPlanData.json";

const colors = moneyPlanData.colors;

export const bucketStyles = StyleSheet.create({
  section: { paddingHorizontal: 20, gap: 16 },

  bucketCard: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  bucketHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  bucketTitleGroup: { flex: 1, marginLeft: 10 },
  bucketIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  bucketLabel: { color: colors.text, fontSize: 16, fontWeight: "700" },
  bucketSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  overspentBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.5)",
  },
  overspentText: { color: colors.danger, fontSize: 11, fontWeight: "700" },

  amountsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  amountCol: { flex: 1, alignItems: "center" },
  amountMeta: { color: colors.textMuted, fontSize: 11, fontWeight: "500", marginBottom: 4 },
  amountValue: { color: colors.text, fontSize: 15, fontWeight: "700" },
  amountValueSuccess: { color: colors.success, fontSize: 15, fontWeight: "700" },
  amountValueDanger: { color: colors.danger, fontSize: 15, fontWeight: "700" },
  amountValueSecondary: { color: colors.textSecondary, fontSize: 15, fontWeight: "700" },
  amountDivider: { width: 1, backgroundColor: colors.border, alignSelf: "stretch" },

  barBg: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  barFill: { height: "100%", borderRadius: 4 },
  barLabel: { fontSize: 11, fontWeight: "600" },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#1E1B4B",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: "800", marginBottom: 4 },
  modalSub: { color: colors.textMuted, fontSize: 13, marginBottom: 24 },

  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  fieldDot: { width: 10, height: 10, borderRadius: 5 },
  fieldLabel: { color: colors.textSecondary, fontSize: 15, fontWeight: "600", flex: 1 },
  fieldInput: {
    width: 64,
    backgroundColor: colors.glass,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 10,
  },
  fieldSuffix: { color: colors.textMuted, fontSize: 16, fontWeight: "600" },

  totalLineValid: { fontSize: 14, fontWeight: "700", textAlign: "center", marginBottom: 24, color: colors.success },
  totalLineInvalid: { fontSize: 14, fontWeight: "700", textAlign: "center", marginBottom: 24, color: colors.danger },

  modalButtons: { flexDirection: "row", gap: 12 },
  modalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.4 },
  cancelBtn: { backgroundColor: colors.glass },
  saveBtn: { backgroundColor: colors.primary },
  cancelBtnText: { color: colors.text, fontWeight: "600", fontSize: 15 },
  saveBtnText: { color: "white", fontWeight: "700", fontSize: 15 },
});
