export const dynamic = "force-dynamic";

type NutritionEstimate = {
  foodName: string;
  foods: Array<{
    name: string;
    portionAssumption: string;
    caloriesKcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    confidence: number;
  }>;
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

type VisionProvider = "openai-compatible" | "ollama";

const nutritionJsonInstruction =
  "你是个人饮食记录助手。只返回一个 JSON 对象，不要返回 Markdown 或解释文字。全部使用简体中文填写字段值，JSON 字段名保持英文。 " +
  "根据餐食照片逐项识别所有可见食物组成，包括主食、蔬菜、鸡蛋、肉类、豆制品、汤、酱汁和可见油脂。 " +
  "除非照片里确实是一道混合菜，否则不要把整盘食物合并成一个 food。 " +
  "每个 food 都要给出可校正的日常份量假设，例如一碗、半碗、一个鸡蛋、约 100g、约 150g 熟重。 " +
  "只做食物识别和营养估算，不输出医学结论、治疗建议、疾病判断、药物或剂量建议。 " +
  "必须返回字段：foodName, foods[{name, portionAssumption, caloriesKcal, proteinG, carbsG, fatG, confidence}], " +
  "totals{caloriesKcal, proteinG, carbsG, fatG}, confidence, portionAssumptions, uncertainItems。 " +
  "confidence 使用 0 到 1。uncertainItems 必须列出看不清、份量不确定、隐藏配料、酱汁或用油的不确定项。";

const fallbackEstimate: NutritionEstimate = {
  foodName: "待确认餐食",
  foods: [
    {
      name: "待确认食物",
      portionAssumption: "请根据照片和实际份量手动修正",
      caloriesKcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      confidence: 0
    }
  ],
  totals: {
    caloriesKcal: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0
  },
  confidence: 0,
  portionAssumptions: ["未完成 AI 估算，请手动填写或配置 AI key 后重试"],
  uncertainItems: ["食物名称", "份量", "营养估算"]
};

function getApiKey() {
  return (
    process.env.VISION_API_KEY ||
    process.env.NUTRITION_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_COMPATIBLE_API_KEY ||
    process.env.AI_API_KEY ||
    ""
  );
}

function getBaseUrl() {
  return (
    process.env.VISION_BASE_URL ||
    process.env.NUTRITION_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    "https://api.openai.com/v1"
  ).replace(/\/$/, "");
}

function getModel() {
  return (
    process.env.VISION_MODEL ||
    process.env.NUTRITION_MODEL ||
    process.env.OPENAI_MODEL ||
    process.env.AI_MODEL ||
    "gpt-4o-mini"
  );
}

function getProvider(): VisionProvider {
  const value = (
    process.env.VISION_PROVIDER ||
    process.env.NUTRITION_PROVIDER ||
    process.env.AI_PROVIDER ||
    ""
  )
    .trim()
    .toLowerCase();

  if (value === "ollama" || value === "local") return "ollama";
  return "openai-compatible";
}

function getOllamaBaseUrl() {
  return (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
}

function getOllamaModel() {
  return process.env.OLLAMA_MODEL || process.env.VISION_MODEL || "qwen2.5vl:7b";
}

function imageDataUrlToBase64(imageDataUrl: string) {
  return imageDataUrl.split(",", 2)[1] || "";
}

function assertImageDataUrl(value: unknown) {
  if (typeof value !== "string" || !/^data:image\/(png|jpe?g|webp);base64,/.test(value)) {
    throw new Error("请上传 png、jpg 或 webp 餐食照片。");
  }

  if (value.length > 8_000_000) {
    throw new Error("照片过大，请压缩到约 6MB 以内后重试。");
  }

  return value;
}

function numberOrZero(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 10) / 10 : 0;
}

function confidence(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, Math.round(number * 100) / 100));
}

function strings(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function textFromContentPart(part: unknown): string {
  if (typeof part === "string") return part;
  if (typeof part !== "object" || part === null) return "";

  const value = part as Record<string, unknown>;
  if (typeof value.text === "string") return value.text;
  if (typeof value.content === "string") return value.content;
  if (
    typeof value.text === "object" &&
    value.text !== null &&
    typeof (value.text as Record<string, unknown>).value === "string"
  ) {
    return String((value.text as Record<string, unknown>).value);
  }

  return "";
}

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map(textFromContentPart).filter(Boolean).join("\n");
  }
  if (typeof content === "object" && content !== null) {
    return JSON.stringify(content);
  }
  return "";
}

