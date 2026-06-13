import { getDynamicStore, readJsonBody, toError, toJson } from "../../../lib/dynamic/api.ts";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    return toJson({ topics: getDynamicStore().listTopics() });
  } catch (error) {
    return toError(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    const topic = getDynamicStore().upsertTopic(await readJsonBody(request));
    return toJson({ topic }, { status: 201 });
  } catch (error) {
    return toError(error);
  }
}
