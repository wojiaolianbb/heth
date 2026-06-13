# Health Data Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the private Health OS data foundation: shared types, date utilities, validation, file-backed private health snapshot storage, import/export safety, and tests.

**Architecture:** Add a new `lib/health/` module without changing existing dynamic content behavior. The new module stores private health records separately from the legacy topic/checkin store and is designed for later hydration, meals, body, sleep, exercise, review, and AI nutrition features. Tests use Node's built-in test runner, temporary files, and local-only snapshots.

**Tech Stack:** TypeScript, Node `fs`, Node `path`, Node `test`, Next.js-compatible server utilities, existing `npm test` script.

---

## Required Quality Gate

This feature passes only when it scores 81 or higher.

Score distribution:

- Product fit: 15 points. Award full points only if all entities from the product spec are represented, including DataExport.
- Data correctness and validation: 15 points. Award full points only if every persisted entity has explicit validation and invalid enum, date, time, confidence, source, and numeric values are rejected.
- Mobile daily loop readiness: 15 points. Award full points only if the data foundation exposes stable date-keyed records for today views and does not require PC-only workflows to create records later.
- PC review or management readiness: 15 points. Award full points only if export, import, and historical review data can be represented without API keys or private tokens.
- Test coverage and verification: 15 points. Award full points only if tests cover default snapshot, all required collections, invalid values, persistence, export redaction, invalid imports, and corrupt local files.
- Privacy, API key, and local-first safety: 10 points. Award full points only if API keys are never exported and default storage remains local.
- Maintainability and file boundaries: 10 points. Award full points only if types, date helpers, validation, and file store remain separated.
- Health and AI safety boundaries: 5 points. Award full points only if AI fields store estimates, confidence, assumptions, and user questions without diagnosis or medication advice fields.

Automatic failure:

- API keys or tokens can be exported.
- Photos or health data are written to git-tracked defaults.
- Invalid health records are silently accepted.
- Invalid enum, date, time, confidence, source, or numeric values are coerced instead of rejected.
- Tests do not cover import/export safety.
- Types do not include all entities from the product spec.

## Files

- Create: `lib/health/types.ts`
- Create: `lib/health/date.ts`
- Create: `lib/health/validation.ts`
- Create: `lib/health/store.ts`
- Create: `tests/health-store.test.ts`
- Do not modify app UI files in this feature.
- Do not modify legacy `lib/dynamic/store.ts` unless a test proves compatibility is required.

## Task 1: Write Failing Foundation Tests

**Files:**

- Create: `tests/health-store.test.ts`

- [ ] **Step 1: Create the test file**

Create `tests/health-store.test.ts` with this content:

