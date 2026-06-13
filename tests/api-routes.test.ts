import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

process.env.HEALTH_DATA_FILE = join(mkdtempSync(join(tmpdir(), "heth-api-")), "store.json");

test("topics API returns dynamic seed topics", async () => {
  const { GET } = await import("../app/api/topics/route.ts");
  const response = await GET();
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(Array.isArray(body.topics), true);
  assert.equal(body.topics.some((topic: { slug: string }) => topic.slug === "sleep"), true);
});

test("habits API creates a validated dynamic habit", async () => {
  const { POST } = await import("../app/api/habits/route.ts");
  const response = await POST(
    new Request("http://localhost/api/habits", {
      method: "POST",
      body: JSON.stringify({
        id: "morning-mobility",
        label: "晨间活动准备",
        active: true
      })
    })
  );
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.habit.id, "morning-mobility");
});

test("checkins API writes booleans and returns a dynamic 7-day review", async () => {
  const habitsRoute = await import("../app/api/habits/route.ts");
  const checkinsRoute = await import("../app/api/checkins/route.ts");
  const habitsResponse = await habitsRoute.GET();
  const { habits } = await habitsResponse.json();
  const state = Object.fromEntries(habits.map((habit: { id: string }) => [habit.id, true]));

  const writeResponse = await checkinsRoute.POST(
    new Request("http://localhost/api/checkins", {
      method: "POST",
      body: JSON.stringify({
        dateKey: "checkin-2026-06-07",
        state
      })
    })
  );
  const writeBody = await writeResponse.json();

  assert.equal(writeResponse.status, 201);
  assert.equal(
    Object.values(writeBody.state).every((value) => typeof value === "boolean"),
    true
  );

  const reviewResponse = await checkinsRoute.GET(
    new Request("http://localhost/api/checkins?days=7&endDate=2026-06-07")
  );
  const reviewBody = await reviewResponse.json();

  assert.equal(reviewResponse.status, 200);
  assert.equal(reviewBody.history.days.length, 7);
  assert.equal(reviewBody.history.currentStreak, 1);
});

test("data API exports and imports the dynamic snapshot", async () => {
  const { GET, POST } = await import("../app/api/data/route.ts");
  const exportResponse = await GET();
  const exported = await exportResponse.json();

  assert.equal(exportResponse.status, 200);
  assert.equal(exported.snapshot.version, 1);

  const importedSnapshot = {
    ...exported.snapshot,
    topics: [
      ...exported.snapshot.topics,
      {
        id: "training-basics",
        title: "训练基础",
        slug: "training-basics",
        summary: "围绕力量、活动和恢复的一般信息。",
        intro: "训练可以从稳定、可持续的基础动作和恢复节奏开始。",
        suggestions: ["记录训练前后的主观感受。"],
        cautions: ["避免突然增加过高强度。"]
      }
    ]
  };

  const importResponse = await POST(
    new Request("http://localhost/api/data", {
      method: "POST",
      body: JSON.stringify({ snapshot: importedSnapshot })
    })
  );
  const importBody = await importResponse.json();

  assert.equal(importResponse.status, 200);
  assert.equal(
    importBody.snapshot.topics.some((topic: { slug: string }) => topic.slug === "training-basics"),
    true
  );
});

test("settings API updates public configuration and rejects disclaimer drift", async () => {
  const { GET, POST } = await import("../app/api/settings/route.ts");
  const getResponse = await GET();
  const { settings } = await getResponse.json();

  assert.equal(getResponse.status, 200);
  assert.equal(settings.siteName.length > 0, true);

  const updateResponse = await POST(
    new Request("http://localhost/api/settings", {
      method: "POST",
      body: JSON.stringify({
        ...settings,
        siteName: "身体建设日志"
      })
    })
  );
  const updateBody = await updateResponse.json();

  assert.equal(updateResponse.status, 200);
  assert.equal(updateBody.settings.siteName, "身体建设日志");

  const driftResponse = await POST(
    new Request("http://localhost/api/settings", {
      method: "POST",
      body: JSON.stringify({
        ...settings,
        disclaimer: "错误免责声明"
      })
    })
  );

  assert.equal(driftResponse.status, 400);
});

