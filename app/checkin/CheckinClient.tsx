"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type DynamicHabit = {
  id: string;
  label: string;
  active: boolean;
};

type CheckinState = Record<string, boolean>;

type CheckinHistory = {
  days: Array<{
    dateKey: string;
    completionRate: number;
  }>;
  completedDays: number;
  currentStreak: number;
  averageCompletionRate: number;
};

type ReviewWindow = 7 | 30;

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function buildDateKey(date: Date) {
  return `checkin-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateParam(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export default function CheckinClient() {
  const today = useMemo(() => new Date(), []);
  const dateKey = useMemo(() => buildDateKey(today), [today]);
  const endDate = useMemo(() => formatDateParam(today), [today]);
  const [habits, setHabits] = useState<DynamicHabit[]>([]);
  const [checkinState, setCheckinState] = useState<CheckinState>({});
  const [historyWindow, setHistoryWindow] = useState<ReviewWindow>(7);
  const [history, setHistory] = useState<CheckinHistory | null>(null);
  const [newHabitLabel, setNewHabitLabel] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadHistory = useCallback(async (windowSize: ReviewWindow) => {
    const response = await fetch(`/api/checkins?days=${windowSize}&endDate=${endDate}`);
    if (!response.ok) {
      throw new Error("无法读取本地回顾。");
    }

    const body = (await response.json()) as { history: CheckinHistory };
    setHistory(body.history);
  }, [endDate]);

  const loadCheckin = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [habitsResponse, stateResponse] = await Promise.all([
        fetch("/api/habits"),
        fetch(`/api/checkins?dateKey=${dateKey}`)
      ]);

      if (!habitsResponse.ok || !stateResponse.ok) {
        throw new Error("无法读取动态习惯或打卡状态。");
      }

      const habitsBody = (await habitsResponse.json()) as { habits: DynamicHabit[] };
      const stateBody = (await stateResponse.json()) as { state: CheckinState };
      setHabits(habitsBody.habits);
      setCheckinState(stateBody.state);
      await loadHistory(historyWindow);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "读取失败。");
    } finally {
      setIsLoading(false);
    }
  }, [dateKey, historyWindow, loadHistory]);

  useEffect(() => {
    void loadCheckin();
  }, [loadCheckin]);

  async function toggleHabit(habitId: string) {
    const next = {
      ...checkinState,
      [habitId]: !checkinState[habitId]
    };

    setCheckinState(next);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateKey, state: next })
      });
      if (!response.ok) {
        throw new Error("保存打卡失败。");
      }

      const body = (await response.json()) as { state: CheckinState };
      setCheckinState(body.state);
      await loadHistory(historyWindow);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "保存失败。");
      await loadCheckin();
    }
  }

  async function addHabit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const label = newHabitLabel.trim();
    if (label.length < 2) {
      setErrorMessage("习惯名称至少需要两个字符。");
      return;
    }

    setErrorMessage(null);
    const response = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: `custom-${Date.now()}`,
        label,
        active: true
      })
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setErrorMessage(body.error ?? "新增习惯失败。");
      return;
    }

    setNewHabitLabel("");
    await loadCheckin();
  }

  const completedToday = habits.filter((habit) => checkinState[habit.id] === true).length;
  const todayRate = habits.length === 0 ? 0 : completedToday / habits.length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section
        aria-labelledby="today-checkin"
        className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="today-checkin" className="text-xl font-bold text-emerald-950">
              今日动态习惯
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              当前记录 key：<span className="font-mono text-slate-800">{dateKey}</span>
            </p>
          </div>
          <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            <span className="block font-bold">{formatPercent(todayRate)}</span>
            <span>今日完成进度</span>
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{errorMessage}</p>
        ) : null}

        <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={addHabit}>
          <label className="sr-only" htmlFor="new-habit">
            新增习惯名称
          </label>
          <input
            className="min-h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            id="new-habit"
            maxLength={40}
            onChange={(event) => setNewHabitLabel(event.target.value)}
            placeholder="新增一个个人习惯"
            type="text"
            value={newHabitLabel}
          />
          <button
            className="min-h-11 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700"
            type="submit"
          >
            新增习惯
          </button>
        </form>

        <div className="mt-5 space-y-3">
          {isLoading ? (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">正在加载动态习惯。</p>
          ) : habits.length > 0 ? (
            habits.map((habit) => (
              <label
                className="flex min-h-14 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:bg-emerald-50"
                key={habit.id}
              >
                <input
                  checked={checkinState[habit.id] === true}
                  className="h-5 w-5 shrink-0 accent-emerald-700"
                  onChange={() => void toggleHabit(habit.id)}
                  type="checkbox"
                />
                <span className="text-base font-medium text-slate-900">{habit.label}</span>
              </label>
            ))
          ) : (
            <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              暂无习惯，请先新增一个习惯。
            </p>
          )}
        </div>
      </section>

      <section
        aria-labelledby="local-review"
        className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="local-review" className="text-xl font-bold text-emerald-950">
              动态回顾
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              聚合来自服务端数据层，只展示完成进度。
            </p>
          </div>
          <div
            aria-label="选择回顾范围"
            className="inline-flex w-fit rounded-lg border border-slate-200 bg-slate-50 p-1"
            role="group"
          >
            {[7, 30].map((value) => (
              <button
                aria-pressed={historyWindow === value}
                className={`min-h-9 rounded-md px-3 text-sm font-semibold ${
                  historyWindow === value
                    ? "bg-emerald-700 text-white"
                    : "text-slate-700 hover:bg-white"
                }`}
                key={value}
                onClick={() => {
                  const nextWindow = value as ReviewWindow;
                  setHistoryWindow(nextWindow);
                  void loadHistory(nextWindow);
                }}
                type="button"
              >
                {value} 天
              </button>
            ))}
          </div>
        </div>

        {history ? (
          <div className="mt-6 space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-600">完整完成天数</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {history.completedDays}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-600">当前连续天数</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {history.currentStreak}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-600">平均完成率</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {formatPercent(history.averageCompletionRate)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {history.days.map((day) => (
                <div className="grid grid-cols-[6.75rem_1fr_3.25rem] items-center gap-3" key={day.dateKey}>
                  <span className="font-mono text-xs text-slate-500">
                    {day.dateKey.replace("checkin-", "")}
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full bg-emerald-600"
                      style={{ width: formatPercent(day.completionRate) }}
                    />
                  </span>
                  <span className="text-right text-xs font-semibold text-slate-700">
                    {formatPercent(day.completionRate)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-600">正在读取动态回顾。</p>
        )}
      </section>
    </div>
  );
}