```ts
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildDateKey, isDateKey } from "../lib/health/date.ts";
import {
  createDefaultHealthSnapshot,
  createHealthFileStore
} from "../lib/health/store.ts";
import { validateHealthSnapshot } from "../lib/health/validation.ts";

function createTempStorePath() {
  return join(mkdtempSync(join(tmpdir(), "heth-health-")), "health.json");
}

test("health date utilities use stable YYYY-MM-DD keys", () => {
  assert.equal(buildDateKey(new Date(2026, 5, 9)), "2026-06-09");
  assert.equal(isDateKey("2026-06-09"), true);
  assert.equal(isDateKey("checkin-2026-06-09"), false);
  assert.equal(isDateKey("2026-6-9"), false);
});

test("default private health snapshot contains every required collection", () => {
  const snapshot = createDefaultHealthSnapshot();

  assert.equal(snapshot.version, 2);
  assert.equal(snapshot.profile.heightCm, null);
  assert.deepEqual(snapshot.waterLogs, []);
  assert.deepEqual(snapshot.meals, []);
  assert.deepEqual(snapshot.bodyMetrics, []);
  assert.deepEqual(snapshot.sleepLogs, []);
  assert.deepEqual(snapshot.exerciseLogs, []);
  assert.deepEqual(snapshot.weeklyReviews, []);
  assert.deepEqual(snapshot.dataExports, []);
  assert.equal(snapshot.settings.waterTargetMl, 2000);
});

test("health snapshot validation rejects invalid health ranges", () => {
  const snapshot = createDefaultHealthSnapshot();

  assert.throws(() =>
    validateHealthSnapshot({
      ...snapshot,
      waterLogs: [
        {
          id: "water-1",
          date: "2026-06-09",
          time: "09:30",
          amountMl: -1,
          source: "manual",
          createdAt: "2026-06-09T01:30:00.000Z",
          updatedAt: "2026-06-09T01:30:00.000Z"
        }
      ]
    })
  );

  assert.throws(() =>
    validateHealthSnapshot({
      ...snapshot,
      bodyMetrics: [
        {
          id: "body-1",
          date: "2026-06-09",
          weightKg: 900,
          createdAt: "2026-06-09T01:30:00.000Z",
          updatedAt: "2026-06-09T01:30:00.000Z"
        }
      ]
    })
  );
});

test("health snapshot validation rejects invalid dates, times, enums, and confidence", () => {
  const snapshot = createDefaultHealthSnapshot();

  assert.throws(() =>
    validateHealthSnapshot({
      ...snapshot,
      waterLogs: [
        {
          id: "water-1",
          date: "2026-99-99",
          time: "09:30",
          amountMl: 250,
          source: "manual",
          createdAt: "2026-06-09T01:30:00.000Z",
          updatedAt: "2026-06-09T01:30:00.000Z"
        }
      ]
    })
  );

  assert.throws(() =>
    validateHealthSnapshot({
      ...snapshot,
      sleepLogs: [
        {
          id: "sleep-1",
          date: "2026-06-09",
          bedTime: "25:00",
          wakeTime: "07:00",
          durationMinutes: 420,
          quality: "excellent",
          factors: [],
          createdAt: "2026-06-09T01:30:00.000Z",
          updatedAt: "2026-06-09T01:30:00.000Z"
        }
      ]
    })
  );

  assert.throws(() =>
    validateHealthSnapshot({
      ...snapshot,
      meals: [
        {
          id: "meal-1",
          date: "2026-06-09",
          time: "12:00",
          mealType: "brunch",
          photoIds: [],
          foodItems: [
            {
              id: "food-1",
              foodName: "rice",
              estimatedPortion: "one bowl",
              caloriesKcal: 260,
              proteinG: 5,
              carbsG: 56,
              fatG: 1,
              confidence: "certain",
              assumptions: [],
              questionsForUser: [],
              source: "robot"
            }
          ],
          nutrition: null,
          createdAt: "2026-06-09T01:30:00.000Z",
          updatedAt: "2026-06-09T01:30:00.000Z"
        }
      ]
    })
  );
});

test("health file store initializes local file and persists records", () => {
  const filePath = createTempStorePath();
  const store = createHealthFileStore({ filePath });

  assert.equal(existsSync(filePath), false);
  const initial = store.exportData();
  assert.equal(existsSync(filePath), true);
  assert.equal(initial.version, 2);

  store.importData({
    ...initial,
    waterLogs: [
      {
        id: "water-1",
        date: "2026-06-09",
        time: "09:30",
        amountMl: 250,
        source: "manual",
        createdAt: "2026-06-09T01:30:00.000Z",
        updatedAt: "2026-06-09T01:30:00.000Z"
      }
    ]
  });

  const reloaded = createHealthFileStore({ filePath }).exportData();
  assert.equal(reloaded.waterLogs.length, 1);
  assert.equal(reloaded.waterLogs[0].amountMl, 250);
});

test("health export removes AI provider secrets", () => {
  const filePath = createTempStorePath();
  const store = createHealthFileStore({ filePath });
  const snapshot = store.exportData();

  store.importData({
    ...snapshot,
    settings: {
      ...snapshot.settings,
      aiProvider: {
        provider: "openai-compatible",
        baseUrl: "https://example.test/v1",
        model: "vision-model",
        apiKey: "secret-key"
      }
    }
  });

  const exported = store.exportData();
  assert.equal(exported.settings.aiProvider?.apiKey, null);
  assert.equal(readFileSync(filePath, "utf8").includes("secret-key"), true);
});

test("health file store rejects corrupt local JSON with a clear error", () => {
  const filePath = createTempStorePath();
  writeFileSync(filePath, "{bad json", "utf8");

  assert.throws(
    () => createHealthFileStore({ filePath }).exportData(),
    /Private health store must contain valid JSON/
  );
});
```

- [ ] **Step 2: Run test and verify it fails because module does not exist**

Run:

```powershell
node --test --experimental-strip-types tests/health-store.test.ts
```

Expected result:

```text
ERR_MODULE_NOT_FOUND
```

