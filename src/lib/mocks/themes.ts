import type { PaginatedResponse, ResourceState } from "$lib/types";

export interface ThemeListItem {
  id: string;
  name: string;
  shortName: string | null;
  goal: string;
  isCompleted: boolean;
  state: ResourceState;
  createdAt: string; // ISO string
}

export interface ThemesListParams {
  includeCompleted: boolean;
  includeArchived: boolean;
  limit: number;
  cursor: string | null;
}

type ThemesCursor = { createdAt: string; id: string };

function decodeCursor(cursor: string | null): ThemesCursor | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(atob(cursor)) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "createdAt" in parsed &&
      "id" in parsed &&
      typeof (parsed as { createdAt: unknown }).createdAt === "string" &&
      typeof (parsed as { id: unknown }).id === "string"
    ) {
      return {
        createdAt: (parsed as { createdAt: string }).createdAt,
        id: (parsed as { id: string }).id,
      };
    }
  } catch {
    // ignore invalid cursor
  }
  return null;
}

function encodeCursor(cursor: ThemesCursor): string {
  return btoa(JSON.stringify(cursor));
}

function isAfter(a: ThemesCursor, b: ThemesCursor): boolean {
  const aTime = Date.parse(a.createdAt);
  const bTime = Date.parse(b.createdAt);
  if (Number.isFinite(aTime) && Number.isFinite(bTime)) {
    if (aTime !== bTime) return aTime > bTime;
    return a.id > b.id;
  }
  if (a.createdAt !== b.createdAt) return a.createdAt > b.createdAt;
  return a.id > b.id;
}

const MOCK_THEMES: ThemeListItem[] = (() => {
  const base = Date.parse("2025-01-01T00:00:00.000Z");
  const items: ThemeListItem[] = [];

  for (let i = 1; i <= 55; i++) {
    const createdAt = new Date(base + i * 60_000).toISOString();
    items.push({
      id: `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
      name: `Mock Theme ${i}`,
      shortName: i % 3 === 0 ? `T${i}` : null,
      goal: `Goal for theme ${i}`,
      isCompleted: i % 7 === 0,
      state: i % 19 === 0 ? "ARCHIVED" : "ACTIVE",
      createdAt,
    });
  }

  return items.sort((a, b) => {
    const aTime = Date.parse(a.createdAt);
    const bTime = Date.parse(b.createdAt);
    if (aTime !== bTime) return aTime - bTime;
    return a.id.localeCompare(b.id);
  });
})();

export function getMockThemesPage(
  params: ThemesListParams,
): PaginatedResponse<ThemeListItem> {
  const limit = Math.min(Math.max(params.limit, 1), 200);
  const decoded = decodeCursor(params.cursor);

  const filtered = MOCK_THEMES.filter((t) => {
    if (!params.includeCompleted && t.isCompleted) return false;
    if (!params.includeArchived && t.state === "ARCHIVED") return false;
    return true;
  });

  const page = decoded
    ? filtered.filter((t) =>
      isAfter({ createdAt: t.createdAt, id: t.id }, decoded)
    )
    : filtered;

  const sliced = page.slice(0, limit + 1);
  const hasMore = sliced.length > limit;
  const items = hasMore ? sliced.slice(0, limit) : sliced;

  const nextCursor = hasMore && items.length > 0
    ? encodeCursor({
      createdAt: items[items.length - 1].createdAt,
      id: items[items.length - 1].id,
    })
    : null;

  return { items, nextCursor };
}
