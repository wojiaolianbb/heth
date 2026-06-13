import { createFileDataStore } from "./store.ts";
import { join } from "node:path";
import { tmpdir } from "node:os";

export function resolveDynamicDataFile() {
  if (process.env.HEALTH_DATA_FILE) {
    return process.env.HEALTH_DATA_FILE;
  }

  if (process.env.VERCEL) {
    return join(tmpdir(), "heth", "health-store.json");
  }

  return undefined;
}

export function getDynamicStore() {
  return createFileDataStore({
    filePath: resolveDynamicDataFile()
  });
}

export function toJson(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export function toError(error: unknown, status = 400) {
  return toJson(
    {
      error: error instanceof Error ? error.message : "Unexpected request error."
    },
    { status }
  );
}

export async function readJsonBody(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}