## Task 2: Add Date Utilities

**Files:**

- Create: `lib/health/date.ts`
- Test: `tests/health-store.test.ts`

- [ ] **Step 1: Create `lib/health/date.ts`**

```ts
const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;
const timeKeyPattern = /^\d{2}:\d{2}$/;

export function buildDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !dateKeyPattern.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function assertDateKey(value: unknown, field: string) {
  if (!isDateKey(value)) {
    throw new Error(`${field} must be a YYYY-MM-DD date key.`);
  }

  return value;
}

export function isTimeKey(value: unknown): value is string {
  if (typeof value !== "string" || !timeKeyPattern.test(value)) {
    return false;
  }

  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function assertTimeKey(value: unknown, field: string) {
  if (!isTimeKey(value)) {
    throw new Error(`${field} must be an HH:mm time key.`);
  }

  return value;
}
```

- [ ] **Step 2: Run targeted test**

Run:

```powershell
node --test --experimental-strip-types tests/health-store.test.ts
```

Expected result:

```text
ERR_MODULE_NOT_FOUND
```

The date module now exists, but the store and validation modules are still missing.

## Task 3: Add Shared Health Types

**Files:**

- Create: `lib/health/types.ts`

- [ ] **Step 1: Create `lib/health/types.ts`**

```ts
export type RecordSource = "manual" | "ai" | "user-confirmed";
export type ConfidenceLevel = "low" | "medium" | "high";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type SleepQuality = "good" | "normal" | "poor";
export type ExerciseType =
  | "walking"
  | "running"
  | "cycling"
  | "strength"
  | "stretching"
  | "sports"
  | "other";
export type ExerciseIntensity = "light" | "moderate" | "hard";

export type AuditFields = {
  createdAt: string;
  updatedAt: string;
};

export type UserProfile = {
  heightCm: number | null;
  targetWeightKg: number | null;
};

export type WaterLog = AuditFields & {
  id: string;
  date: string;
  time: string;
  amountMl: number;
  source: RecordSource;
};

export type MealPhoto = AuditFields & {
  id: string;
  mealId: string;
  localPath: string;
  deletedAt: string | null;
};

export type FoodItemEstimate = {
  id: string;
  foodName: string;
  estimatedPortion: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: ConfidenceLevel;
  assumptions: string[];
  questionsForUser: string[];
  source: RecordSource;
};

export type NutritionEstimate = AuditFields & {
  id: string;
  mealId: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: ConfidenceLevel;
  assumptions: string[];
  questionsForUser: string[];
  source: RecordSource;
  rawAiResult: unknown | null;
  confirmedAt: string | null;
};

export type MealLog = AuditFields & {
  id: string;
  date: string;
  time: string;
  mealType: MealType;
  photoIds: string[];
  foodItems: FoodItemEstimate[];
  nutrition: NutritionEstimate | null;
};

export type BodyMetric = AuditFields & {
  id: string;
  date: string;
  weightKg: number;
};

export type SleepLog = AuditFields & {
  id: string;
  date: string;
  bedTime: string;
  wakeTime: string;
  durationMinutes: number;
  quality: SleepQuality;
  factors: string[];
};

export type ExerciseLog = AuditFields & {
  id: string;
  date: string;
  type: ExerciseType;
  durationMinutes: number;
  intensity: ExerciseIntensity;
  steps: number | null;
};

export type DailySummary = {
  date: string;
  waterMl: number;
  mealCount: number;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  sleepMinutes: number | null;
  exerciseMinutes: number;
  latestWeightKg: number | null;
};

export type WeeklyReview = AuditFields & {
  id: string;
  startDate: string;
  endDate: string;
  observations: string[];
  missingData: string[];
};

export type DataExport = AuditFields & {
  id: string;
  exportedAt: string;
  includedPhotos: boolean;
  redactedSecrets: boolean;
  recordCounts: {
    waterLogs: number;
    meals: number;
    mealPhotos: number;
    bodyMetrics: number;
    sleepLogs: number;
    exerciseLogs: number;
    weeklyReviews: number;
  };
};

export type AiProviderSettings = {
  provider: "openai-compatible" | "local";
  baseUrl: string;
  model: string;
  apiKey: string | null;
};

export type AppSettings = {
  waterTargetMl: number;
  photoStorageMode: "keep-originals" | "delete-after-structured-save";
  aiProvider: AiProviderSettings | null;
};

export type PrivateHealthSnapshot = {
  version: 2;
  profile: UserProfile;
  waterLogs: WaterLog[];
  meals: MealLog[];
  mealPhotos: MealPhoto[];
  bodyMetrics: BodyMetric[];
  sleepLogs: SleepLog[];
  exerciseLogs: ExerciseLog[];
  dailySummaries: DailySummary[];
  weeklyReviews: WeeklyReview[];
  dataExports: DataExport[];
  settings: AppSettings;
};
```

