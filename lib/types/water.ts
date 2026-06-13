export type WaterLog = {
  id: string;
  date: string;
  time: string;
  amountMl: number;
  createdAt: string;
};

export type DailyWaterSummary = {
  date: string;
  totalMl: number;
  goalMl: number;
  logs: WaterLog[];
};
