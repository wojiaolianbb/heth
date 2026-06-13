import { getDynamicStore, readJsonBody, toError, toJson } from "../../../lib/dynamic/api.ts";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    return toJson({ settings: getDynamicStore().getSettings() });
  } catch (error) {
    return toError(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    const settings = getDynamicStore().updateSettings(await readJsonBody(request));
    return toJson({ settings });
  } catch (error) {
    return toError(error);
  }
}
