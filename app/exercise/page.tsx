"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";

type ExerciseType = "walking" | "running" | "strength" | "cardio" | "stretch" | "sport" | "mixed" | "other";
type ExerciseCategory = "strength" | "cardio" | "mobility" | "sport" | "other";
type ExerciseSource = "manual" | "ai_text" | "ai_image";

type ExerciseItem = {
  name: string;
  category: ExerciseCategory;
  durationMin?: number;
  distanceKm?: number;
  sets?: number;
  reps?: number;
  weightKg?: number;
  caloriesKcal?: number;
  intensity?: 1 | 2 | 3 | 4 | 5;
  confidence: number;
};

type ExerciseEstimate = {
  title: string;
  type: ExerciseType;
  durationMin: number;
  intensity: 1 | 2 | 3 | 4 | 5;
  caloriesKcal: number;
  items: ExerciseItem[];
  confidence: number;
  uncertainItems: string[];
  note: string;
};

type ExerciseLog = ExerciseEstimate & {
  id: string;
  date: string;
  time: string;
  source: ExerciseSource;
  createdAt: string;
};

type ExerciseSummary = {
  durationMin: number;
  caloriesKcal: number;
  count: number;
  averageIntensity: number;
};

const typeLabels: Record<ExerciseType, string> = {
  walking: "步行",
  running: "跑步",
  strength: "力量",
  cardio: "有氧",
  stretch: "拉伸",
  sport: "球类/运动",
  mixed: "混合训练",
  other: "其他"
};

const categoryLabels: Record<ExerciseCategory, string> = {
  strength: "力量",
  cardio: "有氧",
  mobility: "灵活性",
  sport: "运动",
  other: "其他"
};

const typeOptions = Object.keys(typeLabels) as ExerciseType[];
const categoryOptions = Object.keys(categoryLabels) as ExerciseCategory[];

const emptyEstimate: ExerciseEstimate = {
  title: "",
  type: "other",
  durationMin: 30,
  intensity: 3,
  caloriesKcal: 120,
  items: [],
  confidence: 0,
  uncertainItems: [],
  note: ""
};

const quickTemplates: Array<Pick<ExerciseEstimate, "title" | "type" | "durationMin" | "intensity" | "caloriesKcal" | "items" | "confidence" | "uncertainItems" | "note">> = [
  {
    title: "快走",
    type: "walking",
    durationMin: 30,
    intensity: 2,
    caloriesKcal: 120,
    confidence: 1,
    uncertainItems: [],
    note: "快速模板，可按实际情况修正。",
    items: [{ name: "快走", category: "cardio", durationMin: 30, caloriesKcal: 120, intensity: 2, confidence: 1 }]
  },
  {
    title: "跑步",
    type: "running",
    durationMin: 40,
    intensity: 4,
    caloriesKcal: 360,
    confidence: 1,
    uncertainItems: [],
    note: "快速模板，可补充距离或配速。",
    items: [{ name: "跑步", category: "cardio", durationMin: 40, distanceKm: 5, caloriesKcal: 360, intensity: 4, confidence: 1 }]
  },
  {
    title: "力量训练",
    type: "strength",
    durationMin: 45,
    intensity: 4,
    caloriesKcal: 260,
    confidence: 1,
    uncertainItems: ["请确认具体动作、组数和重量"],
    note: "快速模板，可在明细里拆分动作。",
    items: [{ name: "力量训练", category: "strength", durationMin: 45, caloriesKcal: 260, intensity: 4, confidence: 1 }]
  },
  {
    title: "拉伸放松",
    type: "stretch",
    durationMin: 20,
    intensity: 1,
    caloriesKcal: 55,
    confidence: 1,
    uncertainItems: [],
    note: "快速模板。",
    items: [{ name: "拉伸放松", category: "mobility", durationMin: 20, caloriesKcal: 55, intensity: 1, confidence: 1 }]
  }
];

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
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}

