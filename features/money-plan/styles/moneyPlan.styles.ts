import moneyPlanData from "../data/moneyPlanData.json";
import { layoutStyles } from "./moneyPlanLayout.styles";
import { bucketStyles } from "./moneyPlanBucket.styles";

export const colors = moneyPlanData.colors;

export const styles = {
  ...layoutStyles,
  ...bucketStyles,
};