## Task 4: Add Validation Helpers

**Files:**

- Create: `lib/health/validation.ts`
- Test: `tests/health-store.test.ts`

- [ ] **Step 1: Create `lib/health/validation.ts`**

Use explicit validation for ranges and entity shape:

```ts
import { assertDateKey, assertTimeKey } from "./date.ts";
import type {
  AppSettings,
  BodyMetric,
  DailySummary,
  DataExport,
  ExerciseLog,
  FoodItemEstimate,
  MealLog,
  MealPhoto,
  NutritionEstimate,
  PrivateHealthSnapshot,
  SleepLog,
  WaterLog,
  WeeklyReview
} from "./types.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }

  return value.trim();
}

function requireNumber(value: unknown, field: string, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${field} must be a number from ${min} to ${max}.`);
  }

  return value;
}

function requireStringArray(value: unknown, field: string) {
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array.`);
  }

  return value.map((item) => requireString(item, field));
}

function requireNullableString(value: unknown, field: string) {
  if (value === null) {
    return null;
  }

  return requireString(value, field);
}

function requireEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]) {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(`${field} must be one of: ${allowed.join(", ")}.`);
  }

  return value as T;
}

function validateAuditFields<T extends Record<string, unknown>>(value: T) {
  return {
    createdAt: requireString(value.createdAt, "createdAt"),
    updatedAt: requireString(value.updatedAt, "updatedAt")
  };
}

export function validateWaterLog(value: unknown): WaterLog {
  if (!isRecord(value)) {
    throw new Error("Water log must be an object.");
  }

  return {
    id: requireString(value.id, "water.id"),
    date: assertDateKey(value.date, "water.date"),
    time: assertTimeKey(value.time, "water.time"),
    amountMl: requireNumber(value.amountMl, "water.amountMl", 1, 5000),
    source: requireEnum(value.source, "water.source", [
      "manual",
      "ai",
      "user-confirmed"
    ]),
    ...validateAuditFields(value)
  };
}

export function validateBodyMetric(value: unknown): BodyMetric {
  if (!isRecord(value)) {
    throw new Error("Body metric must be an object.");
  }

  return {
    id: requireString(value.id, "body.id"),
    date: assertDateKey(value.date, "body.date"),
    weightKg: requireNumber(value.weightKg, "body.weightKg", 20, 400),
    ...validateAuditFields(value)
  };
}

export function validateSleepLog(value: unknown): SleepLog {
  if (!isRecord(value)) {
    throw new Error("Sleep log must be an object.");
  }

  return {
    id: requireString(value.id, "sleep.id"),
    date: assertDateKey(value.date, "sleep.date"),
    bedTime: assertTimeKey(value.bedTime, "sleep.bedTime"),
    wakeTime: assertTimeKey(value.wakeTime, "sleep.wakeTime"),
    durationMinutes: requireNumber(value.durationMinutes, "sleep.durationMinutes", 1, 1440),
    quality: requireEnum(value.quality, "sleep.quality", ["good", "normal", "poor"]),
    factors: requireStringArray(value.factors ?? [], "sleep.factors"),
    ...validateAuditFields(value)
  };
}

export function validateExerciseLog(value: unknown): ExerciseLog {
  if (!isRecord(value)) {
    throw new Error("Exercise log must be an object.");
  }

  return {
    id: requireString(value.id, "exercise.id"),
    date: assertDateKey(value.date, "exercise.date"),
    type: requireEnum(value.type, "exercise.type", [
      "walking",
      "running",
      "cycling",
      "strength",
      "stretching",
      "sports",
      "other"
    ]),
    durationMinutes: requireNumber(value.durationMinutes, "exercise.durationMinutes", 1, 1440),
    intensity: requireEnum(value.intensity, "exercise.intensity", [
      "light",
      "moderate",
      "hard"
    ]),
    steps: value.steps === null || value.steps === undefined ? null : requireNumber(value.steps, "exercise.steps", 0, 100000),
    ...validateAuditFields(value)
  };
}

function validateFoodItemEstimate(value: unknown): FoodItemEstimate {
  if (!isRecord(value)) {
    throw new Error("Food item estimate must be an object.");
  }

  return {
    id: requireString(value.id, "food.id"),
    foodName: requireString(value.foodName, "food.foodName"),
    estimatedPortion: requireString(value.estimatedPortion, "food.estimatedPortion"),
    caloriesKcal: requireNumber(value.caloriesKcal, "food.caloriesKcal", 0, 10000),
    proteinG: requireNumber(value.proteinG, "food.proteinG", 0, 1000),
    carbsG: requireNumber(value.carbsG, "food.carbsG", 0, 1000),
    fatG: requireNumber(value.fatG, "food.fatG", 0, 1000),
    confidence: requireEnum(value.confidence, "food.confidence", ["low", "medium", "high"]),
    assumptions: requireStringArray(value.assumptions, "food.assumptions"),
    questionsForUser: requireStringArray(value.questionsForUser, "food.questionsForUser"),
    source: requireEnum(value.source, "food.source", ["manual", "ai", "user-confirmed"])
  };
}

function validateNutritionEstimate(value: unknown): NutritionEstimate {
  if (value === null) {
    throw new Error("Nutrition estimate must be an object when present.");
  }
  if (!isRecord(value)) {
    throw new Error("Nutrition estimate must be an object.");
  }

  return {
    id: requireString(value.id, "nutrition.id"),
    mealId: requireString(value.mealId, "nutrition.mealId"),
    caloriesKcal: requireNumber(value.caloriesKcal, "nutrition.caloriesKcal", 0, 10000),
    proteinG: requireNumber(value.proteinG, "nutrition.proteinG", 0, 1000),
    carbsG: requireNumber(value.carbsG, "nutrition.carbsG", 0, 1000),
    fatG: requireNumber(value.fatG, "nutrition.fatG", 0, 1000),
    confidence: requireEnum(value.confidence, "nutrition.confidence", ["low", "medium", "high"]),
    assumptions: requireStringArray(value.assumptions, "nutrition.assumptions"),
    questionsForUser: requireStringArray(value.questionsForUser, "nutrition.questionsForUser"),
    source: requireEnum(value.source, "nutrition.source", ["manual", "ai", "user-confirmed"]),
    rawAiResult: value.rawAiResult ?? null,
    confirmedAt: value.confirmedAt === null || value.confirmedAt === undefined ? null : requireString(value.confirmedAt, "nutrition.confirmedAt"),
    ...validateAuditFields(value)
  };
}

function validateMealLog(value: unknown): MealLog {
  if (!isRecord(value)) {
    throw new Error("Meal log must be an object.");
  }

  return {
    id: requireString(value.id, "meal.id"),
    date: assertDateKey(value.date, "meal.date"),
    time: assertTimeKey(value.time, "meal.time"),
    mealType: requireEnum(value.mealType, "meal.mealType", [
      "breakfast",
      "lunch",
      "dinner",
      "snack"
    ]),
    photoIds: requireStringArray(value.photoIds, "meal.photoIds"),
    foodItems: requireArray(value.foodItems, "meal.foodItems").map(validateFoodItemEstimate),
    nutrition:
      value.nutrition === null || value.nutrition === undefined
        ? null
        : validateNutritionEstimate(value.nutrition),
    ...validateAuditFields(value)
  };
}

function validateMealPhoto(value: unknown): MealPhoto {
  if (!isRecord(value)) {
    throw new Error("Meal photo must be an object.");
  }

  return {
    id: requireString(value.id, "mealPhoto.id"),
    mealId: requireString(value.mealId, "mealPhoto.mealId"),
    localPath: requireString(value.localPath, "mealPhoto.localPath"),
    deletedAt: value.deletedAt === null || value.deletedAt === undefined ? null : requireString(value.deletedAt, "mealPhoto.deletedAt"),
    ...validateAuditFields(value)
  };
}

function validateDailySummary(value: unknown): DailySummary {
  if (!isRecord(value)) {
    throw new Error("Daily summary must be an object.");
  }

  return {
    date: assertDateKey(value.date, "daily.date"),
    waterMl: requireNumber(value.waterMl, "daily.waterMl", 0, 10000),
    mealCount: requireNumber(value.mealCount, "daily.mealCount", 0, 20),
    caloriesKcal: requireNumber(value.caloriesKcal, "daily.caloriesKcal", 0, 30000),
    proteinG: requireNumber(value.proteinG, "daily.proteinG", 0, 2000),
    carbsG: requireNumber(value.carbsG, "daily.carbsG", 0, 2000),
    fatG: requireNumber(value.fatG, "daily.fatG", 0, 2000),
    sleepMinutes: value.sleepMinutes === null || value.sleepMinutes === undefined ? null : requireNumber(value.sleepMinutes, "daily.sleepMinutes", 0, 1440),
    exerciseMinutes: requireNumber(value.exerciseMinutes, "daily.exerciseMinutes", 0, 1440),
    latestWeightKg: value.latestWeightKg === null || value.latestWeightKg === undefined ? null : requireNumber(value.latestWeightKg, "daily.latestWeightKg", 20, 400)
  };
}

function validateWeeklyReview(value: unknown): WeeklyReview {
  if (!isRecord(value)) {
    throw new Error("Weekly review must be an object.");
  }

  return {
    id: requireString(value.id, "weekly.id"),
    startDate: assertDateKey(value.startDate, "weekly.startDate"),
    endDate: assertDateKey(value.endDate, "weekly.endDate"),
    observations: requireStringArray(value.observations, "weekly.observations"),
    missingData: requireStringArray(value.missingData, "weekly.missingData"),
    ...validateAuditFields(value)
  };
}

function validateDataExport(value: unknown): DataExport {
  if (!isRecord(value)) {
    throw new Error("Data export must be an object.");
  }
  if (!isRecord(value.recordCounts)) {
    throw new Error("Data export recordCounts must be an object.");
  }

  return {
    id: requireString(value.id, "export.id"),
    exportedAt: requireString(value.exportedAt, "export.exportedAt"),
    includedPhotos: value.includedPhotos === true,
    redactedSecrets: value.redactedSecrets === true,
    recordCounts: {
      waterLogs: requireNumber(value.recordCounts.waterLogs, "export.recordCounts.waterLogs", 0, 1000000),
      meals: requireNumber(value.recordCounts.meals, "export.recordCounts.meals", 0, 1000000),
      mealPhotos: requireNumber(value.recordCounts.mealPhotos, "export.recordCounts.mealPhotos", 0, 1000000),
      bodyMetrics: requireNumber(value.recordCounts.bodyMetrics, "export.recordCounts.bodyMetrics", 0, 1000000),
      sleepLogs: requireNumber(value.recordCounts.sleepLogs, "export.recordCounts.sleepLogs", 0, 1000000),
      exerciseLogs: requireNumber(value.recordCounts.exerciseLogs, "export.recordCounts.exerciseLogs", 0, 1000000),
      weeklyReviews: requireNumber(value.recordCounts.weeklyReviews, "export.recordCounts.weeklyReviews", 0, 1000000)
    },
    ...validateAuditFields(value)
  };
}

function validateSettings(value: unknown): AppSettings {
  if (!isRecord(value)) {
    throw new Error("Settings must be an object.");
  }

  const aiProvider = isRecord(value.aiProvider)
    ? {
        provider: requireEnum(value.aiProvider.provider, "settings.aiProvider.provider", [
          "openai-compatible",
          "local"
        ]),
        baseUrl: requireString(value.aiProvider.baseUrl, "settings.aiProvider.baseUrl"),
        model: requireString(value.aiProvider.model, "settings.aiProvider.model"),
        apiKey: requireNullableString(value.aiProvider.apiKey, "settings.aiProvider.apiKey")
      }
    : null;

  return {
    waterTargetMl: requireNumber(value.waterTargetMl, "settings.waterTargetMl", 100, 10000),
    photoStorageMode: requireEnum(value.photoStorageMode, "settings.photoStorageMode", [
      "keep-originals",
      "delete-after-structured-save"
    ]),
    aiProvider
  };
}

function requireArray(value: unknown, field: string) {
  if (!Array.isArray(value)) {
    throw new Error(`${field} must be an array.`);
  }

  return value;
}

export function validateHealthSnapshot(value: unknown): PrivateHealthSnapshot {
  if (!isRecord(value)) {
    throw new Error("Private health snapshot must be an object.");
  }

  if (value.version !== 2) {
    throw new Error("Private health snapshot version must be 2.");
  }

  const profile = isRecord(value.profile) ? value.profile : {};

  return {
    version: 2,
    profile: {
      heightCm:
        profile.heightCm === null || profile.heightCm === undefined
          ? null
          : requireNumber(profile.heightCm, "profile.heightCm", 50, 260),
      targetWeightKg:
        profile.targetWeightKg === null || profile.targetWeightKg === undefined
          ? null
          : requireNumber(profile.targetWeightKg, "profile.targetWeightKg", 20, 400)
    },
    waterLogs: requireArray(value.waterLogs, "waterLogs").map(validateWaterLog),
    meals: requireArray(value.meals, "meals").map(validateMealLog),
    mealPhotos: requireArray(value.mealPhotos, "mealPhotos").map(validateMealPhoto),
    bodyMetrics: requireArray(value.bodyMetrics, "bodyMetrics").map(validateBodyMetric),
    sleepLogs: requireArray(value.sleepLogs, "sleepLogs").map(validateSleepLog),
    exerciseLogs: requireArray(value.exerciseLogs, "exerciseLogs").map(validateExerciseLog),
    dailySummaries: requireArray(value.dailySummaries, "dailySummaries").map(validateDailySummary),
    weeklyReviews: requireArray(value.weeklyReviews, "weeklyReviews").map(validateWeeklyReview),
    dataExports: requireArray(value.dataExports, "dataExports").map(validateDataExport),
    settings: validateSettings(value.settings)
  };
}
```

- [ ] **Step 2: Run targeted test**

Run:

```powershell
node --test --experimental-strip-types tests/health-store.test.ts
```

Expected result:

```text
ERR_MODULE_NOT_FOUND
```

The store module is still missing.

## Task 5: Add File Store

**Files:**

- Create: `lib/health/store.ts`
- Test: `tests/health-store.test.ts`

- [ ] **Step 1: Create `lib/health/store.ts`**

```ts
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";
import type { PrivateHealthSnapshot } from "./types.ts";
import { validateHealthSnapshot } from "./validation.ts";

type HealthFileStoreOptions = {
  filePath?: string;
};

const defaultStorePath = join(process.cwd(), ".data", "private-health-store.json");

export function createDefaultHealthSnapshot(): PrivateHealthSnapshot {
  return {
    version: 2,
    profile: {
      heightCm: null,
      targetWeightKg: null
    },
    waterLogs: [],
    meals: [],
    mealPhotos: [],
    bodyMetrics: [],
    sleepLogs: [],
    exerciseLogs: [],
    dailySummaries: [],
    weeklyReviews: [],
    dataExports: [],
    settings: {
      waterTargetMl: 2000,
      photoStorageMode: "keep-originals",
      aiProvider: null
    }
  };
}

function ensureStoreFile(filePath: string) {
  if (existsSync(filePath)) {
    return;
  }

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(
    filePath,
    `${JSON.stringify(createDefaultHealthSnapshot(), null, 2)}\n`,
    "utf8"
  );
}

function redactExportSecrets(snapshot: PrivateHealthSnapshot): PrivateHealthSnapshot {
  return {
    ...snapshot,
    settings: {
      ...snapshot.settings,
      aiProvider: snapshot.settings.aiProvider
        ? {
            ...snapshot.settings.aiProvider,
            apiKey: null
          }
        : null
    }
  };
}

export function createHealthFileStore(options: HealthFileStoreOptions = {}) {
  const filePath = options.filePath ?? defaultStorePath;

  function read() {
    ensureStoreFile(filePath);
    try {
      return validateHealthSnapshot(JSON.parse(readFileSync(filePath, "utf8")));
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error("Private health store must contain valid JSON.");
      }

      throw error;
    }
  }

  function write(snapshot: PrivateHealthSnapshot) {
    const validated = validateHealthSnapshot(snapshot);
    mkdirSync(dirname(filePath), { recursive: true });
    const temporaryPath = `${filePath}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
    renameSync(temporaryPath, filePath);
  }

  return {
    exportData() {
      return redactExportSecrets(read());
    },
    importData(snapshot: PrivateHealthSnapshot) {
      write(snapshot);
      return redactExportSecrets(read());
    },
    readInternalData() {
      return read();
    }
  };
}
```

- [ ] **Step 2: Run targeted test**

Run:

```powershell
node --test --experimental-strip-types tests/health-store.test.ts
```

Expected result:

```text
# pass 5
# fail 0
```

## Task 6: Run Project Verification

**Files:**

- Read: `package.json`
- Read: `tests/health-store.test.ts`

- [ ] **Step 1: Run health foundation test**

Run:

```powershell
node --test --experimental-strip-types tests/health-store.test.ts
```

Expected result:

```text
# pass 5
# fail 0
```

- [ ] **Step 2: Run full test suite**

Run:

```powershell
npm test
```

Expected result:

```text
all tests pass
```

- [ ] **Step 3: Run typecheck**

Run:

```powershell
npm run typecheck
```

Expected result:

```text
tsc --noEmit exits 0
```

- [ ] **Step 4: Run lint**

Run:

```powershell
npm run lint
```

Expected result:

```text
next lint exits 0
```

## Task 7: Multi-Agent Review and Score

**Files:**

- Read: `AGENTS.md`
- Read: `docs/superpowers/specs/2026-06-08-private-health-os-design.md`
- Read: `docs/superpowers/plans/2026-06-09-private-health-os-development-plan.md`
- Read: `docs/superpowers/plans/2026-06-09-health-data-foundation.md`
- Review: `lib/health/types.ts`
- Review: `lib/health/date.ts`
- Review: `lib/health/validation.ts`
- Review: `lib/health/store.ts`
- Review: `tests/health-store.test.ts`

- [ ] **Step 1: Dispatch spec reviewer**

Reviewer prompt:

```markdown
Review Feature 1 Health Data Foundation for spec compliance.