function extractModelText(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) return "";

  const data = payload as Record<string, unknown>;
  if (typeof data.output_text === "string") return data.output_text;

  const choices = data.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0] as Record<string, unknown>;
    if (typeof first.text === "string") return first.text;

    const message = first.message as Record<string, unknown> | undefined;
    const messageText = contentToText(message?.content);
    if (messageText) return messageText;

    const delta = first.delta as Record<string, unknown> | undefined;
    const deltaText = contentToText(delta?.content);
    if (deltaText) return deltaText;
  }

  const output = data.output;
  if (Array.isArray(output)) {
    return output
      .map((item) => {
        const outputItem = item as Record<string, unknown>;
        return contentToText(outputItem.content);
      })
      .filter(Boolean)
      .join("\n");
  }

  return contentToText(data.content);
}

function unwrapProviderPayload(payload: unknown): unknown {
  if (typeof payload !== "object" || payload === null) return payload;

  const data = payload as Record<string, unknown>;
  if (data.data) {
    if (typeof data.data === "string") {
      try {
        return JSON.parse(data.data);
      } catch {
        return data.data;
      }
    }

    return data.data;
  }

  if (typeof data.msg === "string" && data.msg.trim()) {
    throw new Error(data.msg.trim());
  }

  if (
    typeof data.error === "object" &&
    data.error !== null &&
    typeof (data.error as Record<string, unknown>).message === "string"
  ) {
    throw new Error(String((data.error as Record<string, unknown>).message));
  }

  return payload;
}

function normalizeEstimate(value: unknown): NutritionEstimate {
  if (typeof value !== "object" || value === null) {
    return fallbackEstimate;
  }

  const data = value as {
    foodName?: unknown;
    foods?: unknown;
    totals?: unknown;
    confidence?: unknown;
    portionAssumptions?: unknown;
    uncertainItems?: unknown;
  };

  const foods = Array.isArray(data.foods)
    ? data.foods.map((item) => {
        const food = item as Record<string, unknown>;
        return {
          name: typeof food.name === "string" ? food.name : "待确认食物",
          portionAssumption:
            typeof food.portionAssumption === "string"
              ? food.portionAssumption
              : "需要确认份量",
          caloriesKcal: numberOrZero(food.caloriesKcal),
          proteinG: numberOrZero(food.proteinG),
          carbsG: numberOrZero(food.carbsG),
          fatG: numberOrZero(food.fatG),
          confidence: confidence(food.confidence)
        };
      })
    : [];

  const totals = data.totals as Record<string, unknown> | undefined;
  const normalizedFoods = foods.length > 0 ? foods : fallbackEstimate.foods;
  const portionAssumptions = strings(data.portionAssumptions);
  const uncertainItems = strings(data.uncertainItems);

  return {
    foodName:
      typeof data.foodName === "string" && data.foodName.trim()
        ? data.foodName.trim()
        : normalizedFoods.map((food) => food.name).join("、"),
    foods: normalizedFoods,
    totals: {
      caloriesKcal: numberOrZero(totals?.caloriesKcal),
      proteinG: numberOrZero(totals?.proteinG),
      carbsG: numberOrZero(totals?.carbsG),
      fatG: numberOrZero(totals?.fatG)
    },
    confidence: confidence(data.confidence),
    portionAssumptions:
      portionAssumptions.length > 0
        ? portionAssumptions
        : normalizedFoods.map((food) => food.portionAssumption),
    uncertainItems: uncertainItems.length > 0 ? uncertainItems : ["请确认食物名称和份量"]
  };
}

function parseJsonContent(content: string) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("AI 返回内容不是有效 JSON。");
    }
    return JSON.parse(match[0]);
  }
}

