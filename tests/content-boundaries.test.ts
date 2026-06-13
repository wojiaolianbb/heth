import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import {
  createFileDataStore,
  requiredHealthDisclaimer
} from "../lib/dynamic/store.ts";

const mojibakePattern = /[锟�]|鏃|鍋|荤|鐫|涓|绔|濂|娴|閫|撳|€|枟|棰|犲/;
const forbiddenHealthPattern =
  /医疗诊断|治疗方案|药物名称|药物|剂量建议|适合.{0,12}疾病|适合.{0,12}病/;
const quantifiedHabitPattern = /\d+\s*(杯|分钟|毫升|克|次|小时)/;

test("health disclaimer matches the required compliance copy exactly", () => {
  assert.equal(createFileDataStore().getSettings().disclaimer, requiredHealthDisclaimer);
});

test("dynamic content topics are readable and stay within general-information boundaries", () => {
  for (const topic of createFileDataStore().listTopics()) {
    const fields = [
      topic.title,
      topic.summary,
      topic.intro,
      ...topic.suggestions,
      ...topic.cautions
    ];

    for (const value of fields) {
      assert.equal(mojibakePattern.test(value), false, value);
      assert.equal(forbiddenHealthPattern.test(value), false, value);
    }
  }
});

test("dynamic check-in labels avoid quantified health targets", () => {
  for (const habit of createFileDataStore().listHabits()) {
    assert.equal(mojibakePattern.test(habit.label), false, habit.label);
    assert.equal(quantifiedHabitPattern.test(habit.label), false, habit.label);
  }
});

test("privacy copy documents the zero-cost local data boundary", () => {
  const copy = createFileDataStore().getSettings().privacyPrinciples.join("\n");

  assert.match(copy, /不使用任何付费服务|本地|自托管|checkin-YYYY-MM-DD/);
  assert.equal(forbiddenHealthPattern.test(copy), false);
});

test("production compliance pages exist", () => {
  assert.equal(existsSync("app/privacy/page.tsx"), true);
  assert.equal(existsSync("app/disclaimer/page.tsx"), true);
});
