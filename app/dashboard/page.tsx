"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type WaterLog = {
  id: string;
  date: string;
  time: string;
  amountMl: number;
  createdAt: string;
};

type BodyMetric = {
  id: string;
  date: string;
  weightKg: number;
  bmi: number;
  createdAt: string;
};

type SleepLog = {
  id: string;
  date: string;
  bedTime: string;
  wakeTime: string;
  durationMinutes: number;
  quality: "good" | "ok" | "poor";
  createdAt: string;
};

type ExerciseSummary = {
  durationMin: number;
  caloriesKcal: number;
  count: number;
  averageIntensity: number;
};

type DashboardState = {
  waterLogs: WaterLog[];
  waterTotal: number;
  waterGoal: number;
  bodyMetrics: BodyMetric[];
  sleepLog: SleepLog | null;
  exerciseSummary: ExerciseSummary;
  loading: boolean;
  error: string | null;
};

const initialState: DashboardState = {
  waterLogs: [],
  waterTotal: 1200,
  waterGoal: 2000,
  bodyMetrics: [],
  sleepLog: null,
  exerciseSummary: {
    durationMin: 0,
    caloriesKcal: 0,
    count: 0,
    averageIntensity: 0
  },
  loading: true,
  error: null
};

const fallbackBodyTrend = [70.8, 70.8, 69.7, 68.8, 68.8, 68.2];
const fallbackWaterBars = [340, 620, 860, 90, 140, 760, 1040, 1500, 340, 960, 1180];

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date: Date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatWeekday(date: Date) {
  return ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][
    date.getDay()
  ];
}

function formatDuration(minutes: number) {
  return {
    hours: Math.floor(minutes / 60),
    minutes: minutes % 60
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function Card({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-xl border border-slate-200/90 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.035)] ${className}`}
    >
      {children}
    </section>
  );
}

function IconButton({
  label,
  icon,
  href,
  tone
}: {
  label: string;
  icon: string;
  href: string;
  tone: "blue" | "green" | "teal" | "purple" | "orange";
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-600 shadow-blue-100",
    green: "bg-emerald-50 text-emerald-600 shadow-emerald-100",
    teal: "bg-teal-50 text-teal-600 shadow-teal-100",
    purple: "bg-violet-50 text-violet-600 shadow-violet-100",
    orange: "bg-orange-50 text-orange-500 shadow-orange-100"
  }[tone];

  return (
    <Link href={href} className="group flex min-w-0 flex-col items-center gap-2">
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl shadow-sm transition group-hover:-translate-y-0.5 ${toneClass}`}
      >
        {icon}
      </span>
      <span className="truncate text-xs font-semibold text-slate-700">{label}</span>
    </Link>
  );
}

function ProgressBar({
  value,
  color,
  className = ""
}: {
  value: number;
  color: string;
  className?: string;
}) {
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-slate-200 ${className}`}>
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${clamp(value, 0, 100)}%` }}
      />
    </div>
  );
}

function Donut({
  value,
  color,
  children,
  size = "large"
}: {
  value: number;
  color: string;
  children: React.ReactNode;
  size?: "large" | "small";
}) {
  const dimension = size === "large" ? "h-36 w-36" : "h-24 w-24";
  const inner = size === "large" ? "inset-[13px]" : "inset-[8px]";

  return (
    <div
      className={`relative ${dimension} rounded-full`}
      style={{
        background: `conic-gradient(${color} ${clamp(value, 0, 100)}%, #e8eef5 0)`
      }}
    >
      <div className={`absolute ${inner} flex flex-col items-center justify-center rounded-full bg-white`}>
        {children}
      </div>
    </div>
  );
}

function WaterMiniChart({ bars }: { bars: number[] }) {
  const max = 2000;

  return (
    <div className="grid min-h-[148px] min-w-0 flex-1 grid-cols-[36px_minmax(0,1fr)] gap-3">
      <div className="flex flex-col justify-between text-right text-[11px] text-slate-500">
        <span>2k</span>
        <span>1.5k</span>
        <span>1k</span>
        <span>500</span>
        <span>0</span>
      </div>
      <div className="relative flex items-end justify-between border-b border-slate-200 pb-1">
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-slate-300" />
        <div className="absolute inset-x-0 top-1/4 border-t border-slate-100" />
        <div className="absolute inset-x-0 top-1/2 border-t border-slate-100" />
        <div className="absolute inset-x-0 top-3/4 border-t border-slate-100" />
        {bars.map((amount, index) => (
          <div
            key={`${amount}-${index}`}
            className="z-10 w-1.5 rounded-t-full bg-blue-500 shadow-[0_0_0_1px_rgba(37,99,235,0.04)] even:bg-blue-300"
            style={{ height: `${clamp((amount / max) * 100, 4, 100)}%` }}
          />
        ))}
      </div>
      <div />
      <div className="flex justify-between pt-1 text-[11px] text-slate-500">
        <span>0时</span>
        <span>6时</span>
        <span>12时</span>
        <span>18时</span>
        <span>24时</span>
      </div>
    </div>
  );
}

