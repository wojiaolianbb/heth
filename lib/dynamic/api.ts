import { createFileDataStore } from "./store.ts";

export function getDynamicStore() {
  return createFileDataStore({
    filePath: process.env.HEALTH_DATA_FILE
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
