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
  const res = await fetch(`/api/themes/${params.id}`);
  if (!res.ok) {
    throw error(res.status, await readApiErrorMessage(res));
  }
  const theme = (await res.json()) as ThemeDetail;
  return { theme };
};

export const actions: Actions = {
  default: async ({ fetch, params }) => {
    const res = await fetch(`/api/themes/${params.id}`, { method: "DELETE" });
    if (res.status === 204) {
      throw redirect(303, "/app/themes");
    }
    return fail(res.status, { formError: await readApiErrorMessage(res) });
  },
};