Required references:
- AGENTS.md
- docs/superpowers/specs/2026-06-08-private-health-os-design.md
- docs/superpowers/plans/2026-06-09-private-health-os-development-plan.md
- docs/superpowers/plans/2026-06-09-health-data-foundation.md

Score out of 100 using the master plan rubric. This feature must score 81 or higher.

Hard gates:
- All required entities are represented.
- API keys are redacted from export.
- Private health data defaults to local file storage.
- Invalid ranges are rejected.
- No UI scope is added.
- No medical diagnosis or medication advice is introduced.

Return:
- Score
- Hard gate pass/fail
- Missing requirements
- Required fixes
```

- [ ] **Step 2: Dispatch code quality reviewer**

Reviewer prompt:

```markdown
Review Feature 1 Health Data Foundation for code quality.

Files:
- lib/health/types.ts
- lib/health/date.ts
- lib/health/validation.ts
- lib/health/store.ts
- tests/health-store.test.ts

Score out of 100 using the master plan rubric. This feature must score 81 or higher.

Check:
- Type names and field names are consistent.
- Validation is explicit and not over-broad.
- Store writes are atomic with a temp file and rename.
- Tests cover default snapshot, invalid ranges, persistence, and export redaction.
- File boundaries are focused.
- Existing legacy dynamic store behavior is untouched.