function BodySparkline({ values }: { values: number[] }) {
  const min = Math.min(...values) - 0.5;
  const max = Math.max(...values) + 0.5;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * 100;
      const y = 70 - ((value - min) / Math.max(1, max - min)) * 45;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 78" className="h-28 w-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="body-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[18, 36, 54, 72].map((y) => (
        <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#e5e7eb" strokeWidth="0.5" />
      ))}
      <polygon points={`0,76 ${points} 100,76`} fill="url(#body-area)" />
      <polyline points={points} fill="none" stroke="#059669" strokeWidth="1.4" />
      {points.split(" ").map((point) => {
        const [x, y] = point.split(",");
        return <circle key={point} cx={x} cy={y} r="1.8" fill="#059669" stroke="#fff" strokeWidth="1" />;
      })}
    </svg>
  );
}

function SleepTimeline() {
  const blocks = [
    ["left-[0%] w-[12%] bg-blue-600", "top-3 h-7"],
    ["left-[11%] w-[21%] bg-violet-500", "top-7 h-8"],
    ["left-[30%] w-[8%] bg-blue-300", "top-3 h-10"],
    ["left-[38%] w-[7%] bg-violet-600", "top-4 h-11"],
    ["left-[44%] w-[10%] bg-blue-400", "top-3 h-9"],
    ["left-[53%] w-[18%] bg-violet-500", "top-7 h-8"],
    ["left-[69%] w-[7%] bg-blue-300", "top-3 h-11"],
    ["left-[75%] w-[7%] bg-blue-500", "top-3 h-11"],
    ["left-[81%] w-[15%] bg-violet-500", "top-7 h-8"],
    ["left-[94%] w-[12%] bg-blue-300", "top-3 h-7"]
  ];

  return (
    <div className="relative h-16 rounded-lg">
      <div className="absolute left-0 right-0 top-6 h-4 rounded-full bg-blue-100" />
      {blocks.map(([position, size], index) => (
        <div
          key={index}
          className={`absolute rounded-sm opacity-90 ${position} ${size}`}
        />
      ))}
    </div>
  );
}

function WaterCard({
  total,
  goal,
  bars,
  latestLog
}: {
  total: number;
  goal: number;
  bars: number[];
  latestLog: WaterLog | null;
}) {
  const percent = Math.round((total / goal) * 100);

  return (
    <Card className="overflow-hidden lg:col-span-3">
      <div className="flex items-start justify-between px-5 pt-5">
        <h2 className="text-base font-black text-slate-950">饮水进度</h2>
        <Link href="/water" className="text-xs font-semibold text-blue-600">
          编辑目标
        </Link>
      </div>
      <div className="grid min-w-0 gap-6 px-5 pb-5 pt-4 md:grid-cols-[160px_minmax(0,1fr)]">
        <div className="flex flex-col items-center justify-center">
          <Donut value={percent} color="#2f7df4">
            <span className="text-3xl font-black tracking-tight text-slate-950">{total}</span>
            <span className="text-xs font-medium text-slate-500">ml</span>
          </Donut>
          <div className="mt-3 text-sm font-bold text-blue-600">{percent}%</div>
        </div>
        <div>
          <div className="mb-3 text-right text-sm text-slate-600">目标 {goal} ml</div>
          <WaterMiniChart bars={bars} />
        </div>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3 text-slate-700">
          <span className="text-blue-500">▰</span>
          <span>最近一杯</span>
          <span className="font-semibold">{latestLog?.time ?? "13:45"}</span>
          <span>{latestLog?.amountMl ?? 300} ml</span>
        </div>
        <Link
          href="/water"
          className="rounded-lg border border-blue-300 px-6 py-2 text-center text-sm font-bold text-blue-600 transition hover:bg-blue-50"
        >
          + 加水
        </Link>
      </div>
    </Card>
  );
}