test("meal photo analysis can use local Ollama vision without an API key", async () => {
  const previousProvider = process.env.VISION_PROVIDER;
  const previousModel = process.env.OLLAMA_MODEL;
  const previousBaseUrl = process.env.OLLAMA_BASE_URL;
  const previousOpenAiKey = process.env.OPENAI_API_KEY;
  const previousFetch = globalThis.fetch;
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];

  process.env.VISION_PROVIDER = "ollama";
  process.env.OLLAMA_MODEL = "qwen2.5vl:7b";
  process.env.OLLAMA_BASE_URL = "http://127.0.0.1:11434";
  delete process.env.OPENAI_API_KEY;

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(input),
      body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>
    });

    return Response.json({
      response: JSON.stringify({
        foodName: "test meal",
        foods: [
          {
            name: "rice",
            portionAssumption: "about 150g cooked rice",
            caloriesKcal: 195,
            proteinG: 4,
            carbsG: 43,
            fatG: 0.5,
            confidence: 0.72
          }
        ],
        totals: {
          caloriesKcal: 195,
          proteinG: 4,
          carbsG: 43,
          fatG: 0.5
        },
        confidence: 0.72,
        portionAssumptions: ["about 150g cooked rice"],
        uncertainItems: ["exact plate size"]
      })
    });
  }) as typeof fetch;

  try {
    const { POST } = await import("../app/api/meals/analyze-photo/route.ts");
    const response = await POST(
      new Request("http://localhost/api/meals/analyze-photo", {
        method: "POST",
        body: JSON.stringify({
          imageDataUrl: "data:image/jpeg;base64,Zm9v"
        })
      })
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.configured, true);
    assert.equal(body.estimate.foodName, "test meal");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://127.0.0.1:11434/api/generate");
    assert.equal(calls[0].body.model, "qwen2.5vl:7b");
    assert.match(String(calls[0].body.prompt), /全部使用简体中文/);
    assert.match(String(calls[0].body.prompt), /逐项识别所有可见食物组成/);
    assert.deepEqual(calls[0].body.images, ["Zm9v"]);
  } finally {
    if (previousProvider === undefined) delete process.env.VISION_PROVIDER;
    else process.env.VISION_PROVIDER = previousProvider;
    if (previousModel === undefined) delete process.env.OLLAMA_MODEL;
    else process.env.OLLAMA_MODEL = previousModel;
    if (previousBaseUrl === undefined) delete process.env.OLLAMA_BASE_URL;
    else process.env.OLLAMA_BASE_URL = previousBaseUrl;
    if (previousOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousOpenAiKey;
    globalThis.fetch = previousFetch;
  }
});

test("meal photo analysis reports Ollama as configured when the local service fails", async () => {
  const previousProvider = process.env.VISION_PROVIDER;
  const previousFetch = globalThis.fetch;

  process.env.VISION_PROVIDER = "ollama";

  globalThis.fetch = (async () => {
    throw new Error("connect ECONNREFUSED 127.0.0.1:11434");
  }) as typeof fetch;

  try {
    const { POST } = await import("../app/api/meals/analyze-photo/route.ts");
    const response = await POST(
      new Request("http://localhost/api/meals/analyze-photo", {
        method: "POST",
        body: JSON.stringify({
          imageDataUrl: "data:image/jpeg;base64,Zm9v"
        })
      })
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.configured, true);
    assert.equal(body.provider, "ollama");
    assert.match(body.error, /Ollama|127\.0\.0\.1:11434/);
  } finally {
    if (previousProvider === undefined) delete process.env.VISION_PROVIDER;
    else process.env.VISION_PROVIDER = previousProvider;
    globalThis.fetch = previousFetch;
  }
});

