"use client";

import { useEffect, useState } from "react";

type BodyMetric = {
  id: string;
  date: string;
  weightKg: number;
  bmi: number;
  note?: string;
  createdAt: string;
};

type ProfileResponse = {
  profile?: {
    heightCm?: number;
  };
};

const fallbackHeightCm = 170;

export default function BodyPage() {
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [weightInput, setWeightInput] = useState("");
  const [heightCm, setHeightCm] = useState(fallbackHeightCm);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    loadMetrics();
    loadProfile();
  }, []);

  async function loadMetrics() {
    const res = await fetch("/api/body");
    const data = await res.json();
    setMetrics(data.metrics);
  }

  async function loadProfile() {
    try {
      const res = await fetch("/api/profile");
      if (!res.ok) return;
      const data = (await res.json()) as ProfileResponse;
      const profileHeight = data.profile?.heightCm;
      if (typeof profileHeight === "number" && Number.isFinite(profileHeight)) {
        setHeightCm(profileHeight);
      }
    } catch {
      // Keep local fallback if the profile store is unavailable.
    }
  }

  function calculateBMI(weight: number, height: number): number {
    return weight / (height / 100) ** 2;
  }

  async function saveWeight() {
    const weightKg = parseFloat(weightInput);
    if (isNaN(weightKg) || weightKg <= 0) return;

    const metric = {
      id: `body-${Date.now()}`,
      date: today,
      weightKg,
      bmi: calculateBMI(weightKg, heightCm),
      createdAt: new Date().toISOString()
    };

    await fetch("/api/body", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metric)
    });

    setWeightInput("");
    await loadMetrics();
  }

  const latestMetric = metrics[0];

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold text-slate-900">体重记录</h1>
        <p className="mt-2 text-slate-600">记录体重变化，追踪健康趋势</p>

        {latestMetric && (
          <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">最新体重</p>
                <p className="mt-1 text-4xl font-bold text-emerald-600">
                  {latestMetric.weightKg}
                  <span className="text-xl"> kg</span>
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">BMI</p>
                <p className="mt-1 text-4xl font-bold text-slate-700">
                  {latestMetric.bmi.toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
          <p className="mb-4 text-sm font-medium text-slate-700">记录今日体重</p>
          <div className="flex gap-3">
            <input
              type="number"
              step="0.1"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="输入体重 (kg)"
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2"
            />
            <button
              onClick={saveWeight}
              className="rounded-lg bg-emerald-500 px-6 font-semibold text-white hover:bg-emerald-600"
            >
              保存
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            身高设定: {heightCm} cm (可在设置中修改)
          </p>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-slate-700">历史记录</p>
          {metrics.length === 0 ? (
            <div className="rounded-lg bg-white p-6 text-center text-slate-500">
              还没有记录
            </div>
          ) : (
            <div className="space-y-2">
              {metrics.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{m.weightKg} kg</p>
                    <p className="text-sm text-slate-500">{m.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">BMI</p>
                    <p className="font-semibold text-slate-700">{m.bmi.toFixed(1)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
