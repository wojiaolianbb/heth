import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import test from "node:test";
import { resolveDynamicDataFile } from "../lib/dynamic/api.ts";

test("dynamic data uses the writable temp directory on Vercel by default", () => {
  const previousDataFile = process.env.HEALTH_DATA_FILE;
  const previousVercel = process.env.VERCEL;

  delete process.env.HEALTH_DATA_FILE;
  process.env.VERCEL = "1";

  try {
    const filePath = resolveDynamicDataFile();

    assert.equal(filePath?.startsWith(tmpdir()), true);
    assert.match(filePath ?? "", /health-store\.json$/);
  } finally {
    if (previousDataFile === undefined) delete process.env.HEALTH_DATA_FILE;
    else process.env.HEALTH_DATA_FILE = previousDataFile;

    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
  }
});
