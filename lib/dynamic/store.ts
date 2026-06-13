import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";

export type DynamicTopic = {
  id: string;
  title: string;
  summary: string;
  slug: string;
  intro: string;
  suggestions: string[];
  cautions: string[];
};

export type DynamicHabit = {
  id: string;
  label: string;
  active: boolean;
};

export type DynamicSettings = {
  siteName: string;
  disclaimer: string;
  privacyPrinciples: string[];
};

export type DynamicCheckins = Record<string, Record<string, boolean>>;

export type DynamicDataSnapshot = {
  version: 1;
  settings: DynamicSettings;
  topics: DynamicTopic[];
  habits: DynamicHabit[];
  checkins: DynamicCheckins;
};

export type DynamicCheckinDay = {
  dateKey: string;
  completedCount: number;
  completionRate: number;
  isComplete: boolean;
};

export type DynamicCheckinHistory = {
  days: DynamicCheckinDay[];
  completedDays: number;
  currentStreak: number;
  averageCompletionRate: number;
};

type FileDataStoreOptions = {
  filePath?: string;
  seedPath?: string;
};

const defaultSeedPath = join(process.cwd(), "data", "seed-store.json");
const defaultStorePath = join(process.cwd(), ".data", "health-store.json");
const idPattern = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
const dateKeyPattern = /^checkin-\d{4}-\d{2}-\d{2}$/;
export const requiredHealthDisclaimer =
  "本网站内容仅供一般健康信息参考，不构成医疗建议、诊断或治疗方案。如有健康问题，请咨询专业医生。";

export const forbiddenDynamicContentPattern =
  /医疗诊断|治疗方案|药物名称|药物|剂量建议|适合.{0,12}疾病|适合.{0,12}病|症状描述|病史|诊断信息|个人敏感信息/;

export function createFileDataStore(options: FileDataStoreOptions = {}) {
  const filePath = options.filePath ?? defaultStorePath;
  const seedPath = options.seedPath ?? defaultSeedPath;

  function read(): DynamicDataSnapshot {
    ensureStoreFile(filePath, seedPath);
    return validateSnapshot(JSON.parse(readFileSync(filePath, "utf8")));
  }

  function write(snapshot: DynamicDataSnapshot) {
    const validated = validateSnapshot(snapshot);
    mkdirSync(dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
    renameSync(temporaryPath, filePath);
  }

  return {
    exportData() {
      return read();
    },
    importData(snapshot: DynamicDataSnapshot) {
      write(snapshot);
      return read();
    },
    getSettings() {
      return read().settings;
    },
    updateSettings(settings: DynamicSettings) {
      const validatedSettings = validateSettings(settings);
      const snapshot = read();
      write({
        ...snapshot,
        settings: validatedSettings
      });
      return validatedSettings;
    },
    listTopics() {
      return read().topics;
    },
    getTopic(slug: string) {
      return read().topics.find((topic) => topic.slug === slug) ?? null;
    },
    upsertTopic(topic: DynamicTopic) {
      const validatedTopic = validateTopic(topic);
      const snapshot = read();
      const nextTopics = [
        ...snapshot.topics.filter((item) => item.id !== validatedTopic.id),
        validatedTopic
      ];
      write({
        ...snapshot,
        topics: nextTopics
      });
      return validatedTopic;
    },
    listHabits() {
      return read().habits.filter((habit) => habit.active);
    },
    upsertHabit(habit: DynamicHabit) {
      const validatedHabit = validateHabit(habit);
      const snapshot = read();
      const nextHabits = [
        ...snapshot.habits.filter((item) => item.id !== validatedHabit.id),
        validatedHabit
      ];
      write({
        ...snapshot,
        habits: nextHabits
      });
      return validatedHabit;
    },
    getCheckin(dateKey: string) {
      assertDateKey(dateKey);
      return normalizeCheckinState(read(), read().checkins[dateKey] ?? {});
    },
    saveCheckin(dateKey: string, state: Record<string, unknown>) {
      assertDateKey(dateKey);
      const snapshot = read();
      const nextState = normalizeCheckinState(snapshot, state);
      write({
        ...snapshot,
        checkins: {
          ...snapshot.checkins,
          [dateKey]: nextState
        }
      });
      return nextState;
    },
    getCheckinHistory(endDate: Date, dayCount: 7 | 30): DynamicCheckinHistory {
      return summarizeCheckins(read(), endDate, dayCount);
    }
  };
}

function ensureStoreFile(filePath: string, seedPath: string) {
  if (existsSync(filePath)) {
    return;
  }

  mkdirSync(dirname(filePath), { recursive: true });

  // 创建空的数据结构，不自动导入种子数据
  const emptySnapshot: DynamicDataSnapshot = {
    version: 1,
    settings: {
      siteName: "健康记录",
      disclaimer: requiredHealthDisclaimer,
      privacyPrinciples: [
        "本项目不使用付费服务、付费数据库、付费 API 或付费云存储。",
        "动态数据保存在本地或自托管数据层中。",
        "记录只保存必要的健康数据。"
      ]
    },
    topics: [],
    habits: [],
    checkins: {}
  };

  writeFileSync(filePath, `${JSON.stringify(emptySnapshot, null, 2)}\n`, "utf8");
}

function validateSnapshot(value: unknown): DynamicDataSnapshot {
  if (!isRecord(value)) {
    throw new Error("Dynamic data snapshot must be an object.");
  }

  const snapshot = value as DynamicDataSnapshot;
  if (snapshot.version !== 1) {
    throw new Error("Unsupported dynamic data version.");
  }

  if (!isRecord(snapshot.settings)) {
    throw new Error("Dynamic settings are required.");
  }

  return {
    version: 1,
    settings: validateSettings(snapshot.settings as DynamicSettings),
    topics: requireArray(snapshot.topics, "topics").map(validateTopic),
    habits: requireArray(snapshot.habits, "habits").map(validateHabit),
    checkins: validateCheckins(snapshot.checkins)
  };
}

function validateSettings(settings: DynamicSettings): DynamicSettings {
  const disclaimer = requireString(settings.disclaimer, "disclaimer");
  if (disclaimer !== requiredHealthDisclaimer) {
    throw new Error("Disclaimer must match the required compliance copy exactly.");
  }

  return {
    siteName: requireString(settings.siteName, "siteName"),
    disclaimer,
    privacyPrinciples: requireStringArray(
      settings.privacyPrinciples,
      "privacyPrinciples"
    )
  };
}

function validateTopic(topic: DynamicTopic): DynamicTopic {
  const validated = {
    id: requireId(topic.id, "topic.id"),
    title: requireSafeText(topic.title, "topic.title"),
    summary: requireSafeText(topic.summary, "topic.summary"),
    slug: requireId(topic.slug, "topic.slug"),
    intro: requireSafeText(topic.intro, "topic.intro"),
    suggestions: requireStringArray(topic.suggestions, "topic.suggestions").map((value) =>
      requireSafeText(value, "topic.suggestion")
    ),
    cautions: requireStringArray(topic.cautions, "topic.cautions").map((value) =>
      requireSafeText(value, "topic.caution")
    )
  };

  return validated;
}

function validateHabit(habit: DynamicHabit): DynamicHabit {
  return {
    id: requireId(habit.id, "habit.id"),
    label: requireSafeText(habit.label, "habit.label"),
    active: habit.active === true
  };
}

function validateCheckins(value: unknown): DynamicCheckins {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([dateKey, state]) => {
      assertDateKey(dateKey);
      return [dateKey, state];
    })
  ) as DynamicCheckins;
}

