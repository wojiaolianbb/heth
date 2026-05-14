export type Habit = {
  id: string;
  label: string;
};

export type CheckinState = Record<string, boolean>;

export type CheckinStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): unknown;
};

export const habits: Habit[] = [
  { id: "drink-water", label: "喝够 8 杯水" },
  { id: "sleep-phone-away", label: "睡前放下手机" },
  { id: "walk-outside", label: "户外步行 30 分钟" },
  { id: "breakfast-on-time", label: "按时吃早餐" },
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

export function readCheckinState(storage: CheckinStorage, key: string) {
  return parseCheckinState(storage.getItem(key));
}

export function saveCheckinState(storage: CheckinStorage, key: string, state: CheckinState) {
  storage.setItem(key, serializeCheckinState(state));
}
