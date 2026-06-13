import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("package exposes a local AI startup command", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts?: Record<string, string>;
  };

  assert.equal(packageJson.scripts?.["dev:local-ai"], "node scripts/start-local-ai-dev.mjs");
});

test("local AI startup script starts Ollama and Next with local AI defaults", () => {
  const script = readFileSync("scripts/start-local-ai-dev.mjs", "utf8");

  assert.match(script, /VISION_PROVIDER: "ollama"/);
  assert.match(script, /EXERCISE_AI_PROVIDER: "ollama"/);
  assert.match(script, /EXERCISE_VISION_PROVIDER: "ollama"/);
  assert.match(script, /OLLAMA_MODEL: visionModel/);
  assert.match(script, /EXERCISE_OLLAMA_MODEL: textModel/);
  assert.match(script, /const textModel = process\.env\.TEXT_MODEL \|\| visionModel/);
  assert.match(script, /spawn\(ollamaExe, \["serve"\]/);
  assert.match(script, /\/api\/tags/);
  assert.match(script, /process\.execPath/);
  assert.match(script, /next", "dist", "bin", "next"/);
  assert.match(script, /node:net/);
  assert.match(script, /findAvailablePort/);
  assert.match(script, /Port .* is in use/);
});
