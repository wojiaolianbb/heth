import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const dynamic = "force-dynamic";

type ExerciseType = "walking" | "running" | "strength" | "cardio" | "stretch" | "sport" | "mixed" | "other";
type ExerciseSource = "manual" | "ai_text" | "ai_image";
type ExerciseItem = {
  name: string;
  category: "strength" | "cardio" | "mobility" | "sport" | "other";
  durationMin?: number;
  distanceKm?: number;
  sets?: number;
  reps?: number;
  weightKg?: number;
  caloriesKcal?: number;
  intensity?: 1 | 2 | 3 | 4 | 5;
  confidence: number;
};

type ExerciseLog = {
  id: string;
  date: string;
  time: string;
  title: string;
  type: ExerciseType;
  durationMin: number;
  intensity: 1 | 2 | 3 | 4 | 5;
  caloriesKcal: number;
  items: ExerciseItem[];
  source: ExerciseSource;
  confidence: number;
  uncertainItems: string[];
  note?: string;
  createdAt: string;
};

function getStorePath(date: string) {
  const [year, month] = date.split("-");
  return join(process.cwd(), ".data", "exercise", `${year}-${month}.json`);
}

function readLogs(date: string): ExerciseLog[] {
  const path = getStorePath(date);
  if (!existsSync(path)) return [];
  const data = JSON.parse(readFileSync(path, "utf8")) as { logs?: ExerciseLog[] };
  return Array.isArray(data.logs) ? data.logs : [];
}

function writeLogs(date: string, logs: ExerciseLog[]) {
  const path = getStorePath(date);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ logs }, null, 2), "utf8");
}

function stringValue(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required.`);
  return value.trim();
}

function numberValue(value: unknown, field: string, min = 0, max = 10000) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`${field} must be between ${min} and ${max}.`);
  }
  return Math.round(number * 10) / 10;
}

function optionalNumber(value: unknown, field: string, min = 0, max = 10000) {
  if (value === undefined || value === null || value === "") return undefined;
  return numberValue(value, field, min, max);
}

function intensity(value: unknown): 1 | 2 | 3 | 4 | 5 {
  const number = Math.round(numberValue(value, "intensity", 1, 5));
  return Math.min(5, Math.max(1, number)) as 1 | 2 | 3 | 4 | 5;
}

function confidence(value: unknown) {
  return numberValue(value, "confidence", 0, 1);
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function exerciseType(value: unknown): ExerciseType {
  const allowed: ExerciseType[] = ["walking", "running", "strength", "cardio", "stretch", "sport", "mixed", "other"];
  return allowed.includes(value as ExerciseType) ? (value as ExerciseType) : "other";
}

function source(value: unknown): ExerciseSource {
  const allowed: ExerciseSource[] = ["manual", "ai_text", "ai_image"];
  return allowed.includes(value as ExerciseSource) ? (value as ExerciseSource) : "manual";
}

function category(value: unknown): ExerciseItem["category"] {
  const allowed: ExerciseItem["category"][] = ["strength", "cardio", "mobility", "sport", "other"];
  return allowed.includes(value as ExerciseItem["category"]) ? (value as ExerciseItem["category"]) : "other";
}

function validateExerciseLog(value: unknown): ExerciseLog {
  if (typeof value !== "object" || value === null) throw new Error("Exercise must be an object.");
  const data = value as Record<string, unknown>;
  const items = Array.isArray(data.items)
    ? data.items
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map((item) => ({
          name: stringValue(item.name, "items.name"),
          category: category(item.category),
          durationMin: optionalNumber(item.durationMin, "items.durationMin", 0, 1440),
          distanceKm: optionalNumber(item.distanceKm, "items.distanceKm", 0, 500),
          sets: optionalNumber(item.sets, "items.sets", 0, 100),
          reps: optionalNumber(item.reps, "items.reps", 0, 10000),
          weightKg: optionalNumber(item.weightKg, "items.weightKg", 0, 1000),
          caloriesKcal: optionalNumber(item.caloriesKcal, "items.caloriesKcal", 0, 10000),
          intensity: item.intensity === undefined ? undefined : intensity(item.intensity),
          confidence: confidence(item.confidence ?? 0)
        }))
    : [];

  return {
    id: stringValue(data.id, "id"),
    date: stringValue(data.date, "date"),
    time: stringValue(data.time, "time"),
    title: stringValue(data.title, "title"),
    type: exerciseType(data.type),
    durationMin: numberValue(data.durationMin, "durationMin", 1, 1440),
    intensity: intensity(data.intensity),
    caloriesKcal: numberValue(data.caloriesKcal, "caloriesKcal", 0, 10000),
    items,
    source: source(data.source),
    confidence: confidence(data.confidence ?? 0),
    uncertainItems: stringArray(data.uncertainItems),
    note: typeof data.note === "string" ? data.note.trim() : undefined,
    createdAt: stringValue(data.createdAt, "createdAt")
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
    const logs = readLogs(date).filter((log) => log.date === date);
    const summary = logs.reduce(
      (total, log) => ({
        durationMin: total.durationMin + log.durationMin,
        caloriesKcal: total.caloriesKcal + log.caloriesKcal,
        count: total.count + 1,
        intensityTotal: total.intensityTotal + log.intensity
      }),
      { durationMin: 0, caloriesKcal: 0, count: 0, intensityTotal: 0 }
    );

    return Response.json({
      logs,
      summary: {
        durationMin: summary.durationMin,
        caloriesKcal: Math.round(summary.caloriesKcal),
        count: summary.count,
        averageIntensity: summary.count ? Math.round((summary.intensityTotal / summary.count) * 10) / 10 : 0
      }
    });
  } catch {
    return Response.json({ error: "读取运动记录失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const exercise = validateExerciseLog(await request.json());
    const logs = readLogs(exercise.date);
    writeLogs(exercise.date, [...logs.filter((log) => log.id !== exercise.id), exercise]);
    return Response.json({ exercise }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "保存运动记录失败" },
      { status: 400 }
    );
  }
}