Return:
- Score
- Hard gate pass/fail
- Maintainability issues
- Test gaps
- Required fixes
```

- [ ] **Step 3: Rework until score passes**

If either reviewer scores below 81 or reports a hard-gate failure, send the implementation back to the implementer agent with the exact findings. Repeat review until both reviewers pass.

## Task 8: Commit Feature 1

**Files:**

- Stage: `lib/health/types.ts`
- Stage: `lib/health/date.ts`
- Stage: `lib/health/validation.ts`
- Stage: `lib/health/store.ts`
- Stage: `tests/health-store.test.ts`
- Stage: `docs/superpowers/plans/2026-06-09-health-data-foundation.md`

- [ ] **Step 1: Commit after passing review**

Run:

```powershell
git add lib/health/types.ts lib/health/date.ts lib/health/validation.ts lib/health/store.ts tests/health-store.test.ts docs/superpowers/plans/2026-06-09-health-data-foundation.md
git commit -m "feat: add private health data foundation"
```

Expected result:

```text
[branch commit] feat: add private health data foundation
```

## Self-Review Checklist

- Product spec coverage: Feature 1 covers shared data types, local-first storage, validation, import/export safety, and AI provider redaction.
- Placeholder scan: The plan contains no unfinished placeholders.
- Type consistency: Snapshot, entity, and settings names match across tests and implementation snippets.
- Scope control: The feature does not add UI, API routes, or AI provider calls.
- Score readiness: Review tasks require at least 81 points and hard-gate pass.