function normalizeCheckinState(
  snapshot: DynamicDataSnapshot,
  state: Record<string, unknown>
): Record<string, boolean> {
  return Object.fromEntries(
    snapshot.habits
      .filter((habit) => habit.active)
      .map((habit) => [habit.id, state[habit.id] === true])
  );
}

function summarizeCheckins(
  snapshot: DynamicDataSnapshot,
  endDate: Date,
  dayCount: 7 | 30
): DynamicCheckinHistory {
  const habits = snapshot.habits.filter((habit) => habit.active);
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
    const dateKey = buildDateKey(date);
    const state = normalizeCheckinState(snapshot, snapshot.checkins[dateKey] ?? {});
    const completedCount = habits.filter((habit) => state[habit.id] === true).length;
    const completionRate =
      habits.length === 0 ? 0 : roundToTwo(completedCount / habits.length);

    return {
      dateKey,
      completedCount,
      completionRate,
      isComplete: habits.length > 0 && completedCount === habits.length
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

function buildDateKey(date: Date) {
  return `checkin-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

function requireId(value: unknown, field: string) {
  const text = requireString(value, field);
  if (!idPattern.test(text)) {
    throw new Error(`${field} must be a lowercase slug-like id.`);
  }

  return text;
}

function requireSafeText(value: unknown, field: string) {
  const text = requireString(value, field);
  if (forbiddenDynamicContentPattern.test(text)) {
    throw new Error(`${field} contains forbidden health or sensitive content.`);
  }

  return text;
}

function requireString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }

  return value.trim();
}

function requireStringArray(value: unknown, field: string) {
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array.`);
  }

  return value.map((item) => requireString(item, field));
}

function requireArray(value: unknown, field: string) {
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array.`);
  }

  return value;
}

function assertDateKey(dateKey: string) {
  if (!dateKeyPattern.test(dateKey)) {
    throw new Error("Check-in date key must match checkin-YYYY-MM-DD.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
