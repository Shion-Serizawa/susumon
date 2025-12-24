import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
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

export const load: PageServerLoad = async ({ fetch, params }) => {
  const res = await fetch(`/api/themes/${params.id}`);
  if (!res.ok) {
    throw error(res.status, await readApiErrorMessage(res));
  }
  const theme = (await res.json()) as ThemeDetail;
  return { theme };
};

export const actions: Actions = {
  default: async ({ fetch, params, request }) => {
    const formData = await request.formData();

    const name = asNonEmptyString(formData.get("name"));
    const goal = asNonEmptyString(formData.get("goal"));
    const shortName = asOptionalTrimmedString(formData.get("shortName"));
    const isCompleted = formData.get("isCompleted") === "on";

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
      isCompleted,
    };

    if (Object.keys(fieldErrors).length > 0) {
      return fail(400, { values, fieldErrors });
    }

    const response = await fetch(`/api/themes/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        goal,
        shortName: shortName || null,
        isCompleted,
      }),
    });

    if (!response.ok) {
      return fail(response.status, {
        values,
        fieldErrors: {},
        formError: await readApiErrorMessage(response),
      });
    }

    throw redirect(303, `/app/themes/${params.id}`);
  },
};
