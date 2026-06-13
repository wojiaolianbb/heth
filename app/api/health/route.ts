export const dynamic = "force-dynamic";

export async function GET() {
  const provider = process.env.VISION_PROVIDER || "none";
  const ollamaUrl = process.env.OLLAMA_BASE_URL || "";
  const hasOpenAI = Boolean(
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_COMPATIBLE_API_KEY ||
    process.env.VISION_API_KEY
  );

  let ollamaStatus = "unconfigured";
  let ollamaModel = "";

  // 检查 Ollama 连接
  if (provider === "ollama" && ollamaUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${ollamaUrl}/api/tags`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        ollamaStatus = "connected";
        const data = await response.json();
        const models = data.models || [];
        const visionModel = process.env.OLLAMA_MODEL || "qwen2.5vl:7b";
        ollamaModel = models.find((m: any) => m.name === visionModel)
          ? visionModel
          : models[0]?.name || "none";
      } else {
        ollamaStatus = `error_${response.status}`;
      }
    } catch (error) {
      ollamaStatus = error instanceof Error && error.name === 'AbortError'
        ? "timeout"
        : "unreachable";
    }
  }

  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    config: {
      provider,
      ollama: {
        configured: provider === "ollama",
        status: ollamaStatus,
        url: ollamaUrl ? ollamaUrl.replace(/https?:\/\//, "") : "",
        model: ollamaModel
      },
      openai: {
        configured: hasOpenAI,
        model: process.env.OPENAI_MODEL || process.env.VISION_MODEL || "gpt-4o-mini"
      }
    },
    recommendation:
      ollamaStatus === "connected"
        ? "Ollama 连接正常，AI 分析功能可用"
        : hasOpenAI
        ? "Ollama 不可用，将使用云端 OpenAI API"
        : "AI 分析不可用，请配置 Ollama 或 OpenAI"
  });
}
