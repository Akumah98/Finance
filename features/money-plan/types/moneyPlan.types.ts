export interface Bucket {
  allocated: number;
  spent: number;
  saved?: number;
  left: number;
  overspent: boolean;
}

export interface MoneyPlanData {
  plan: {
    needsPct: number;
    wantsPct: number;
    futurePct: number;
    needsCategories: string[];
    wantsCategories: string[];
  };
  month: {
    totalIncome: number;
    buckets: {
      needs: Bucket;
      wants: Bucket;
      future: Bucket;
    };
  };
}

export interface BucketConfig {
  key: "needs" | "wants" | "future";
  label: string;
  subtitle: string;
  icon: "home" | "sparkles" | "trending-up";
  gradientColors: [string, string];
  barColor: string;
  pctKey: "needsPct" | "wantsPct" | "futurePct";
}
