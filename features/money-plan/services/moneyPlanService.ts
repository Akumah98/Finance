import { api } from "@/lib/api";
import { MoneyPlanData } from "../types/moneyPlan.types";

export const fetchMoneyPlanService = async (): Promise<{ data: MoneyPlanData | null; error: any }> => {
  const response = await api.get<MoneyPlanData>('/money-plan');
  return { data: response.data ?? null, error: response.error };
};

export const updateMoneyPlanService = async (payload: {
  needsPct: number;
  wantsPct: number;
  futurePct: number;
}): Promise<{ error: any }> => {
  const response = await api.put('/money-plan', payload);
  return { error: response.error };
};
