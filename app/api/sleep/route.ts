import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";

export const dynamic = "force-dynamic";

type SleepLog = {
  id: string;
  date: string;
  bedTime: string;
  wakeTime: string;
  durationMinutes: number;
  quality: "good" | "ok" | "poor";
  note?: string;
  createdAt: string;
};

function getStorePath(date: string) {
  const [year, month] = date.split("-");
  return join(process.cwd(), ".data", "sleep", `${year}-${month}.json`);
}

function readLogs(date: string): SleepLog[] {
  const path = getStorePath(date);
  if (!existsSync(path)) return [];
  const data = JSON.parse(readFileSync(path, "utf8"));
  return data.logs || [];
}

function writeLogs(date: string, logs: SleepLog[]) {
  const path = getStorePath(date);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ logs }, null, 2), "utf8");
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
    const logs = readLogs(date).filter(log => log.date === date);
    return Response.json({ logs });
  } catch (error) {
    return Response.json({ error: "读取失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const log = await request.json() as SleepLog;
    const allLogs = readLogs(log.date);
    allLogs.push(log);
    writeLogs(log.date, allLogs);
    return Response.json({ success: true }, { status: 201 });
  } catch (error) {
    return Response.json({ error: "保存失败" }, { status: 400 });
  }
}