function numeric(value: string, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 10) / 10 : fallback;
}

function clampIntensity(value: string | number): 1 | 2 | 3 | 4 | 5 {
  const number = Math.round(Number(value));
  return Math.max(1, Math.min(5, Number.isFinite(number) ? number : 3)) as 1 | 2 | 3 | 4 | 5;
}

function sourceLabel(source: ExerciseSource) {
  if (source === "ai_text") return "AI 描述";
  if (source === "ai_image") return "AI 截图";
  return "手动";
}

function intensityLabel(value: number) {
  if (value <= 1) return "轻松";
  if (value === 2) return "偏轻";
  if (value === 3) return "中等";
  if (value === 4) return "较高";
  return "很高";
}

function StatCard({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.035)]">
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-tight text-slate-950">
        {value}
        {suffix ? <span className="ml-1 text-xs font-bold text-slate-500">{suffix}</span> : null}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-bold text-slate-600">{children}</span>;
}

export default function ExercisePage() {
  const today = useMemo(() => localDateKey(), []);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [summary, setSummary] = useState<ExerciseSummary>({ durationMin: 0, caloriesKcal: 0, count: 0, averageIntensity: 0 });
  const [draft, setDraft] = useState<ExerciseEstimate>(emptyEstimate);
  const [hasDraft, setHasDraft] = useState(false);
  const [source, setSource] = useState<ExerciseSource>("manual");
  const [description, setDescription] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [status, setStatus] = useState("");
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadLogs = useCallback(async () => {
    const response = await fetch(`/api/exercise?date=${today}`);
    const data = await response.json();
    setLogs(data.logs ?? []);
    setSummary(data.summary ?? { durationMin: 0, caloriesKcal: 0, count: 0, averageIntensity: 0 });
  }, [today]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  function setTemplate(template: ExerciseEstimate) {
    setDraft(template);
    setHasDraft(true);
    setSource("manual");
    setStatus("已载入快速模板，可继续修正后保存。");
  }

  function updateDraft<K extends keyof ExerciseEstimate>(field: K, value: ExerciseEstimate[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function updateItem(index: number, patch: Partial<ExerciseItem>) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    }));
  }

  function addItem() {
    setDraft((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          name: "新增运动",
          category: "other",
          durationMin: 10,
          caloriesKcal: 30,
          intensity: current.intensity,
          confidence: source === "manual" ? 1 : 0.6
        }
      ]
    }));
    setHasDraft(true);
  }

  function removeItem(index: number) {
    setDraft((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  async function analyzeText() {
    if (!description.trim()) {
      setStatus("先输入运动描述，例如：跑步 5 公里 35 分钟，然后做了 4 组俯卧撑。");
      return;
    }

    setIsAnalyzingText(true);
    setStatus("正在分析运动描述，结果会进入可编辑草稿。");
    try {
      const response = await fetch("/api/exercise/analyze-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: description })
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        setStatus(data.error ?? "AI 描述分析失败，请检查本地模型或 API 配置。");
        return;
      }
      setDraft(data.estimate ?? emptyEstimate);
      setHasDraft(true);
      setSource("ai_text");
      setStatus("AI 已生成运动草稿，请确认强度、热量和明细后保存。");
    } catch {
      setStatus("AI 描述分析失败，请检查 Ollama 或 API 配置。");
    } finally {
      setIsAnalyzingText(false);
    }
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setStatus("请上传 png、jpg 或 webp 格式的运动截图。");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setStatus("图片超过 6MB，请压缩后重试。");
      return;
    }
    setImageDataUrl(await readFileAsDataUrl(file));
    setStatus("截图已选择，可以开始 AI 分析。");
  }

  async function analyzeImage() {
    if (!imageDataUrl) {
      setStatus("先上传运动 App、手表或器械面板截图。");
      return;
    }

    setIsAnalyzingImage(true);
    setStatus("正在识别截图中的运动数据。");
    try {
      const response = await fetch("/api/exercise/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl })
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        setStatus(data.error ?? "AI 截图分析失败，请确认模型支持图片输入。");
        return;
      }
      setDraft(data.estimate ?? emptyEstimate);
      setHasDraft(true);
      setSource("ai_image");
      setStatus("AI 已识别截图，请确认看不清或单位不确定的项目。");
    } catch {
      setStatus("AI 截图分析失败，请检查 Ollama 视觉模型或 API 配置。");
    } finally {
      setIsAnalyzingImage(false);
    }
  }

  async function saveExercise() {
    if (!hasDraft) {
      setStatus("请先用 AI 分析、上传截图，或选择快速模板。");
      return;
    }
    if (!draft.title.trim()) {
      setStatus("请填写运动名称。");
      return;
    }

    setIsSaving(true);
    setStatus("正在保存到本地运动记录。");
    const now = new Date();
    const exercise: ExerciseLog = {
      ...draft,
      id: `exercise-${Date.now()}`,
      date: today,
      time: timeKey(now),
      source,
      createdAt: now.toISOString()
    };

    try {
      const response = await fetch("/api/exercise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exercise)
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "保存运动记录失败");
      }
      setDraft(emptyEstimate);
      setHasDraft(false);
      setDescription("");
      setImageDataUrl("");
      setSource("manual");
      setStatus("运动记录已保存。");
      await loadLogs();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存运动记录失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteExercise(log: ExerciseLog) {
    await fetch(`/api/exercise/${log.id}?date=${log.date}`, { method: "DELETE" });
    await loadLogs();
  }

  return (
    <div className="min-h-full bg-[#fbfcfb] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Exercise Loop</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">运动记录</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              输入运动描述或上传运动截图，让 AI 生成可编辑估算；所有强度和热量都需要你确认后才会保存。
            </p>
          </div>
          <div className="rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
            本地优先 · 今日 {today}
          </div>
        </header>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="今日时长" value={summary.durationMin} suffix="分钟" />
          <StatCard label="估算消耗" value={summary.caloriesKcal} suffix="千卡" />
          <StatCard label="记录次数" value={summary.count} suffix="次" />
          <StatCard label="平均强度" value={summary.averageIntensity || 0} suffix={summary.count ? intensityLabel(Math.round(summary.averageIntensity)) : ""} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.12fr)_380px]">
          <section className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-950">AI 描述分析</h2>
                  <p className="mt-1 text-xs text-slate-500">适合口述：跑了多久、练了什么动作、组数次数、距离或大概感受。</p>
                </div>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">文本</span>
              </div>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="例如：晚上跑步 5 公里 35 分钟，后面做了 4 组俯卧撑，每组 15 个，整体感觉比较累。"
                className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={analyzeText}
                  disabled={isAnalyzingText}
                  className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:bg-slate-300"
                >
                  {isAnalyzingText ? "分析中..." : "AI 分析描述"}
                </button>
                <button
                  onClick={() => setTemplate(emptyEstimate)}
                  className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  手动填写
                </button>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-[260px_minmax(0,1fr)]">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-black text-slate-950">截图识别</h2>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">图片</span>
                </div>
                <div className="mt-4 flex min-h-[250px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
                  {imageDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageDataUrl} alt="运动截图预览" className="h-full w-full object-cover" />
                  ) : (
                    <div className="px-5 text-center text-sm leading-6 text-slate-500">
                      上传运动 App、手表截图或器械面板照片，AI 会读取时长、热量、距离等字段。
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageChange}
                  className="mt-4 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:font-bold file:text-emerald-700"
                />
                <button
                  onClick={analyzeImage}
                  disabled={isAnalyzingImage || !imageDataUrl}
                  className="mt-3 w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:bg-slate-300"
                >
                  {isAnalyzingImage ? "识别中..." : "AI 识别截图"}
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-black text-slate-950">快速记录</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {quickTemplates.map((template) => (
                    <button
                      key={template.title}
                      onClick={() => setTemplate(template)}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      <div className="font-black text-slate-950">{template.title}</div>
                      <div className="mt-2 text-sm text-slate-500">
                        {template.durationMin} 分钟 · {template.caloriesKcal} 千卡 · {intensityLabel(template.intensity)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-950">确认运动草稿</h2>
                  <p className="mt-1 text-xs text-slate-500">识别错了可以直接改；保存前不会写入今日记录。</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  来源：{sourceLabel(source)}
                </span>
              </div>

              {!hasDraft ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm leading-6 text-slate-500">
                  还没有草稿。可以用 AI 分析描述、上传截图识别，或选择快速记录模板。
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_170px_150px]">
                    <label className="block">
                      <FieldLabel>运动名称</FieldLabel>
                      <input
                        value={draft.title}
                        onChange={(event) => updateDraft("title", event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <FieldLabel>运动类型</FieldLabel>
                      <select
                        value={draft.type}
                        onChange={(event) => updateDraft("type", event.target.value as ExerciseType)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        {typeOptions.map((type) => (
                          <option key={type} value={type}>
                            {typeLabels[type]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <FieldLabel>可信度</FieldLabel>
                      <div className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm font-black text-slate-900">
                        {Math.round(draft.confidence * 100)}%
                      </div>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <label className="block">
                      <FieldLabel>时长 分钟</FieldLabel>
                      <input
                        type="number"
                        value={draft.durationMin}
                        onChange={(event) => updateDraft("durationMin", numeric(event.target.value, 1))}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <FieldLabel>消耗 千卡</FieldLabel>
                      <input
                        type="number"
                        value={draft.caloriesKcal}
                        onChange={(event) => updateDraft("caloriesKcal", numeric(event.target.value))}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <FieldLabel>强度 1-5</FieldLabel>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={draft.intensity}
                        onChange={(event) => updateDraft("intensity", clampIntensity(event.target.value))}
                        className="mt-4 w-full accent-orange-500"
                      />
                      <div className="text-xs font-bold text-orange-600">{draft.intensity} · {intensityLabel(draft.intensity)}</div>
                    </label>
                    <label className="block">
                      <FieldLabel>备注</FieldLabel>
                      <input
                        value={draft.note}
                        onChange={(event) => updateDraft("note", event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <FieldLabel>运动明细</FieldLabel>
                      <button onClick={addItem} className="text-xs font-bold text-emerald-700">
                        + 添加明细
                      </button>
                    </div>
                    <div className="space-y-3">
                      {draft.items.length === 0 ? (
                        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">暂无明细，可添加动作或项目。</div>
                      ) : (
                        draft.items.map((item, index) => (
                          <div key={`${item.name}-${index}`} className="rounded-xl border border-slate-200 p-3">
                            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_120px_95px_95px_95px_auto]">
                              <input
                                value={item.name}
                                onChange={(event) => updateItem(index, { name: event.target.value })}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              />
                              <select
                                value={item.category}
                                onChange={(event) => updateItem(index, { category: event.target.value as ExerciseCategory })}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              >
                                {categoryOptions.map((category) => (
                                  <option key={category} value={category}>
                                    {categoryLabels[category]}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                title="时长"
                                placeholder="分钟"
                                value={item.durationMin ?? ""}
                                onChange={(event) => updateItem(index, { durationMin: event.target.value ? numeric(event.target.value) : undefined })}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              />
                              <input
                                type="number"
                                title="距离"
                                placeholder="公里"
                                value={item.distanceKm ?? ""}
                                onChange={(event) => updateItem(index, { distanceKm: event.target.value ? numeric(event.target.value) : undefined })}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              />
                              <input
                                type="number"
                                title="热量"
                                placeholder="千卡"
                                value={item.caloriesKcal ?? ""}
                                onChange={(event) => updateItem(index, { caloriesKcal: event.target.value ? numeric(event.target.value) : undefined })}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              />
                              <button
                                onClick={() => removeItem(index)}
                                className="rounded-lg px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                              >
                                删除
                              </button>
                            </div>
                            <div className="mt-2 grid gap-2 sm:grid-cols-4">
                              <input
                                type="number"
                                placeholder="组数"
                                value={item.sets ?? ""}
                                onChange={(event) => updateItem(index, { sets: event.target.value ? numeric(event.target.value) : undefined })}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                              />
                              <input
                                type="number"
                                placeholder="次数"
                                value={item.reps ?? ""}
                                onChange={(event) => updateItem(index, { reps: event.target.value ? numeric(event.target.value) : undefined })}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                              />
                              <input
                                type="number"
                                placeholder="重量 kg"
                                value={item.weightKg ?? ""}
                                onChange={(event) => updateItem(index, { weightKg: event.target.value ? numeric(event.target.value) : undefined })}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                              />
                              <select
                                value={item.intensity ?? draft.intensity}
                                onChange={(event) => updateItem(index, { intensity: clampIntensity(event.target.value) })}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                              >
                                {[1, 2, 3, 4, 5].map((value) => (
                                  <option key={value} value={value}>
                                    强度 {value} · {intensityLabel(value)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <label className="block">
                    <FieldLabel>需要确认</FieldLabel>
                    <textarea
                      value={draft.uncertainItems.join("\n")}
                      onChange={(event) =>
                        updateDraft(
                          "uncertainItems",
                          event.target.value
                            .split("\n")
                            .map((item) => item.trim())
                            .filter(Boolean)
                        )
                      }
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>

                  <button
                    onClick={saveExercise}
                    disabled={isSaving}
                    className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:bg-slate-300"
                  >
                    {isSaving ? "保存中..." : "确认并保存运动记录"}
                  </button>
                </div>
              )}
              {status ? <p className="mt-4 text-sm font-semibold text-slate-600">{status}</p> : null}
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-black text-slate-950">今日记录</h2>
              <div className="mt-4 space-y-3">
                {logs.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 p-6 text-center text-sm leading-6 text-slate-500">
                    今天还没有运动记录。可以先用快速模板，或让 AI 根据描述生成。
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-black text-slate-950">{log.title}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {log.time} · {typeLabels[log.type]} · {sourceLabel(log.source)}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteExercise(log)}
                          className="shrink-0 rounded px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                        >
                          删除
                        </button>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-slate-600">
                        <span className="rounded-lg bg-slate-50 px-2 py-2">{log.durationMin} 分钟</span>
                        <span className="rounded-lg bg-orange-50 px-2 py-2 text-orange-700">{log.caloriesKcal} 千卡</span>
                        <span className="rounded-lg bg-emerald-50 px-2 py-2 text-emerald-700">强度 {log.intensity}</span>
                      </div>
                      {log.items.length > 0 ? (
                        <div className="mt-3 space-y-1 rounded-lg bg-slate-50 p-2">
                          {log.items.slice(0, 3).map((item, index) => (
                            <div key={`${log.id}-${item.name}-${index}`} className="flex justify-between gap-3 text-xs text-slate-600">
                              <span className="truncate">{item.name}</span>
                              <span className="shrink-0 font-bold">{item.durationMin ? `${item.durationMin} 分钟` : categoryLabels[item.category]}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-orange-100 bg-orange-50 p-5">
              <h2 className="text-base font-black text-orange-900">校正方案</h2>
              <div className="mt-3 space-y-3 text-sm leading-6 text-orange-900/80">
                <p>识别错运动类型：直接改“运动类型”和名称。</p>
                <p>热量不准：以设备截图为准，或手动覆盖千卡。</p>
                <p>动作漏了：在“运动明细”里添加动作、组数、次数、重量。</p>
                <p>强度主观：用 1-5 滑杆记录当天真实体感。</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