test("meals API stores analyzed food item details", async () => {
  const { POST } = await import("../app/api/meals/route.ts");
  const response = await POST(
    new Request("http://localhost/api/meals", {
      method: "POST",
      body: JSON.stringify({
        id: "meal-food-details",
        date: "2026-06-12",
        time: "12:30",
        mealType: "lunch",
        foodName: "rice and eggs",
        caloriesKcal: 500,
        proteinG: 20,
        carbsG: 90,
        fatG: 9,
        confidence: 0.9,
        foods: [
          {
            name: "rice",
            portionAssumption: "one bowl",
            caloriesKcal: 300,
            proteinG: 5,
            carbsG: 60,
            fatG: 1,
            confidence: 0.9
          }
        ],
        portionAssumptions: ["one bowl rice"],
        uncertainItems: ["oil"],
        source: "ai",
        createdAt: "2026-06-12T04:30:00.000Z"
      })
    })
  );
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.meal.foods.length, 1);
  assert.equal(body.meal.foods[0].name, "rice");
});

test("profile API stores local user profile", async () => {
  const { GET, POST } = await import("../app/api/profile/route.ts");
  const updateResponse = await POST(
    new Request("http://localhost/api/profile", {
      method: "POST",
      body: JSON.stringify({
        nickname: "LBB",
        avatarText: "L",
        heightCm: 175,
        weightKg: 70,
        goal: "health",
        activityLevel: "medium"
      })
    })
  );
  const updateBody = await updateResponse.json();

  assert.equal(updateResponse.status, 200);
  assert.equal(updateBody.profile.nickname, "LBB");
  assert.equal(updateBody.profile.heightCm, 175);

  const getResponse = await GET();
  const getBody = await getResponse.json();
  assert.equal(getBody.profile.nickname, "LBB");
});

test("exercise API stores and summarizes local exercise records", async () => {
  const { GET, POST } = await import("../app/api/exercise/route.ts");
  const exercise = {
    id: "exercise-api-test",
    date: "2026-06-12",
    time: "18:30",
    title: "running and pushups",
    type: "mixed",
    durationMin: 50,
    intensity: 4,
    caloriesKcal: 420,
    items: [
      {
        name: "running",
        category: "cardio",
        durationMin: 35,
        distanceKm: 5,
        caloriesKcal: 330,
        intensity: 4,
        confidence: 0.8
      }
    ],
    source: "manual",
    confidence: 1,
    uncertainItems: [],
    createdAt: "2026-06-12T10:30:00.000Z"
  };

  const postResponse = await POST(
    new Request("http://localhost/api/exercise", {
      method: "POST",
      body: JSON.stringify(exercise)
    })
  );
  const postBody = await postResponse.json();
  assert.equal(postResponse.status, 201);
  assert.equal(postBody.exercise.title, "running and pushups");

  const getResponse = await GET(new Request("http://localhost/api/exercise?date=2026-06-12"));
  const getBody = await getResponse.json();
  assert.equal(getResponse.status, 200);
  assert.equal(getBody.logs.some((log: { id: string }) => log.id === "exercise-api-test"), true);
  assert.equal(getBody.summary.durationMin >= 50, true);
});

test("exercise text analysis can use local Ollama without an API key", async () => {
  const previousProvider = process.env.EXERCISE_AI_PROVIDER;
  const previousModel = process.env.EXERCISE_OLLAMA_MODEL;
  const previousBaseUrl = process.env.OLLAMA_BASE_URL;
  const previousOpenAiKey = process.env.OPENAI_API_KEY;
  const previousFetch = globalThis.fetch;
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];

  process.env.EXERCISE_AI_PROVIDER = "ollama";
  process.env.EXERCISE_OLLAMA_MODEL = "qwen2.5:7b";
  process.env.OLLAMA_BASE_URL = "http://127.0.0.1:11434";
  delete process.env.OPENAI_API_KEY;

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(input),
      body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>
    });

    return Response.json({
      response: JSON.stringify({
        title: "跑步和俯卧撑",
        type: "mixed",
        durationMin: 50,
        intensity: 4,
        caloriesKcal: 420,
        items: [
          {
            name: "跑步",
            category: "cardio",
            durationMin: 35,
            distanceKm: 5,
            caloriesKcal: 330,
            intensity: 4,
            confidence: 0.82
          }
        ],
        confidence: 0.82,
        uncertainItems: ["俯卧撑组间休息"],
        note: "按描述估算"
      })
    });
  }) as typeof fetch;

  try {
    const { POST } = await import("../app/api/exercise/analyze-text/route.ts");
    const response = await POST(
      new Request("http://localhost/api/exercise/analyze-text", {
        method: "POST",
        body: JSON.stringify({ text: "跑步 5 公里 35 分钟，做俯卧撑 4 组。" })
      })
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.configured, true);
    assert.equal(body.provider, "ollama");
    assert.equal(body.estimate.title, "跑步和俯卧撑");
    assert.equal(calls[0].url, "http://127.0.0.1:11434/api/generate");
    assert.equal(calls[0].body.model, "qwen2.5:7b");
    assert.match(String(calls[0].body.prompt), /个人运动记录助手/);
    assert.match(String(calls[0].body.prompt), /不得输出医疗诊断/);
  } finally {
    if (previousProvider === undefined) delete process.env.EXERCISE_AI_PROVIDER;
    else process.env.EXERCISE_AI_PROVIDER = previousProvider;
    if (previousModel === undefined) delete process.env.EXERCISE_OLLAMA_MODEL;
    else process.env.EXERCISE_OLLAMA_MODEL = previousModel;
    if (previousBaseUrl === undefined) delete process.env.OLLAMA_BASE_URL;
    else process.env.OLLAMA_BASE_URL = previousBaseUrl;
    if (previousOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousOpenAiKey;
    globalThis.fetch = previousFetch;
  }
});

