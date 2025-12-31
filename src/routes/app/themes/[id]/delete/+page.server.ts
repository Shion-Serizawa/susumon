import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import type { ThemeDetail } from "$lib/types";
import { readApiErrorMessage } from "$lib/server/api-utils";

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
