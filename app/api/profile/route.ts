import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const dynamic = "force-dynamic";

type UserProfile = {
  id: "local-user";
  nickname: string;
  avatarText: string;
  heightCm: number;
  weightKg?: number;
  goal: "fat_loss" | "muscle_gain" | "maintenance" | "health";
  activityLevel: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
};

const defaultProfile: UserProfile = {
  id: "local-user",
  nickname: "本地用户",
  avatarText: "本",
  heightCm: 170,
  goal: "health",
  activityLevel: "medium",
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString()
};

function getStorePath() {
  return join(process.cwd(), ".data", "profile.json");
}

function readProfile(): UserProfile {
  const path = getStorePath();
  if (!existsSync(path)) return defaultProfile;
  const stored = JSON.parse(readFileSync(path, "utf8")) as unknown;
  const storedObject = typeof stored === "object" && stored !== null ? (stored as Record<string, unknown>) : {};
  const profileObject = storedObject.profile;
  const data =
    typeof profileObject === "object" && profileObject !== null
      ? (profileObject as Partial<UserProfile>)
      : (storedObject as Partial<UserProfile>);
  return validateProfile(data, data.createdAt ?? defaultProfile.createdAt);
}

function writeProfile(profile: UserProfile) {
  const path = getStorePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ profile }, null, 2), "utf8");
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback: number, min: number, max: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? Math.round(number * 10) / 10 : fallback;
}

function validateProfile(value: unknown, createdAt = new Date().toISOString()): UserProfile {
  const data = typeof value === "object" && value !== null ? (value as Partial<UserProfile>) : {};
  const goal: UserProfile["goal"] =
    data.goal && ["fat_loss", "muscle_gain", "maintenance", "health"].includes(data.goal)
      ? data.goal
      : "health";
  const activityLevel: UserProfile["activityLevel"] =
    data.activityLevel && ["low", "medium", "high"].includes(data.activityLevel)
      ? data.activityLevel
      : "medium";

  const nickname = stringValue(data.nickname, defaultProfile.nickname);
  return {
    id: "local-user",
    nickname,
    avatarText: stringValue(data.avatarText, nickname.slice(0, 1) || "本").slice(0, 2),
    heightCm: numberValue(data.heightCm, defaultProfile.heightCm, 80, 240),
    weightKg: data.weightKg === undefined ? undefined : numberValue(data.weightKg, 0, 20, 300),
    goal,
    activityLevel,
    createdAt,
    updatedAt: new Date().toISOString()
  };
}

export async function GET() {
  try {
    return Response.json({ profile: readProfile() });
  } catch {
    return Response.json({ profile: defaultProfile });
  }
}

export async function POST(request: Request) {
  try {
    const current = readProfile();
    const profile = validateProfile(await request.json(), current.createdAt);
    writeProfile(profile);
    return Response.json({ profile });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "保存用户资料失败" },
      { status: 400 }
    );
  }
}
