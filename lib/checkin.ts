export type Habit = {
  id: string;
  label: string;
};

export type CheckinState = Record<string, boolean>;

export type CheckinDaySummary = {
  dateKey: string;
  completedCount: number;
  completionRate: number;
  isComplete: boolean;
};

export type CheckinHistorySummary = {
  days: CheckinDaySummary[];
  completedDays: number;
  currentStreak: number;
  averageCompletionRate: number;
};

export type CheckinStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): unknown;
};

export type CheckinReader = Pick<CheckinStorage, "getItem">;

export const habits: Habit[] = [
  { id: "drink-water", label: "分时段补充饮水" },
  { id: "sleep-phone-away", label: "睡前放下手机" },
  { id: "walk-outside", label: "安排一次轻量活动" },
  { id: "breakfast-on-time", label: "按自己的节奏规律进餐" },
  { id: "stretch", label: "做一次轻柔拉伸" }
];

export function buildCheckinKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `checkin-${year}-${month}-${day}`;
}

export function createInitialCheckinState(): CheckinState {
  return Object.fromEntries(habits.map((habit) => [habit.id, false]));
}

export function parseCheckinState(value: string | null): CheckinState {
  if (!value) {
    return createInitialCheckinState();
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;

    return Object.fromEntries(
      habits.map((habit) => [habit.id, parsed[habit.id] === true])
    );
  } catch {
    return createInitialCheckinState();
  }
}

export function serializeCheckinState(state: CheckinState) {
  return JSON.stringify(
    Object.fromEntries(habits.map((habit) => [habit.id, state[habit.id] === true]))
  );
}

export function readCheckinState(storage: CheckinReader, key: string) {
  return parseCheckinState(storage.getItem(key));
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

export function readCheckinHistory(
  storage: CheckinReader,
  endDate: Date,
  dayCount: 7 | 30
): CheckinHistorySummary {
  const startDate = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate() - dayCount + 1
  );

  const days = Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() + index
    );
    const dateKey = buildCheckinKey(date);
    const state = readCheckinState(storage, dateKey);
    const completedCount = habits.filter((habit) => state[habit.id] === true).length;
    const completionRate = roundToTwo(completedCount / habits.length);

    return {
      dateKey,
      completedCount,
      completionRate,
      isComplete: completedCount === habits.length
    };
  });

  const completedDays = days.filter((day) => day.isComplete).length;
  const averageCompletionRate = roundToTwo(
    days.reduce((total, day) => total + day.completionRate, 0) / days.length
  );

  let currentStreak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (!days[index].isComplete) {
      break;
    }

    currentStreak += 1;
  }

  return {
    days,
    completedDays,
    currentStreak,
    averageCompletionRate
  };
}

export function saveCheckinState(storage: CheckinStorage, key: string, state: CheckinState) {
  storage.setItem(key, serializeCheckinState(state));
}
