export const dynamic = "force-dynamic";

type ExerciseType = "walking" | "running" | "strength" | "cardio" | "stretch" | "sport" | "mixed" | "other";
type ExerciseCategory = "strength" | "cardio" | "mobility" | "sport" | "other";

type ExerciseEstimate = {
  title: string;
  type: ExerciseType;
  durationMin: number;
  intensity: 1 | 2 | 3 | 4 | 5;
  caloriesKcal: number;
  items: Array<{
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
  }>;
  confidence: number;
  uncertainItems: string[];
  note: string;
};

type AiProvider = "openai-compatible" | "ollama";

const fallbackEstimate: ExerciseEstimate = {
  title: "待确认运动",
  type: "other",
  durationMin: 30,
  intensity: 3,
  caloriesKcal: 120,
  items: [
    {
      name: "待确认运动",
      category: "other",
      durationMin: 30,
      caloriesKcal: 120,
      intensity: 3,
      confidence: 0
    }
  ],
  confidence: 0,
  uncertainItems: ["运动类型", "持续时间", "强度", "热量消耗"],
  note: "AI 未完成估算，请根据实际训练内容修正。"
};

const exerciseJsonInstruction =
  "你是个人运动记录助手。只返回一个 JSON 对象，不要返回 Markdown 或解释文字。全部使用简体中文填写字段值，JSON 字段名保持英文。" +
  "根据用户描述估算运动记录，只能输出运动类型、持续时间、主观强度、热量消耗、可确认项目和不确定项。" +
  "不得输出医疗诊断、治疗建议、疾病判断、药物或剂量建议，也不要做伤病诊断或康复处方。" +
  "必须返回字段：title, type, durationMin, intensity, caloriesKcal, items, confidence, uncertainItems, note。" +
  "type 只能是 walking, running, strength, cardio, stretch, sport, mixed, other。" +
  "intensity 使用 1 到 5：1 很轻松，3 中等，5 很高强度。confidence 使用 0 到 1。" +
  "items 数组字段：name, category, durationMin, distanceKm, sets, reps, weightKg, caloriesKcal, intensity, confidence。" +
  "category 只能是 strength, cardio, mobility, sport, other。热量是估算值，uncertainItems 必须列出缺少时间、距离、重量、组数或强度等需要用户确认的项。";

function getApiKey() {
  return (
    process.env.EXERCISE_AI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_COMPATIBLE_API_KEY ||
    process.env.AI_API_KEY ||
    ""
  );
}

function getBaseUrl() {
  return (process.env.EXERCISE_AI_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
    /\/$/,
    ""
  );
}

function getModel() {
  return process.env.EXERCISE_AI_MODEL || process.env.OPENAI_MODEL || process.env.AI_MODEL || "gpt-4o-mini";
}

function getProvider(): AiProvider {
  const value = (process.env.EXERCISE_AI_PROVIDER || process.env.VISION_PROVIDER || process.env.AI_PROVIDER || "")
    .trim()
    .toLowerCase();
  if (value === "ollama" || value === "local") return "ollama";
  return "openai-compatible";
}

function getOllamaBaseUrl() {
  return (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
}

function getOllamaModel() {
  return process.env.EXERCISE_OLLAMA_MODEL || process.env.OLLAMA_TEXT_MODEL || process.env.OLLAMA_MODEL || "qwen2.5:7b";
}

function numberInRange(value: unknown, fallback: number, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number * 10) / 10));
}

function confidence(value: unknown) {
  return numberInRange(value, 0, 0, 1);
}

function intensity(value: unknown): 1 | 2 | 3 | 4 | 5 {
  return Math.round(numberInRange(value, 3, 1, 5)) as 1 | 2 | 3 | 4 | 5;
}

