import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { ApiErrorResponse } from "$lib/types";

type ThemeDetail = {
  id: string;
  name: string;
  shortName: string | null;
  goal: string;
  isCompleted: boolean;
  state: "ACTIVE" | "ARCHIVED" | "DELETED";
  stateChangedAt: string;
  createdAt: string;
  updatedAt: string;
};

type RecentLog = {
  id: string;
  date: string; // YYYY-MM-DD
  summary: string;
};

async function readApiErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body = (await response.json()) as ApiErrorResponse;
      if (body?.error?.message) return body.error.message;
    } catch {
      // ignore
    }
  }
  return response.statusText || `Request failed (${response.status})`;
}

export const load: PageServerLoad = async ({ fetch, params }) => {
  const themeRes = await fetch(`/api/themes/${params.id}`);
  if (!themeRes.ok) {
    throw error(themeRes.status, await readApiErrorMessage(themeRes));
  }

  const theme = (await themeRes.json()) as ThemeDetail;

  // Logs API may not be implemented yet. Keep UI functional.
  let recentLogs: RecentLog[] = [];
  let logsSource: "api" | "unavailable" = "unavailable";

  try {
    const logsRes = await fetch(
      `/api/logs?themeId=${encodeURIComponent(theme.id)}&limit=5`,
    );
    if (logsRes.ok) {
      const body = (await logsRes.json()) as { items: RecentLog[] };
      recentLogs = body.items ?? [];
      logsSource = "api";
    }
  } catch {
    // ignore
  }

  return { theme, recentLogs, logsSource };
};
