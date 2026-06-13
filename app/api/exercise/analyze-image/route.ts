export const dynamic = "force-dynamic";

type ExerciseType = "walking" | "running" | "strength" | "cardio" | "stretch" | "sport" | "mixed" | "other";
type ExerciseCategory = "strength" | "cardio" | "mobility" | "sport" | "other";
type VisionProvider = "openai-compatible" | "ollama";

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

const fallbackEstimate: ExerciseEstimate = {
  title: "待确认运动截图",
  type: "other",
  durationMin: 30,
  intensity: 3,
  caloriesKcal: 120,
  items: [
    {
      name: "截图中的运动记录",
      category: "other",
      durationMin: 30,
      caloriesKcal: 120,
      intensity: 3,
      confidence: 0
    }
  ],
  confidence: 0,
  uncertainItems: ["截图文字", "运动类型", "消耗热量", "运动强度"],
  note: "AI 未完成截图识别，请按截图内容手动修正。"
};

const exerciseImageInstruction =
  "你是个人运动记录助手。只返回一个 JSON 对象，不要返回 Markdown 或解释文字。全部使用简体中文填写字段值，JSON 字段名保持英文。" +
  "根据运动 App 截图、手表截图、跑步机/椭圆机/划船机面板照片或训练记录照片，提取和估算一条运动记录。" +
  "优先读取截图中明确出现的运动类型、时长、距离、配速、热量、心率、组数、次数、重量；缺失项只做保守估算。" +
  "不得输出医疗诊断、治疗建议、疾病判断、药物或剂量建议，也不要做伤病诊断或康复处方。" +
  "必须返回字段：title, type, durationMin, intensity, caloriesKcal, items, confidence, uncertainItems, note。" +
  "type 只能是 walking, running, strength, cardio, stretch, sport, mixed, other。intensity 使用 1 到 5，confidence 使用 0 到 1。" +
  "items 数组字段：name, category, durationMin, distanceKm, sets, reps, weightKg, caloriesKcal, intensity, confidence。" +
  "category 只能是 strength, cardio, mobility, sport, other。uncertainItems 必须列出看不清、被遮挡、单位不确定或需要用户确认的项。";

function getApiKey() {
  return (
    process.env.EXERCISE_VISION_API_KEY ||
    process.env.VISION_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_COMPATIBLE_API_KEY ||
    process.env.AI_API_KEY ||
    ""
  );
}

function getBaseUrl() {
  return (process.env.EXERCISE_VISION_BASE_URL || process.env.VISION_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
}

function getModel() {
  return process.env.EXERCISE_VISION_MODEL || process.env.VISION_MODEL || process.env.OPENAI_MODEL || process.env.AI_MODEL || "gpt-4o-mini";
}

function getProvider(): VisionProvider {
  const value = (process.env.EXERCISE_VISION_PROVIDER || process.env.VISION_PROVIDER || process.env.AI_PROVIDER || "")
    .trim()
    .toLowerCase();
  if (value === "ollama" || value === "local") return "ollama";
  return "openai-compatible";
}

function getOllamaBaseUrl() {
  return (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
}

function getOllamaModel() {
  return process.env.EXERCISE_VISION_OLLAMA_MODEL || process.env.OLLAMA_MODEL || process.env.VISION_MODEL || "qwen2.5vl:7b";
}

function assertImageDataUrl(value: unknown) {
  if (typeof value !== "string" || !/^data:image\/(png|jpe?g|webp);base64,/.test(value)) {
    throw new Error("请上传 png、jpg 或 webp 运动截图。");
  }
  if (value.length > 8_000_000) throw new Error("图片过大，请压缩到约 6MB 以内后重试。");
  return value;
}

function imageDataUrlToBase64(imageDataUrl: string) {
  return imageDataUrl.split(",", 2)[1] || "";
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
          name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : "截图中的运动记录",
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
  const uncertainItems = strings(data.uncertainItems);

  return {
    title:
      typeof data.title === "string" && data.title.trim()
        ? data.title.trim()
        : normalizedItems.map((item) => item.name).join(" + "),
    type: typeValue(data.type),
    durationMin: numberInRange(data.durationMin, normalizedItems[0]?.durationMin ?? 30, 1, 1440),
    intensity: intensity(data.intensity),
    caloriesKcal: numberInRange(data.caloriesKcal, normalizedItems[0]?.caloriesKcal ?? 0, 0, 10000),
    items: normalizedItems,
    confidence: confidence(data.confidence),
    uncertainItems: uncertainItems.length > 0 ? uncertainItems : ["请确认截图内容、时长、强度和热量估算"],
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

function textFromContentPart(part: unknown): string {
  if (typeof part === "string") return part;
  if (typeof part !== "object" || part === null) return "";
  const value = part as Record<string, unknown>;
  if (typeof value.text === "string") return value.text;
  if (typeof value.content === "string") return value.content;
  return "";
}

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(textFromContentPart).filter(Boolean).join("\n");
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
    return contentToText(message?.content);
  }

  return contentToText(data.content);
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

async function analyzeWithOllama(imageDataUrl: string) {
  const response = await fetch(`${getOllamaBaseUrl()}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: getOllamaModel(),
      prompt: exerciseImageInstruction,
      images: [imageDataUrlToBase64(imageDataUrl)],
      stream: false,
      format: "json",
      options: { temperature: 0.1 }
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(errorMessageFromPayload(payload, `本地 Ollama 截图分析失败，请确认视觉模型可用：${getOllamaModel()}`));
  }

  const content = extractModelText(payload);
  if (!content) throw new Error(`本地 Ollama 模型没有返回估算文本，请确认视觉模型可用：${getOllamaModel()}`);
  return normalizeEstimate(parseJsonContent(content));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { imageDataUrl?: unknown };
    const imageDataUrl = assertImageDataUrl(body.imageDataUrl);
    const provider = getProvider();

    if (provider === "ollama") {
      return Response.json({ configured: true, provider, estimate: await analyzeWithOllama(imageDataUrl) });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return Response.json({
        configured: false,
        provider,
        estimate: fallbackEstimate,
        error: "未配置 AI API key。可使用本地 Ollama，或设置 OPENAI_API_KEY/OPENAI_COMPATIBLE_API_KEY。"
      });
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
          { role: "system", content: exerciseImageInstruction },
          {
            role: "user",
            content: [
              { type: "text", text: "请识别这张运动记录截图或设备面板照片，并返回结构化 JSON。" },
              { type: "image_url", image_url: { url: imageDataUrl } }
            ]
          }
        ]
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      return Response.json(
        {
          configured: true,
          provider,
          estimate: fallbackEstimate,
          error: errorMessageFromPayload(payload, "AI 截图分析请求失败。")
        },
        { status: 502 }
      );
    }

    const content = extractModelText(payload);
    if (!content) throw new Error("AI 模型没有返回估算文本。请确认当前模型支持图片输入。");
    return Response.json({ configured: true, provider, estimate: normalizeEstimate(parseJsonContent(content)) });
  } catch (error) {
    const provider = getProvider();
    return Response.json(
      {
        configured: provider === "ollama" || Boolean(getApiKey()),
        provider,
        estimate: fallbackEstimate,
        error: error instanceof Error ? error.message : "AI 截图分析失败。"
      },
      { status: 400 }
    );
  }
}
