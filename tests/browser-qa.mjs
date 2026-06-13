import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:3001";
const executablePath =
  process.env.CHROME_EXECUTABLE_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const routes = [
  { path: "/", text: "打造更健康的身体" },
  { path: "/content", text: "动态主题体系" },
  { path: "/content/sleep", text: "健康免责声明" },
  { path: "/checkin", text: "动态习惯记录与本地回顾" },
  { path: "/manage", text: "动态数据管理" },
  { path: "/privacy", text: "隐私说明" },
  { path: "/disclaimer", text: "免责声明" }
];

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const consoleErrors = [];

page.on("console", (message) => {
  if (message.type() === "error") {
    consoleErrors.push(message.text());
  }
});
page.on("pageerror", (error) => {
  consoleErrors.push(error.message);
});

try {
  for (const route of routes) {
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: "networkidle" });
    await assertVisibleText(page, route.text);
  }

  const habitLabel = `QA 动态习惯 ${Date.now()}`;
  await page.goto(`${baseUrl}/checkin`, { waitUntil: "networkidle" });
  await page.getByLabel("新增习惯名称").fill(habitLabel);
  await page.getByRole("button", { name: "新增习惯" }).click();
  await page.getByLabel(habitLabel).waitFor({ state: "visible", timeout: 10000 });
  await page.getByLabel(habitLabel).check();
  await page.getByRole("button", { name: "30 天" }).click();
  await assertVisibleText(page, "平均完成率");

  const snapshot = await page.evaluate(async () => {
    const response = await fetch("/api/data");
    return response.json();
  });
  const savedHabit = snapshot.snapshot.habits.find((habit) => habit.label === habitLabel);
  assert.equal(Boolean(savedHabit), true);

  const todayKey = Object.keys(snapshot.snapshot.checkins).find((key) =>
    /^checkin-\d{4}-\d{2}-\d{2}$/.test(key)
  );
  assert.equal(Boolean(todayKey), true);
  assert.equal(typeof snapshot.snapshot.checkins[todayKey][savedHabit.id], "boolean");

  await page.goto(`${baseUrl}/manage`, { waitUntil: "networkidle" });
  await assertVisibleText(page, "当前快照");
  await assertVisibleText(page, habitLabel);
  await page.getByLabel("Slug", { exact: true }).fill(`qa-topic-${Date.now()}`);
  await page.getByLabel("标题", { exact: true }).fill("QA 主题");
  await page.getByLabel("摘要", { exact: true }).fill("围绕日常节奏的一般健康信息。");
  await page.getByLabel("介绍", { exact: true }).fill("用普通生活习惯观察节奏，不记录个人健康细节。");
  await page.getByLabel("建议，每行一条").fill("选择一个容易开始的小动作。");
  await page.getByLabel("注意事项，每行一条").fill("避免用打卡结果判断身体状态。");
  await page.getByRole("button", { name: "保存主题" }).click();
  await assertVisibleText(page, "主题已保存");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  await assertVisibleText(page, "管理动态数据");
  await page.goto(`${baseUrl}/manage`, { waitUntil: "networkidle" });
  await assertVisibleText(page, "权限边界");

  assert.deepEqual(consoleErrors, []);
} finally {
  await browser.close();
}

async function assertVisibleText(page, text) {
  const locator = page.getByText(text, { exact: false }).first();
  await locator.waitFor({ state: "visible", timeout: 10000 });
}
