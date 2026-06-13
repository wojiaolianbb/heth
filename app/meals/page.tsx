"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

type FoodEstimate = {
  name: string;
  portionAssumption: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: number;
};

type NutritionEstimate = {
  foodName: string;
  foods?: FoodEstimate[];
  totals: {
    caloriesKcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  confidence: number;
  portionAssumptions: string[];
  uncertainItems: string[];
};

type MealLog = {
  id: string;
  date: string;
  time: string;
  mealType: MealType;
  foodName: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: number;
  foods: FoodEstimate[];
  portionAssumptions: string[];
  uncertainItems: string[];
  source: "manual" | "ai";
  createdAt: string;
};

const emptyEstimate: NutritionEstimate = {
  foodName: "",
  foods: [],
  totals: {
    caloriesKcal: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0
  },
  confidence: 0,
  portionAssumptions: [],
  uncertainItems: []
};

const mealTypeLabels: Record<MealType, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐"
};

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timeKey(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("读取照片失败"));
    reader.readAsDataURL(file);
  });
}

function numberValue(value: string) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

export default function MealsPage() {
  const today = useMemo(() => localDateKey(), []);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [estimate, setEstimate] = useState<NutritionEstimate>(emptyEstimate);
  const [status, setStatus] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [source, setSource] = useState<"manual" | "ai">("manual");
  const [hasEstimate, setHasEstimate] = useState(false);

  const loadMeals = useCallback(async () => {
    const response = await fetch(`/api/meals?date=${today}`);
    const data = await response.json();
    setMeals(data.meals ?? []);
  }, [today]);

  useEffect(() => {
    void loadMeals();
  }, [loadMeals]);

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setStatus("请上传 png、jpg 或 webp 格式的餐食照片。");
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      setStatus("照片超过 6MB，请压缩后重试。");
      return;
    }

    setImageDataUrl(await readFileAsDataUrl(file));
    setEstimate(emptyEstimate);
    setSource("manual");
    setHasEstimate(false);
    setStatus("照片已选择，可以开始 AI 估算。");
  }

  async function analyzePhoto() {
    if (!imageDataUrl) {
      setStatus("请先选择餐食照片。");
      return;
    }

    setIsAnalyzing(true);
    setStatus("正在分析照片，只会返回营养估算和待确认项。");

    try {
      const response = await fetch("/api/meals/analyze-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl })
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        setHasEstimate(false);
        setStatus(data.error ?? "AI 估算失败，请检查模型是否支持图片输入。");
        return;
      }

      setEstimate(data.estimate ?? emptyEstimate);
      setSource("ai");
      setHasEstimate(true);
      setStatus("AI 已自动估算，请确认并修正后保存。");
    } catch {
      setHasEstimate(false);
      setStatus("AI 分析失败，请检查 API key、Base URL 或模型是否支持图片输入。");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function startManualEntry() {
    setEstimate(emptyEstimate);
    setSource("manual");
    setHasEstimate(true);
    setStatus("已切换为手动记录。AI 不可用时才需要手动填写。");
  }

  function updateTotals(field: keyof NutritionEstimate["totals"], value: string) {
    setEstimate((current) => ({
      ...current,
      totals: {
        ...current.totals,
        [field]: numberValue(value)
      }
    }));
  }

  function updateTextList(field: "portionAssumptions" | "uncertainItems", value: string) {
    setEstimate((current) => ({
      ...current,
      [field]: value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
    }));
  }

  async function saveMeal() {
    if (!hasEstimate) {
      setStatus("请先点击 AI 估算营养，或切换为手动记录。");
      return;
    }

    if (!estimate.foodName.trim()) {
      setStatus("请填写食物名称。");
      return;
    }

    setIsSaving(true);
    setStatus("正在保存到本地饮食记录。");

    const now = new Date();
    const meal: MealLog = {
      id: `meal-${Date.now()}`,
      date: today,
      time: timeKey(now),
      mealType,
      foodName: estimate.foodName.trim(),
      caloriesKcal: estimate.totals.caloriesKcal,
      proteinG: estimate.totals.proteinG,
      carbsG: estimate.totals.carbsG,
      fatG: estimate.totals.fatG,
      confidence: estimate.confidence,
      foods: estimate.foods ?? [],
      portionAssumptions: estimate.portionAssumptions,
      uncertainItems: estimate.uncertainItems,
      source,
      createdAt: now.toISOString()
    };

    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meal)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "保存失败");
      }

      setEstimate(emptyEstimate);
      setImageDataUrl("");
      setSource("manual");
      setHasEstimate(false);
      setStatus("饮食记录已保存。");
      await loadMeals();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteMeal(id: string) {
    await fetch(`/api/meals/${id}?date=${today}`, { method: "DELETE" });
    await loadMeals();
  }

  const summary = meals.reduce(
    (total, meal) => ({
      caloriesKcal: total.caloriesKcal + meal.caloriesKcal,
      proteinG: total.proteinG + meal.proteinG,
      carbsG: total.carbsG + meal.carbsG,
      fatG: total.fatG + meal.fatG
    }),
    { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  return (
    <div className="min-h-full bg-[#fbfcfb] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-3xl font-black tracking-tight text-slate-950">饮食记录</h1>
          <p className="mt-2 text-sm text-slate-500">
            拍照后可用已配置的 AI key 做营养估算，所有结果都需要你确认和修正。
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_380px]">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-5 md:grid-cols-[260px_minmax(0,1fr)]">
              <div>
                <label className="block text-sm font-bold text-slate-900">餐食照片</label>
                <div className="mt-3 flex min-h-[260px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                  {imageDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageDataUrl} alt="餐食预览" className="h-full w-full object-cover" />
                  ) : (
                    <div className="px-6 text-center text-sm text-slate-500">
                      上传照片后预览会显示在这里，照片不会提交到仓库。
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoChange}
                  className="mt-4 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:font-bold file:text-emerald-700"
                />
                <button
                  onClick={analyzePhoto}
                  disabled={isAnalyzing || !imageDataUrl}
                  className="mt-3 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:bg-slate-300"
                >
                  {isAnalyzing ? "分析中..." : "AI 估算营养"}
                </button>
                <button
                  onClick={startManualEntry}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  AI 不可用时手动记录
                </button>
              </div>

              <div className="space-y-4">
                {!hasEstimate ? (
                  <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                    上传照片后点击“AI 估算营养”，系统会自动填入热量和营养数据；这里的输入框只用于确认和修正。
                  </div>
                ) : null}

                <div>
                  <label className="text-sm font-bold text-slate-900">餐次</label>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {(Object.keys(mealTypeLabels) as MealType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => setMealType(type)}
                        className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                          mealType === type
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 text-slate-600"
                        }`}
                      >
                        {mealTypeLabels[type]}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="text-sm font-bold text-slate-900">食物名称</span>
                  <input
                    value={estimate.foodName}
                    disabled={!hasEstimate}
                    onChange={(event) =>
                      setEstimate((current) => ({ ...current, foodName: event.target.value }))
                    }
                    placeholder="例如：鸡胸肉蔬菜饭"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <label className="block">
                    <span className="text-xs font-bold text-slate-600">千卡</span>
                    <input
                      type="number"
                      value={estimate.totals.caloriesKcal}
                      disabled={!hasEstimate}
                      onChange={(event) => updateTotals("caloriesKcal", event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-slate-600">蛋白质 g</span>
                    <input
                      type="number"
                      value={estimate.totals.proteinG}
                      disabled={!hasEstimate}
                      onChange={(event) => updateTotals("proteinG", event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-slate-600">碳水 g</span>
                    <input
                      type="number"
                      value={estimate.totals.carbsG}
                      disabled={!hasEstimate}
                      onChange={(event) => updateTotals("carbsG", event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-slate-600">脂肪 g</span>
                    <input
                      type="number"
                      value={estimate.totals.fatG}
                      disabled={!hasEstimate}
                      onChange={(event) => updateTotals("fatG", event.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-bold text-slate-900">份量假设</span>
                    <textarea
                      value={estimate.portionAssumptions.join("\n")}
                      disabled={!hasEstimate}
                      onChange={(event) => updateTextList("portionAssumptions", event.target.value)}
                      rows={4}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-slate-900">需要确认</span>
                    <textarea
                      value={estimate.uncertainItems.join("\n")}
                      disabled={!hasEstimate}
                      onChange={(event) => updateTextList("uncertainItems", event.target.value)}
                      rows={4}
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </label>
                </div>

                <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  可信度：<span className="font-bold text-slate-900">{Math.round(estimate.confidence * 100)}%</span>
                  {estimate.confidence > 0 && estimate.confidence < 0.65 ? (
                    <span className="ml-2 font-bold text-orange-600">需要重点确认</span>
                  ) : null}
                </div>

                <button
                  onClick={saveMeal}
                  disabled={isSaving || !hasEstimate}
                  className="w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:bg-slate-300"
                >
                  {isSaving ? "保存中..." : "确认并保存记录"}
                </button>

                {status ? <p className="text-sm font-medium text-slate-600">{status}</p> : null}
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-black text-slate-950">今日汇总</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-slate-500">热量</div>
                  <div className="mt-1 text-xl font-black">{Math.round(summary.caloriesKcal)} 千卡</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-slate-500">餐次</div>
                  <div className="mt-1 text-xl font-black">{meals.length}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-slate-500">蛋白质</div>
                  <div className="mt-1 text-xl font-black">{summary.proteinG.toFixed(1)} g</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-slate-500">碳水/脂肪</div>
                  <div className="mt-1 text-xl font-black">
                    {summary.carbsG.toFixed(0)} / {summary.fatG.toFixed(0)} g
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-black text-slate-950">今日记录</h2>
              <div className="mt-4 space-y-3">
                {meals.length === 0 ? (
                  <div className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">
                    暂无饮食记录。
                  </div>
                ) : (
                  meals.map((meal) => (
                    <div key={meal.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-950">{meal.foodName}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {mealTypeLabels[meal.mealType]} · {meal.time} · {meal.source === "ai" ? "AI估算" : "手动"}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteMeal(meal.id)}
                          className="rounded px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                        >
                          删除
                        </button>
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs text-slate-600">
                        <span>{Math.round(meal.caloriesKcal)} 千卡</span>
                        <span>蛋白 {meal.proteinG}g</span>
                        <span>碳水 {meal.carbsG}g</span>
                        <span>脂肪 {meal.fatG}g</span>
                      </div>
                      {(meal.foods ?? []).length > 0 ? (
                        <div className="mt-3 space-y-1 rounded-lg bg-slate-50 p-2">
                          {(meal.foods ?? []).map((food, index) => (
                            <div
                              key={`${meal.id}-${food.name}-${index}`}
                              className="flex items-start justify-between gap-2 text-xs text-slate-600"
                            >
                              <span className="min-w-0">
                                <span className="font-bold text-slate-800">{food.name}</span>
                                <span className="ml-1">{food.portionAssumption}</span>
                              </span>
                              <span className="shrink-0 font-bold text-slate-800">
                                {Math.round(food.caloriesKcal)} kcal
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