function MealCard() {
  return (
    <Card className="p-5 lg:col-span-3">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-black text-slate-950">今日饮食</h2>
        <Link href="/meals" className="text-xs font-semibold text-blue-600">
          查看记录 ›
        </Link>
      </div>
      <div className="grid gap-5 md:grid-cols-[214px_1fr]">
        <div className="relative min-h-[190px] overflow-hidden rounded-xl bg-[#f8f4ec] shadow-inner" aria-label="健康餐盘照片">
          <div className="absolute inset-4 rounded-full bg-white shadow-[0_16px_40px_rgba(15,23,42,0.12)]" />
          <div className="absolute left-[18%] top-[18%] h-[34%] w-[34%] rounded-full bg-[radial-gradient(circle_at_35%_35%,#f6d09a,#c8763f_62%,#9a4f2d)]" />
          <div className="absolute right-[18%] top-[17%] h-[30%] w-[30%] rounded-full bg-[radial-gradient(circle_at_35%_35%,#86efac,#16a34a_58%,#166534)]" />
          <div className="absolute bottom-[18%] left-[21%] h-[32%] w-[32%] rounded-full bg-[radial-gradient(circle_at_30%_30%,#fef3c7,#f59e0b_54%,#b45309)]" />
          <div className="absolute bottom-[19%] right-[20%] h-[34%] w-[34%] rounded-full bg-[radial-gradient(circle_at_35%_35%,#4c1d95,#1f0f46_72%)]" />
          <div className="absolute right-[21%] top-[37%] h-12 w-12 rounded-full bg-[radial-gradient(circle_at_35%_35%,#fecaca,#ef4444_66%,#991b1b)]" />
          <div className="absolute right-[31%] top-[48%] h-9 w-9 rounded-full bg-[radial-gradient(circle_at_35%_35%,#fecaca,#ef4444_66%,#991b1b)]" />
          <div className="absolute left-[34%] top-[33%] h-16 w-20 rotate-[-18deg] rounded-full bg-[radial-gradient(circle_at_35%_35%,#fde68a,#f5b85b_50%,#b96b32)] opacity-95" />
        </div>
        <div className="flex flex-col justify-between">
          <div>
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">午餐 <span className="font-normal text-slate-500">12:30</span></span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">
                营养均衡
              </span>
            </div>
            <div className="text-3xl font-black tracking-tight text-slate-950">
              462<span className="ml-1 text-sm font-bold text-slate-600">千卡</span>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-[70px_1fr_40px] items-center gap-3 text-sm">
              <span className="font-medium text-slate-700">蛋白质</span>
              <ProgressBar value={62} color="bg-emerald-500" />
              <span className="text-right text-slate-500">24%</span>
            </div>
            <div className="grid grid-cols-[70px_1fr_40px] items-center gap-3 text-sm">
              <span className="font-medium text-slate-700">脂肪</span>
              <ProgressBar value={46} color="bg-amber-400" />
              <span className="text-right text-slate-500">22%</span>
            </div>
            <div className="grid grid-cols-[70px_1fr_40px] items-center gap-3 text-sm">
              <span className="font-medium text-slate-700">碳水</span>
              <ProgressBar value={66} color="bg-blue-500" />
              <span className="text-right text-slate-500">54%</span>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link href="/meals" className="rounded-lg border border-slate-200 py-3 text-center text-sm font-bold text-emerald-600 hover:bg-emerald-50">
          ▣ 拍照记录
        </Link>
        <Link href="/meals" className="rounded-lg border border-slate-200 py-3 text-center text-sm font-bold text-emerald-600 hover:bg-emerald-50">
          ≡ 饮食记录
        </Link>
      </div>
    </Card>
  );
}

function BodyCard({ metrics }: { metrics: BodyMetric[] }) {
  const latest = metrics[0];
  const previous = metrics[1];
  const weight = latest?.weightKg ?? 68.6;
  const diff = previous ? weight - previous.weightKg : -0.4;
  const trend = metrics.length >= 2 ? metrics.slice(0, 6).reverse().map((item) => item.weightKg) : fallbackBodyTrend;

  return (
    <Card className="p-5 lg:col-span-2">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-base font-black text-slate-950">体重趋势</h2>
          <div className="mt-4 text-3xl font-black tracking-tight text-slate-950">
            {weight.toFixed(1)} <span className="text-sm font-bold">kg</span>
          </div>
          <div className="mt-1 text-sm text-slate-500">最新 {latest?.date ?? "5月20日 07:30"}</div>
        </div>
        <div className="text-right">
          <Link href="/body" className="text-xs font-semibold text-blue-600">
            查看详情
          </Link>
          <div className={`mt-5 text-sm font-bold ${diff <= 0 ? "text-emerald-600" : "text-orange-500"}`}>
            {diff <= 0 ? "↓" : "↑"} {Math.abs(diff).toFixed(1)} kg
          </div>
          <div className="text-sm text-slate-500">较昨日</div>
        </div>
      </div>
      <BodySparkline values={trend} />
      <div className="mt-1 grid grid-cols-[1fr_auto] items-center gap-5 text-xs text-slate-600">
        <div>
          <div className="mb-1 flex justify-between">
            <span>目标体重 65.0 kg</span>
            <span>当前进度 68%</span>
          </div>
          <ProgressBar value={68} color="bg-emerald-500" className="h-2" />
        </div>
      </div>
    </Card>
  );
}

