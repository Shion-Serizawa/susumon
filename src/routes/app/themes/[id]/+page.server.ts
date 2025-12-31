import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { ThemeDetail } from "$lib/types";
import { readApiErrorMessage } from "$lib/server/api-utils";

type RecentLog = {
  id: string;
  date: string; // YYYY-MM-DD
  summary: string;
};

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
