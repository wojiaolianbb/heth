"use client";

import { useEffect, useState } from "react";

type WaterLog = {
  id: string;
  date: string;
  time: string;
  amountMl: number;
  createdAt: string;
};

export default function WaterPage() {
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [totalMl, setTotalMl] = useState(0);
  const [goalMl, setGoalMl] = useState(2000);
  const [customAmount, setCustomAmount] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    const res = await fetch(`/api/water?date=${today}`);
    const data = await res.json();
    setLogs(data.logs);
    setTotalMl(data.totalMl);
    setGoalMl(data.goalMl);
  }

  async function addWater(amountMl: number) {
    const now = new Date();
    const log = {
      id: `water-${Date.now()}`,
      date: today,
      time: now.toTimeString().slice(0, 5),
      amountMl,
      createdAt: now.toISOString()
    };

    await fetch("/api/water", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log)
    });

    await loadLogs();
  }

  async function handleCustomAdd() {
    const amount = parseInt(customAmount);
    if (amount > 0) {
      await addWater(amount);
      setCustomAmount("");
      setShowCustom(false);
    }
  }

  async function removeLog(id: string) {
    await fetch(`/api/water/${id}?date=${today}`, { method: "DELETE" });
    await loadLogs();
  }

  const progress = Math.min(100, (totalMl / goalMl) * 100);

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold text-slate-900">饮水记录</h1>
        <p className="mt-2 text-slate-600">记录每日饮水量，保持健康习惯</p>

        {/* 进度卡片 */}
        <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-slate-500">今日饮水</p>
              <p className="mt-1 text-4xl font-bold text-blue-600">{totalMl} ml</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">目标</p>
              <p className="mt-1 text-2xl font-semibold text-slate-700">{goalMl} ml</p>
            </div>
          </div>

          <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-center text-sm text-slate-600">
            {progress >= 100 ? "✅ 已完成今日目标" : `还需 ${goalMl - totalMl} ml`}
          </p>
        </div>

        {/* 快捷按钮 */}
        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-slate-700">快速记录</p>
          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={() => addWater(100)}
              className="rounded-lg bg-blue-500 px-4 py-3 text-white hover:bg-blue-600"
            >
              +100ml
            </button>
            <button
              onClick={() => addWater(250)}
              className="rounded-lg bg-blue-500 px-4 py-3 text-white hover:bg-blue-600"
            >
              +250ml
            </button>
            <button
              onClick={() => addWater(500)}
              className="rounded-lg bg-blue-500 px-4 py-3 text-white hover:bg-blue-600"
            >
              +500ml
            </button>
            <button
              onClick={() => setShowCustom(!showCustom)}
              className="rounded-lg border-2 border-blue-500 px-4 py-3 text-blue-500 hover:bg-blue-50"
            >
              自定义
            </button>
          </div>
        </div>

        {/* 自定义输入 */}
        {showCustom && (
          <div className="mt-4 rounded-lg bg-white p-4 shadow-sm">
            <div className="flex gap-3">
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="输入毫升数"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
              />
              <button
                onClick={handleCustomAdd}
                className="rounded-lg bg-blue-500 px-6 text-white hover:bg-blue-600"
              >
                添加
              </button>
              <button
                onClick={() => setShowCustom(false)}
                className="rounded-lg border border-slate-300 px-4 hover:bg-slate-50"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 今日记录 */}
        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-slate-700">今日记录</p>
          {logs.length === 0 ? (
            <div className="rounded-lg bg-white p-6 text-center text-slate-500">
              还没有记录，点击上方按钮开始记录
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">💧</div>
                    <div>
                      <p className="font-semibold text-slate-900">{log.amountMl} ml</p>
                      <p className="text-sm text-slate-500">{log.time}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeLog(log.id)}
                    className="rounded px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
