"use client";

import { useEffect, useState } from "react";

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

export default function SleepPage() {
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [bedTime, setBedTime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [quality, setQuality] = useState<"good" | "ok" | "poor">("ok");
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    const res = await fetch(`/api/sleep?date=${today}`);
    const data = await res.json();
    setLogs(data.logs);
  }

  function calculateDuration(bed: string, wake: string): number {
    const [bedH, bedM] = bed.split(":").map(Number);
    const [wakeH, wakeM] = wake.split(":").map(Number);

    let bedMinutes = bedH * 60 + bedM;
    let wakeMinutes = wakeH * 60 + wakeM;

    if (wakeMinutes < bedMinutes) {
      wakeMinutes += 24 * 60;
    }

    return wakeMinutes - bedMinutes;
  }

  async function saveSleep() {
    if (!bedTime || !wakeTime) return;

    const durationMinutes = calculateDuration(bedTime, wakeTime);
    const log = {
      id: `sleep-${Date.now()}`,
      date: today,
      bedTime,
      wakeTime,
      durationMinutes,
      quality,
      createdAt: new Date().toISOString()
    };

    await fetch("/api/sleep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log)
    });

    setBedTime("");
    setWakeTime("");
    setQuality("ok");
    await loadLogs();
  }

  const duration = bedTime && wakeTime ? calculateDuration(bedTime, wakeTime) : 0;

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold text-slate-900">睡眠记录</h1>
        <p className="mt-2 text-slate-600">记录睡眠时间和质量</p>

        {/* 输入表单 */}
        <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                入睡时间
              </label>
              <input
                type="time"
                value={bedTime}
                onChange={(e) => setBedTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                起床时间
              </label>
              <input
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2"
              />
            </div>

            {duration > 0 && (
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-blue-700">
                  睡眠时长: {Math.floor(duration / 60)} 小时 {duration % 60} 分钟
                </p>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                睡眠质量
              </label>
              <div className="flex gap-3">
                {[
                  { value: "good" as const, label: "好 😊", color: "green" },
                  { value: "ok" as const, label: "一般 😐", color: "yellow" },
                  { value: "poor" as const, label: "差 😔", color: "red" }
                ].map((q) => (
                  <button
                    key={q.value}
                    onClick={() => setQuality(q.value)}
                    className={`flex-1 rounded-lg border-2 px-4 py-3 font-medium ${
                      quality === q.value
                        ? `border-${q.color}-500 bg-${q.color}-50 text-${q.color}-700`
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={saveSleep}
              disabled={!bedTime || !wakeTime}
              className="w-full rounded-lg bg-purple-500 py-3 font-semibold text-white hover:bg-purple-600 disabled:bg-slate-300"
            >
              保存记录
            </button>
          </div>
        </div>

        {/* 历史记录 */}
        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-slate-700">今日记录</p>
          {logs.length === 0 ? (
            <div className="rounded-lg bg-white p-6 text-center text-slate-500">
              还没有记录
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="rounded-lg bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {log.bedTime} - {log.wakeTime}
                      </p>
                      <p className="text-sm text-slate-500">
                        {Math.floor(log.durationMinutes / 60)}h {log.durationMinutes % 60}m
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block rounded px-3 py-1 text-sm ${
                          log.quality === "good"
                            ? "bg-green-100 text-green-700"
                            : log.quality === "ok"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {log.quality === "good" ? "好" : log.quality === "ok" ? "一般" : "差"}
                      </span>
                    </div>
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