function extractOllamaText(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) return "";

  const data = payload as Record<string, unknown>;
  if (typeof data.response === "string") return data.response;

  const message = data.message as Record<string, unknown> | undefined;
  return contentToText(message?.content);
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
  const ollamaUrl = getOllamaBaseUrl();
  const timeout = 30000; // 30秒超时

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: getOllamaModel(),
        prompt: nutritionJsonInstruction,
        images: [imageDataUrlToBase64(imageDataUrl)],
        stream: false,
        format: "json",
        options: {
          temperature: 0.1
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(
        errorMessageFromPayload(
          payload,
          `本地 Ollama 分析失败（${response.status}）。请确认 Ollama 正在运行且已安装模型：ollama pull ${getOllamaModel()}`
        )
      );
    }

    const content = extractOllamaText(payload);
    if (!content) {
      throw new Error(`本地 Ollama 模型没有返回估算文本。请确认已安装视觉模型：ollama pull ${getOllamaModel()}`);
    }

    return normalizeEstimate(parseJsonContent(content));
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Ollama 请求超时（${timeout / 1000}秒）。请检查网络连接或 Ollama 服务状态。`);
    }
    throw error;
  }
}

async function analyzeWithOpenAICompatible(imageDataUrl: string) {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("未配置 OpenAI API key。请设置 OPENAI_API_KEY 或 OPENAI_COMPATIBLE_API_KEY。");
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
        {
          role: "system",
          content:
            "你是个人饮食记录助手。只做照片中食物识别和营养估算，不输出医学结论、治疗建议、疾病判断、药物或剂量建议。只返回一个 JSON 对象，不要返回 Markdown。"
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "识别餐食照片，估算食物、份量、热量、蛋白质、碳水、脂肪、可信度。返回字段：foodName, foods[{name, portionAssumption, caloriesKcal, proteinG, carbsG, fatG, confidence}], totals{caloriesKcal, proteinG, carbsG, fatG}, confidence, portionAssumptions, uncertainItems。"
            },
            {
              type: "image_url",
              image_url: { url: imageDataUrl }
            }
          ]
        }
      ]
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || `OpenAI API 请求失败（${response.status}）`);
  }

  const providerPayload = unwrapProviderPayload(payload);
  const content = extractModelText(providerPayload);
  if (!content) {
    throw new Error("AI 模型没有返回估算文本。请确认当前模型支持图片输入。");
  }

  return normalizeEstimate(parseJsonContent(content));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { imageDataUrl?: unknown };
    const imageDataUrl = assertImageDataUrl(body.imageDataUrl);
    const provider = getProvider();
    const hasCloudApiKey = Boolean(getApiKey());

    // 策略：优先尝试本地 Ollama，失败时降级到云端
    if (provider === "ollama") {
      try {
        const estimate = await analyzeWithOllama(imageDataUrl);
        return Response.json({
          configured: true,
          provider: "ollama",
          estimate
        });
      } catch (ollamaError) {
        // Ollama 失败，尝试降级到云端
        if (hasCloudApiKey) {
          console.warn("Ollama 失败，降级到云端 API:", ollamaError);
          try {
            const estimate = await analyzeWithOpenAICompatible(imageDataUrl);
            return Response.json({
              configured: true,
              provider: "openai-compatible (fallback)",
              estimate,
              warning: "本地 Ollama 不可用，已使用云端 API 分析"
            });
          } catch (cloudError) {
            // 两者都失败
            return Response.json(
              {
                configured: true,
                provider: "none",
                estimate: fallbackEstimate,
                error: `本地和云端 AI 均失败。Ollama: ${ollamaError instanceof Error ? ollamaError.message : String(ollamaError)}。云端: ${cloudError instanceof Error ? cloudError.message : String(cloudError)}`
              },
              { status: 502 }
            );
          }
        }

        // 只配置了 Ollama，没有云端备用
        return Response.json(
          {
            configured: true,
            provider: "ollama",
            estimate: fallbackEstimate,
            error: ollamaError instanceof Error ? ollamaError.message : "Ollama 分析失败"
          },
          { status: 502 }
        );
      }
    }

    // 直接使用云端 API
    if (!hasCloudApiKey) {
      return Response.json(
        {
          configured: false,
          estimate: fallbackEstimate,
          error: "未配置 AI。请设置 VISION_PROVIDER=ollama 使用本地模型，或设置 OPENAI_API_KEY 使用云端。"
        },
        { status: 200 }
      );
    }

    const estimate = await analyzeWithOpenAICompatible(imageDataUrl);
    return Response.json({
      configured: true,
      provider: "openai-compatible",
      estimate
    });

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
