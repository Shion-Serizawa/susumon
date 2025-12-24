import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";
import type { ApiErrorResponse, Theme } from "$lib/types";

function asNonEmptyString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asOptionalTrimmedString(
  value: FormDataEntryValue | null,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

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
  return response.statusText ||
    `リクエストに失敗しました（${response.status}）`;
}

export const actions: Actions = {
  default: async ({ request, fetch }) => {
    const formData = await request.formData();

    const name = asNonEmptyString(formData.get("name"));
    const goal = asNonEmptyString(formData.get("goal"));
    const shortName = asOptionalTrimmedString(formData.get("shortName"));

    const fieldErrors: Record<string, string> = {};
    if (!name) fieldErrors.name = "名称は必須です。";
    if (!goal) fieldErrors.goal = "目標は必須です。";
    if (shortName && shortName.length > 50) {
      fieldErrors.shortName = "略称は50文字以内にしてください。";
    }

    const values = {
      name: name ?? "",
      goal: goal ?? "",
      shortName: shortName ?? "",
    };

    if (Object.keys(fieldErrors).length > 0) {
      return fail(400, { values, fieldErrors });
    }

    const response = await fetch("/api/themes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, goal, shortName }),
    });

    // Backend not implemented yet → let user proceed with UI work, but be explicit.
    if (response.status === 404) {
      return fail(501, {
        values,
        fieldErrors: {},
        formError:
          "Theme API が未実装です（POST /api/themes）。バックエンドのタスク 1.2 を先に完了してください。",
      });
    }

    if (!response.ok) {
      return fail(response.status, {
        values,
        fieldErrors: {},
        formError: await readApiErrorMessage(response),
      });
    }

    const created = (await response.json()) as Theme;
    throw redirect(303, `/app/themes/${created.id}`);
  },
};
