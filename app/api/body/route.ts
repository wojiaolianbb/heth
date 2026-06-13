import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";

export const dynamic = "force-dynamic";

type BodyMetric = {
  id: string;
  date: string;
  weightKg: number;
  bmi: number;
  note?: string;
  createdAt: string;
};

function getStorePath() {
  return join(process.cwd(), ".data", "body", "metrics.json");
}

function readMetrics(): BodyMetric[] {
  const path = getStorePath();
  if (!existsSync(path)) return [];
  const data = JSON.parse(readFileSync(path, "utf8"));
  return data.metrics || [];
}

function writeMetrics(metrics: BodyMetric[]) {
  const path = getStorePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ metrics }, null, 2), "utf8");
}

export async function GET() {
  try {
    const metrics = readMetrics().sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return Response.json({ metrics });
  } catch (error) {
    return Response.json({ error: "读取失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const metric = await request.json() as BodyMetric;
    const metrics = readMetrics();
    metrics.push(metric);
    writeMetrics(metrics);
    return Response.json({ success: true }, { status: 201 });
  } catch (error) {
    return Response.json({ error: "保存失败" }, { status: 400 });
  }
}
