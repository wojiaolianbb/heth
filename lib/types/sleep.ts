export type SleepLog = {
  id: string;
  date: string;
  bedTime: string;
  wakeTime: string;
  durationMinutes: number;
  quality: "good" | "ok" | "poor";
  note?: string;
  createdAt: string;
};
