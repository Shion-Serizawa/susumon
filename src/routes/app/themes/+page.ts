import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";
import type { ApiErrorResponse, PaginatedResponse } from "$lib/types";
import { getMockThemesPage, type ThemeListItem } from "$lib/mocks/themes";

type ThemeListResponse = PaginatedResponse<ThemeListItem>;
type DataSource = "api" | "mock";

function parseBool(value: string | null): boolean {
  if (!value) return false;
  return value === "1" || value.toLowerCase() === "true";
}

function buildThemesUrl(params: {
  includeCompleted: boolean;
  includeArchived: boolean;
  limit: number;
  cursor: string | null;
}): string {
  const sp = new URLSearchParams();
  if (params.includeCompleted) sp.set("includeCompleted", "true");
  if (params.includeArchived) sp.set("includeArchived", "true");
  sp.set("limit", String(params.limit));
  if (params.cursor) sp.set("cursor", params.cursor);
  return `/api/themes?${sp.toString()}`;
}

async function readErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const data = (await response.json()) as ApiErrorResponse;
      if (data?.error?.message) return data.error.message;
    } catch {
      // ignore
    }
  }
  return response.statusText || "リクエストに失敗しました";
}

export const load: PageLoad = async ({ fetch, url }) => {
  const includeCompleted = parseBool(url.searchParams.get("includeCompleted"));
  const includeArchived = parseBool(url.searchParams.get("includeArchived"));
  const limit = 20;

  const requestUrl = buildThemesUrl({
    includeCompleted,
    includeArchived,
    limit,
    cursor: null,
  });

  const response = await fetch(requestUrl);
  const contentType = response.headers.get("content-type") ?? "";

  // API not implemented yet → fall back to deterministic mock data for FE development.
  if (response.status === 404) {
    const mock = getMockThemesPage({
      includeCompleted,
      includeArchived,
      limit,
      cursor: null,
    });
    return {
      source: "mock" as DataSource,
      includeCompleted,
      includeArchived,
      limit,
      items: mock.items,
      nextCursor: mock.nextCursor,
    };
  }

  if (!contentType.includes("application/json")) {
    throw error(502, "想定外のレスポンスです（/api/themes）");
  }

  if (!response.ok) {
    throw error(response.status, await readErrorMessage(response));
  }

  const data = (await response.json()) as ThemeListResponse;
  return {
    source: "api" as DataSource,
    includeCompleted,
    includeArchived,
    limit,
    items: data.items,
    nextCursor: data.nextCursor,
  };
};
