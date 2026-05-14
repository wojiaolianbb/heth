import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCheckinKey,
  createInitialCheckinState,
  habits,
  readCheckinState,
  saveCheckinState,
  parseCheckinState,
  serializeCheckinState,
  type CheckinState
} from "../lib/checkin.ts";

test("buildCheckinKey formats a local date as checkin-YYYY-MM-DD", () => {
  const date = new Date(2026, 4, 13, 9, 30, 0);

  assert.equal(buildCheckinKey(date), "checkin-2026-05-13");
});

test("createInitialCheckinState marks every fixed habit as incomplete", () => {
  const state = createInitialCheckinState();

  assert.deepEqual(
    state,
    Object.fromEntries(habits.map((habit) => [habit.id, false]))
  );
});

test("serializeCheckinState only stores habit completion booleans", () => {
  const state: CheckinState = {
    "drink-water": true,
    "sleep-phone-away": false
  };

  assert.deepEqual(JSON.parse(serializeCheckinState(state)), {
    "drink-water": true,
    "sleep-phone-away": false,
    "walk-outside": false,
    "breakfast-on-time": false,
    stretch: false
  });
});

test("parseCheckinState keeps stored booleans and ignores unrelated values", () => {
  const state = parseCheckinState(
    JSON.stringify({
      "drink-water": true,
      "sleep-phone-away": "yes",
      note: "private text"
    })
  );

  assert.deepEqual(state, {
    "drink-water": true,
    "sleep-phone-away": false,
    "walk-outside": false,
    "breakfast-on-time": false,
    stretch: false
  });
});

test("parseCheckinState falls back to default state for invalid JSON", () => {
  assert.deepEqual(parseCheckinState("{"), createInitialCheckinState());
});

test("readCheckinState and saveCheckinState use only the requested date key", () => {
  const storedValues = new Map<string, string>();
  const storage = {
    getItem: (key: string) => storedValues.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storedValues.set(key, value);
    }
  };
  const key = "checkin-2026-05-13";

  saveCheckinState(storage, key, {
    "drink-water": true,
    "sleep-phone-away": false,
    "walk-outside": true,
    "breakfast-on-time": false,
    stretch: false
  });

  assert.deepEqual(JSON.parse(storedValues.get(key) ?? ""), {
    "drink-water": true,
    "sleep-phone-away": false,
    "walk-outside": true,
    "breakfast-on-time": false,
    stretch: false
  });
  assert.deepEqual(readCheckinState(storage, key), {
    "drink-water": true,
    "sleep-phone-away": false,
    "walk-outside": true,
    "breakfast-on-time": false,
    stretch: false
  });
  assert.equal(storedValues.has("health-data"), false);
});