function SleepCard({ log }: { log: SleepLog | null }) {
  const duration = formatDuration(log?.durationMinutes ?? 452);
  const qualityText = log?.quality === "poor" ? "偏低" : log?.quality === "ok" ? "一般" : "良好";

  return (
    <Card className="p-5 lg:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-black text-slate-950">睡眠</h2>
        <div className="text-sm text-slate-500">
          睡眠质量 <span className="ml-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600">{qualityText}</span>
        </div>
      </div>
      <div className="text-3xl font-black tracking-tight text-slate-950">
        {duration.hours}<span className="mx-1 text-sm font-bold">小时</span>
        {duration.minutes}<span className="ml-1 text-sm font-bold">分钟</span>
      </div>
      <div className="mt-4 flex justify-between text-sm text-slate-500">
        <span>{log?.bedTime ?? "00:15"} 入睡</span>
        <span>{log?.wakeTime ?? "07:47"} 起床</span>
      </div>
      <SleepTimeline />
      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-600" />深睡 1h45m</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-500" />浅睡 4h20m</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-200" />清醒 1h27m</span>
      </div>
      <div className="mt-5 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
        睡眠效率 <span className="font-bold">88%</span>
      </div>
    </Card>
  );
}

function ExerciseCard({ summary }: { summary: ExerciseSummary }) {
  const hasExercise = summary.count > 0;
  const goalPercent = Math.round((summary.durationMin / 60) * 100);

  return (
    <Card className="p-5 lg:col-span-2">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-black text-slate-950">运动</h2>
        <Link href="/exercise" className="text-xs font-semibold text-blue-600">
          查看记录 ›
        </Link>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_112px] items-start gap-5">
        <div>
          <div className="text-3xl font-black tracking-tight text-slate-950">
            {summary.durationMin}<span className="ml-1 text-sm font-bold">分钟</span>
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {hasExercise ? "今日运动时长" : "今日暂无运动记录"}
          </div>
          <div className="mt-8 space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-orange-500">♦</span>
              <span className="text-slate-500">消耗</span>
              <span className="font-semibold text-slate-800">{summary.caloriesKcal} 千卡</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-500">⌁</span>
              <span className="text-slate-500">{hasExercise ? "平均强度" : "记录次数"}</span>
              <span className="font-semibold text-slate-800">
                {hasExercise ? `${summary.averageIntensity} / 5` : "0 次"}
              </span>
            </div>
          </div>
        </div>
        <Donut value={goalPercent} color="#ff7452" size="small">
          <span className="text-xl font-black text-slate-950">{clamp(goalPercent, 0, 100)}%</span>
          <span className="text-[10px] text-slate-500">60 分钟</span>
        </Donut>
      </div>
      <Link
        href="/exercise"
        className="mt-8 block rounded-lg border border-orange-200 bg-orange-50 py-3 text-center text-sm font-bold text-orange-600 hover:bg-orange-100"
      >
        › 开始运动
      </Link>
    </Card>
  );
}

