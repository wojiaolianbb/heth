import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const dynamic = "force-dynamic";

type MealLog = {
  id: string;
  date: string;
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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    if (!date) {
      return Response.json({ error: "date is required" }, { status: 400 });
    }

    const meals = readMeals(date);
    writeMeals(
      date,
      meals.filter((meal) => meal.id !== params.id)
    );
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "删除饮食记录失败" }, { status: 500 });
  }
}
