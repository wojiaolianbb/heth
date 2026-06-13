import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createFileDataStore,
  forbiddenDynamicContentPattern
} from "../lib/dynamic/store.ts";

test("file data store initializes from seed data and persists dynamic topics", () => {
  const filePath = join(mkdtempSync(join(tmpdir(), "heth-store-")), "store.json");
  const store = createFileDataStore({ filePath });

  const initialTopics = store.listTopics();
  assert.ok(initialTopics.length >= 4);
  assert.equal(initialTopics.some((topic) => topic.slug === "sleep"), true);

  store.upsertTopic({
    id: "workspace-ergonomics",
    title: "工作间隔",
    slug: "workspace-ergonomics",
    summary: "围绕工作间隔和恢复节奏的一般信息。",
    intro: "长时间专注后，可以安排短暂休息来恢复注意力。",
    suggestions: ["在固定工作节点后起身活动。"],
    cautions: ["避免用单一习惯判断整体健康状态。"]
  });

  const reloadedStore = createFileDataStore({ filePath });
  assert.equal(
    reloadedStore.listTopics().some((topic) => topic.slug === "workspace-ergonomics"),
    true
  );
});

test("dynamic content validation rejects medical or sensitive health text", () => {
  assert.equal(forbiddenDynamicContentPattern.test("建议使用某种药物名称"), true);
  assert.equal(forbiddenDynamicContentPattern.test("适合某种疾病人群"), true);

  const store = createFileDataStore({
    filePath: join(mkdtempSync(join(tmpdir(), "heth-store-")), "store.json")
  });

  assert.throws(() =>
    store.upsertTopic({
      id: "bad-topic",
      title: "错误内容",
      slug: "bad-topic",
      summary: "包含药物名称的内容",
      intro: "一般信息",
      suggestions: ["保持规律。"],
      cautions: ["咨询专业人士。"]
    })
  );
});

test("dynamic check-ins store only date-keyed booleans and summarize local windows", () => {
  const store = createFileDataStore({
    filePath: join(mkdtempSync(join(tmpdir(), "heth-store-")), "store.json")
  });
  const habits = store.listHabits();
  const state = Object.fromEntries(habits.map((habit) => [habit.id, true]));

  store.saveCheckin("checkin-2026-06-07", state);
  store.saveCheckin("checkin-2026-06-06", {
    ...state,
    [habits[0].id]: false
  });

  const snapshot = store.exportData();
  assert.deepEqual(Object.keys(snapshot.checkins).sort(), [
    "checkin-2026-06-06",
    "checkin-2026-06-07"
  ]);
  assert.equal(
    Object.values(snapshot.checkins["checkin-2026-06-07"]).every(
      (value) => typeof value === "boolean"
    ),
    true
  );

  const history = store.getCheckinHistory(new Date(2026, 5, 7), 7);
  assert.equal(history.days.length, 7);
  assert.equal(history.completedDays, 1);
  assert.equal(history.currentStreak, 1);
});