function IntegrityCard() {
  const items = ["饮食记录 2/3", "睡眠记录 1/1", "饮水记录 5/6", "运动记录 1/1", "体重记录 1/1"];

  return (
    <Card className="p-5 lg:col-span-3">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-black text-slate-950">数据完整度 <span className="text-xs text-slate-400">ⓘ</span></h2>
        <Link href="/review" className="text-xs font-semibold text-blue-600">
          查看全部›
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-[120px_minmax(0,1fr)]">
        <div className="flex items-center justify-center">
          <Donut value={85} color="#10b981" size="small">
            <span className="text-xl font-black text-slate-950">85%</span>
            <span className="text-[10px] text-slate-500">今日完整度</span>
          </Donut>
        </div>
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          {items.map((item) => (
            <div key={item} className="flex items-center gap-2 text-slate-700">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-600">
                ✓
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function QuickActionsCard() {
  return (
    <Card className="p-5 lg:col-span-3">
      <h2 className="mb-6 text-base font-black text-slate-950">快捷操作</h2>
      <div className="grid grid-cols-5 gap-3">
        <IconButton href="/meals" label="记饮食" icon="▣" tone="green" />
        <IconButton href="/water" label="加水" icon="▰" tone="blue" />
        <IconButton href="/body" label="记体重" icon="◓" tone="teal" />
        <IconButton href="/sleep" label="记睡眠" icon="◐" tone="purple" />
        <IconButton href="/exercise" label="记运动" icon="⌁" tone="orange" />
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState>(initialState);
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => localDateKey(today), [today]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [waterRes, bodyRes, sleepRes, exerciseRes] = await Promise.all([
          fetch(`/api/water?date=${todayKey}`),
          fetch("/api/body"),
          fetch(`/api/sleep?date=${todayKey}`),
          fetch(`/api/exercise?date=${todayKey}`)
        ]);

        if (!waterRes.ok || !bodyRes.ok || !sleepRes.ok || !exerciseRes.ok) {
          throw new Error("部分首页数据读取失败");
        }

        const waterData = (await waterRes.json()) as {
          logs?: WaterLog[];
          totalMl?: number;
          goalMl?: number;
        };
        const bodyData = (await bodyRes.json()) as { metrics?: BodyMetric[] };
        const sleepData = (await sleepRes.json()) as { logs?: SleepLog[] };
        const exerciseData = (await exerciseRes.json()) as { summary?: ExerciseSummary };

        if (!active) return;

        setState({
          waterLogs: waterData.logs ?? [],
          waterTotal: waterData.totalMl ?? 0,
          waterGoal: waterData.goalMl ?? 2000,
          bodyMetrics: bodyData.metrics ?? [],
          sleepLog: sleepData.logs?.[0] ?? null,
          exerciseSummary: exerciseData.summary ?? initialState.exerciseSummary,
          loading: false,
          error: null
        });
      } catch (error) {
        if (!active) return;
        setState((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : "首页数据读取失败"
        }));
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [todayKey]);

  const waterBars = useMemo(() => {
    if (state.waterLogs.length === 0) {
      return fallbackWaterBars;
    }

    const buckets = Array.from({ length: 12 }, () => 0);
    for (const log of state.waterLogs) {
      const hour = Number(log.time.split(":")[0]);
      const index = clamp(Math.floor(hour / 2), 0, buckets.length - 1);
      buckets[index] += log.amountMl;
    }
    return buckets;
  }, [state.waterLogs]);

  const latestWaterLog = state.waterLogs[state.waterLogs.length - 1] ?? null;
  const displayedWaterTotal = state.waterTotal || 1200;

  return (
    <div className="min-h-full w-full max-w-full overflow-x-hidden px-4 py-5 sm:px-6 lg:px-6 lg:py-7">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-end gap-3">
            <h1 className="text-3xl font-black tracking-tight text-slate-950">今日</h1>
            <div className="pb-1 text-sm font-medium text-slate-500">
              {formatDate(today)}　{formatWeekday(today)}　农历四月廿三
            </div>
          </div>
          {state.error ? (
            <p className="mt-2 text-sm font-semibold text-orange-600">{state.error}</p>
          ) : state.loading ? (
            <p className="mt-2 text-sm text-slate-500">正在读取本地记录...</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <button className="hidden h-10 w-10 items-center justify-center rounded-full text-xl text-slate-900 transition hover:bg-slate-100 sm:flex" aria-label="通知">
            ♧
          </button>
          <button className="hidden rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50 sm:block">
            ↻ 同步设备
          </button>
        </div>
      </header>

      <div className="mb-5 grid grid-cols-5 gap-2 lg:hidden">
        <IconButton href="/water" label="加水" icon="▰" tone="blue" />
        <IconButton href="/meals" label="拍餐" icon="▣" tone="green" />
        <IconButton href="/body" label="体重" icon="◓" tone="teal" />
        <IconButton href="/sleep" label="睡眠" icon="◐" tone="purple" />
        <IconButton href="/exercise" label="运动" icon="⌁" tone="orange" />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-6 lg:gap-5">
        <WaterCard
          total={displayedWaterTotal}
          goal={state.waterGoal}
          bars={waterBars}
          latestLog={latestWaterLog}
        />
        <MealCard />
        <BodyCard metrics={state.bodyMetrics} />
        <SleepCard log={state.sleepLog} />
        <ExerciseCard summary={state.exerciseSummary} />
        <IntegrityCard />
        <QuickActionsCard />
      </div>
    </div>
  );
}