function strings(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function typeValue(value: unknown): ExerciseType {
  const allowed: ExerciseType[] = ["walking", "running", "strength", "cardio", "stretch", "sport", "mixed", "other"];
  return allowed.includes(value as ExerciseType) ? (value as ExerciseType) : "other";
}

function categoryValue(value: unknown): ExerciseCategory {
  const allowed: ExerciseCategory[] = ["strength", "cardio", "mobility", "sport", "other"];
  return allowed.includes(value as ExerciseCategory) ? (value as ExerciseCategory) : "other";
}

function optionalNumber(value: unknown, min: number, max: number) {
  if (value === undefined || value === null || value === "") return undefined;
  return numberInRange(value, 0, min, max);
}

function normalizeEstimate(value: unknown): ExerciseEstimate {
  if (typeof value !== "object" || value === null) return fallbackEstimate;
  const data = value as Record<string, unknown>;
  const items = Array.isArray(data.items)
    ? data.items
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map((item) => ({
          name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : "待确认运动",
          category: categoryValue(item.category),
          durationMin: optionalNumber(item.durationMin, 0, 1440),
          distanceKm: optionalNumber(item.distanceKm, 0, 500),
          sets: optionalNumber(item.sets, 0, 200),
          reps: optionalNumber(item.reps, 0, 10000),
          weightKg: optionalNumber(item.weightKg, 0, 1000),
          caloriesKcal: optionalNumber(item.caloriesKcal, 0, 10000),
          intensity: item.intensity === undefined ? undefined : intensity(item.intensity),
          confidence: confidence(item.confidence)
        }))
    : [];

  const normalizedItems = items.length > 0 ? items : fallbackEstimate.items;
  const durationMin = numberInRange(data.durationMin, normalizedItems[0]?.durationMin ?? 30, 1, 1440);
  const caloriesKcal = numberInRange(data.caloriesKcal, normalizedItems[0]?.caloriesKcal ?? 0, 0, 10000);
  const uncertainItems = strings(data.uncertainItems);

  return {
    title:
      typeof data.title === "string" && data.title.trim()
        ? data.title.trim()
        : normalizedItems.map((item) => item.name).join(" + "),
    type: typeValue(data.type),
    durationMin,
    intensity: intensity(data.intensity),
    caloriesKcal,
    items: normalizedItems,
    confidence: confidence(data.confidence),
    uncertainItems: uncertainItems.length > 0 ? uncertainItems : ["请确认运动时长、强度和热量估算"],
    note: typeof data.note === "string" ? data.note.trim() : ""
  };
}

function parseJsonContent(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI 返回内容不是有效 JSON。");
    return JSON.parse(match[0]);
  }
}

function textFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part === "object" && part !== null && typeof (part as Record<string, unknown>).text === "string") {
          return String((part as Record<string, unknown>).text);
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function extractModelText(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) return "";
  const data = payload as Record<string, unknown>;
  if (typeof data.response === "string") return data.response;
  if (typeof data.output_text === "string") return data.output_text;

  const choices = data.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0] as Record<string, unknown>;
    if (typeof first.text === "string") return first.text;
    const message = first.message as Record<string, unknown> | undefined;
    return textFromContent(message?.content);
  }

  return textFromContent(data.content);
}

function errorMessageFromPayload(payload: unknown, fallback: string) {
  if (typeof payload !== "object" || payload === null) return fallback;
  const data = payload as Record<string, unknown>;
  if (typeof data.error === "string" && data.error.trim()) return data.error.trim();
  if (
    typeof data.error === "object" &&
    data.error !== null &&
    typeof (data.error as Record<string, unknown>).message === "string"
  ) {
    return String((data.error as Record<string, unknown>).message);
  }
  return fallback;
}

async function analyzeWithOllama(text: string) {
  const response = await fetch(`${getOllamaBaseUrl()}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: getOllamaModel(),
      prompt: `${exerciseJsonInstruction}\n\n用户运动描述：${text}`,
      stream: false,
      format: "json",
      options: { temperature: 0.1 }
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(errorMessageFromPayload(payload, `本地 Ollama 分析失败，请确认模型可用：${getOllamaModel()}`));
  }

  const content = extractModelText(payload);
  if (!content) throw new Error(`本地 Ollama 模型没有返回估算文本，请确认模型可用：${getOllamaModel()}`);
  return normalizeEstimate(parseJsonContent(content));
}

async function analyzeWithOpenAiCompatible(text: string) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      configured: false,
      provider: "openai-compatible" as AiProvider,
      estimate: fallbackEstimate,
      error: "未配置 AI API key。可使用本地 Ollama，或设置 OPENAI_API_KEY/OPENAI_COMPATIBLE_API_KEY。"
    };
  }

  const response = await fetch(`${getBaseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: getModel(),
      temperature: 0.1,
      max_tokens: 900,
      messages: [
        { role: "system", content: exerciseJsonInstruction },
        { role: "user", content: text }
      ]
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    return {
      configured: true,
      provider: "openai-compatible" as AiProvider,
      estimate: fallbackEstimate,
      error: errorMessageFromPayload(payload, "AI 分析请求失败。")
    };
  }

  const content = extractModelText(payload);
  if (!content) throw new Error("AI 模型没有返回估算文本。");
  return {
    configured: true,
    provider: "openai-compatible" as AiProvider,
    estimate: normalizeEstimate(parseJsonContent(content))
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: unknown };
    if (typeof body.text !== "string" || body.text.trim().length < 2) {
      return Response.json({ configured: true, provider: getProvider(), estimate: fallbackEstimate, error: "请输入运动描述。" }, { status: 400 });
    }

    const text = body.text.trim().slice(0, 2000);
    const provider = getProvider();

    if (provider === "ollama") {
      return Response.json({ configured: true, provider, estimate: await analyzeWithOllama(text) });
    }

    return Response.json(await analyzeWithOpenAiCompatible(text));
  } catch (error) {
    const provider = getProvider();
    return Response.json(
      {
        configured: provider === "ollama" || Boolean(getApiKey()),
        provider,
        estimate: fallbackEstimate,
        error: error instanceof Error ? error.message : "AI 分析失败。"
      },
      { status: 400 }
    );
  }
}
