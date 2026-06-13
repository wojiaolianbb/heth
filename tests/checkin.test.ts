import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createFileDataStore } from "../lib/dynamic/store.ts";

function createTestStore() {
  return createFileDataStore({
    filePath: join(mkdtempSync(join(tmpdir(), "heth-checkin-")), "store.json")
  });
}

test("dynamic check-in state is derived from active habits", () => {
  const store = createTestStore();
  store.upsertHabit({
    id: "custom-warmup",
    label: "训练前做一次轻量准备",
    active: true
  });

  const state = store.getCheckin("checkin-2026-06-07");

  assert.equal(Object.keys(state).includes("custom-warmup"), true);
  assert.equal(Object.values(state).every((value) => value === false), true);
});

test("dynamic check-ins ignore unknown fields and keep boolean-only records", () => {
  const store = createTestStore();
  const habits = store.listHabits();

  const saved = store.saveCheckin("checkin-2026-06-07", {
    [habits[0].id]: true,
    unknown: true,
    note: "private text"
  });

  assert.equal(Object.keys(saved).includes("unknown"), false);
  assert.equal(Object.keys(saved).includes("note"), false);
  assert.equal(Object.values(saved).every((value) => typeof value === "boolean"), true);
});

test("dynamic check-in history summarizes 7-day and 30-day windows", () => {
  const store = createTestStore();
  const state = Object.fromEntries(store.listHabits().map((habit) => [habit.id, true]));

  store.saveCheckin("checkin-2026-06-07", state);

  const sevenDay = store.getCheckinHistory(new Date(2026, 5, 7), 7);
  const thirtyDay = store.getCheckinHistory(new Date(2026, 5, 7), 30);

  assert.equal(sevenDay.days.length, 7);
  assert.equal(thirtyDay.days.length, 30);
  assert.equal(sevenDay.currentStreak, 1);
  assert.equal(thirtyDay.days.at(-1)?.dateKey, "checkin-2026-06-07");
});
