import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const dynamic = "force-dynamic";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

type MealLog = {
  id: string;
  date: string;
  time: string;
  mealType: MealType;
  foodName: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: number;
  foods: Array<{
    name: string;
    portionAssumption: string;
    caloriesKcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    confidence: number;
  }>;
  portionAssumptions: string[];
  uncertainItems: string[];
  source: "manual" | "ai";
  createdAt: string;
};

function getStorePath(date: string) {
  const [year, month] = date.split("-");
  return join(process.cwd(), ".data", "meals", `${year}-${month}.json`);
}

function readMeals(date: string): MealLog[] {
  const path = getStorePath(date);
  if (!existsSync(path)) return [];
  const data = JSON.parse(readFileSync(path, "utf8")) as { meals?: MealLog[] };
  return Array.isArray(data.meals) ? data.meals : [];
}

function writeMeals(date: string, meals: MealLog[]) {
  const path = getStorePath(date);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ meals }, null, 2), "utf8");
}

function requireString(value: unknown, field: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required.`);
  }
  return value.trim();
}

function requireNumber(value: unknown, field: string, min = 0, max = 10000) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`${field} must be a number between ${min} and ${max}.`);
  }
  return Math.round(number * 10) / 10;
}

function requireStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function validateFoods(value: unknown): MealLog["foods"] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((food) => ({
      name: requireString(food.name, "foods.name"),
      portionAssumption:
        typeof food.portionAssumption === "string" && food.portionAssumption.trim()
          ? food.portionAssumption.trim()
          : "需要确认份量",
      caloriesKcal: requireNumber(food.caloriesKcal, "foods.caloriesKcal"),
      proteinG: requireNumber(food.proteinG, "foods.proteinG"),
      carbsG: requireNumber(food.carbsG, "foods.carbsG"),
      fatG: requireNumber(food.fatG, "foods.fatG"),
      confidence: requireNumber(food.confidence, "foods.confidence", 0, 1)
    }));
}

function validateMeal(value: unknown): MealLog {
  if (typeof value !== "object" || value === null) {
    throw new Error("Meal must be an object.");
  }

  const meal = value as Partial<MealLog>;
  const mealType = requireString(meal.mealType, "mealType") as MealType;
  if (!["breakfast", "lunch", "dinner", "snack"].includes(mealType)) {
    throw new Error("mealType is invalid.");
  }

  return {
    id: requireString(meal.id, "id"),
    date: requireString(meal.date, "date"),
    time: requireString(meal.time, "time"),
    mealType,
    foodName: requireString(meal.foodName, "foodName"),
    caloriesKcal: requireNumber(meal.caloriesKcal, "caloriesKcal"),
    proteinG: requireNumber(meal.proteinG, "proteinG"),
    carbsG: requireNumber(meal.carbsG, "carbsG"),
    fatG: requireNumber(meal.fatG, "fatG"),
    confidence: requireNumber(meal.confidence, "confidence", 0, 1),
    foods: validateFoods(meal.foods),
    portionAssumptions: requireStringArray(meal.portionAssumptions),
    uncertainItems: requireStringArray(meal.uncertainItems),
    source: meal.source === "ai" ? "ai" : "manual",
    createdAt: requireString(meal.createdAt, "createdAt")
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
    const meals = readMeals(date).filter((meal) => meal.date === date);
    const summary = meals.reduce(
      (total, meal) => ({
        caloriesKcal: total.caloriesKcal + meal.caloriesKcal,
        proteinG: total.proteinG + meal.proteinG,
        carbsG: total.carbsG + meal.carbsG,
        fatG: total.fatG + meal.fatG
      }),
      { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    );

    return Response.json({ meals, summary });
  } catch {
    return Response.json({ error: "读取饮食记录失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const meal = validateMeal(await request.json());
    const meals = readMeals(meal.date);
    const nextMeals = [...meals.filter((item) => item.id !== meal.id), meal];
    writeMeals(meal.date, nextMeals);
    return Response.json({ meal }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "保存饮食记录失败" },
      { status: 400 }
    );
  }
}
