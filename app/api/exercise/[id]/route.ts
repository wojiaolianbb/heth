import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const dynamic = "force-dynamic";

type ExerciseLog = {
  id: string;
  date: string;
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

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    if (!date) return Response.json({ error: "date is required" }, { status: 400 });
    writeLogs(
      date,
      readLogs(date).filter((log) => log.id !== params.id)
    );
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "删除运动记录失败" }, { status: 500 });
  }
}
