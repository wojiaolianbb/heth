import { getDynamicStore, readJsonBody, toError, toJson } from "../../../lib/dynamic/api.ts";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    return toJson({ habits: getDynamicStore().listHabits() });
  } catch (error) {
    return toError(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    const habit = getDynamicStore().upsertHabit(await readJsonBody(request));
    return toJson({ habit }, { status: 201 });
  } catch (error) {
    return toError(error);
  }
}
