import { getDynamicStore, readJsonBody, toError, toJson } from "../../../lib/dynamic/api.ts";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const dateKey = url.searchParams.get("dateKey");
    if (dateKey) {
      return toJson({
        state: getDynamicStore().getCheckin(dateKey)
      });
    }

    const days = url.searchParams.get("days") === "30" ? 30 : 7;
    const endDateValue = url.searchParams.get("endDate");
    const endDate = endDateValue ? parseDate(endDateValue) : new Date();

    return toJson({
      history: getDynamicStore().getCheckinHistory(endDate, days)
    });
  } catch (error) {
    return toError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);

    if (!isRecord(body) || typeof body.dateKey !== "string" || !isRecord(body.state)) {
      throw new Error("Check-in request requires dateKey and state.");
    }

    const state = getDynamicStore().saveCheckin(body.dateKey, body.state);
    return toJson({ state }, { status: 201 });
  } catch (error) {
    return toError(error);
  }
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error("endDate must use YYYY-MM-DD.");
  }

  return new Date(year, month - 1, day);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