test("exercise image analysis can use local Ollama vision without an API key", async () => {
  const previousProvider = process.env.EXERCISE_VISION_PROVIDER;
  const previousModel = process.env.EXERCISE_VISION_OLLAMA_MODEL;
  const previousBaseUrl = process.env.OLLAMA_BASE_URL;
  const previousOpenAiKey = process.env.OPENAI_API_KEY;
  const previousFetch = globalThis.fetch;
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];

  process.env.EXERCISE_VISION_PROVIDER = "ollama";
  process.env.EXERCISE_VISION_OLLAMA_MODEL = "qwen2.5vl:7b";
  process.env.OLLAMA_BASE_URL = "http://127.0.0.1:11434";
  delete process.env.OPENAI_API_KEY;

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(input),
      body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>
    });

    return Response.json({
      response: JSON.stringify({
        title: "手表跑步记录",
        type: "running",
        durationMin: 36,
        intensity: 4,
        caloriesKcal: 350,
        items: [
          {
            name: "户外跑步",
            category: "cardio",
            durationMin: 36,
            distanceKm: 5.2,
            caloriesKcal: 350,
            intensity: 4,
            confidence: 0.88
          }
        ],
        confidence: 0.88,
        uncertainItems: ["心率文字较小"],
        note: "按截图读取"
      })
    });
  }) as typeof fetch;

  try {
    const { POST } = await import("../app/api/exercise/analyze-image/route.ts");
    const response = await POST(
      new Request("http://localhost/api/exercise/analyze-image", {
        method: "POST",
        body: JSON.stringify({ imageDataUrl: "data:image/jpeg;base64,Zm9v" })
      })
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.configured, true);
    assert.equal(body.provider, "ollama");
    assert.equal(body.estimate.title, "手表跑步记录");
    assert.equal(calls[0].url, "http://127.0.0.1:11434/api/generate");
    assert.equal(calls[0].body.model, "qwen2.5vl:7b");
    assert.deepEqual(calls[0].body.images, ["Zm9v"]);
    assert.match(String(calls[0].body.prompt), /运动 App 截图/);
    assert.match(String(calls[0].body.prompt), /不得输出医疗诊断/);
  } finally {
    if (previousProvider === undefined) delete process.env.EXERCISE_VISION_PROVIDER;
    else process.env.EXERCISE_VISION_PROVIDER = previousProvider;
    if (previousModel === undefined) delete process.env.EXERCISE_VISION_OLLAMA_MODEL;
    else process.env.EXERCISE_VISION_OLLAMA_MODEL = previousModel;
    if (previousBaseUrl === undefined) delete process.env.OLLAMA_BASE_URL;
    else process.env.OLLAMA_BASE_URL = previousBaseUrl;
    if (previousOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousOpenAiKey;
    globalThis.fetch = previousFetch;
  }
});
