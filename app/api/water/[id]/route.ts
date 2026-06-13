import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";

export const dynamic = "force-dynamic";

type WaterLog = {
  id: string;
  date: string;
  time: string;
  amountMl: number;
  createdAt: string;
};

function getStorePath(date: string) {
  const [year, month] = date.split("-");
  return join(process.cwd(), ".data", "water", `${year}-${month}.json`);
}

function readLogs(date: string): WaterLog[] {
  const path = getStorePath(date);
  if (!existsSync(path)) return [];
  const data = JSON.parse(readFileSync(path, "utf8"));
  return data.logs || [];
}

function writeLogs(date: string, logs: WaterLog[]) {
  const path = getStorePath(date);
  writeFileSync(path, JSON.stringify({ logs }, null, 2), "utf8");
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];

    const logs = readLogs(date);
    const filtered = logs.filter(log => log.id !== params.id);
    writeLogs(date, filtered);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "删除失败" }, { status: 400 });
  }
}
