import { getDynamicStore, readJsonBody, toError, toJson } from "../../../lib/dynamic/api.ts";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    return toJson({ snapshot: getDynamicStore().exportData() });
  } catch (error) {
    return toError(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    if (!isRecord(body) || !isRecord(body.snapshot)) {
      throw new Error("Import request requires a snapshot object.");
    }

    return toJson({
      snapshot: getDynamicStore().importData(body.snapshot as never)
    });
  } catch (error) {
    return toError(error);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
