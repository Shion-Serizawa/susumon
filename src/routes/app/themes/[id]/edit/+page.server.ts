import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import type { ThemeDetail } from "$lib/types";
import {
  asNonEmptyString,
  asOptionalTrimmedString,
  validateMaxLength,
  validateRequired,
} from "$lib/server/form-utils";
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
  default: async ({ fetch, params, request }) => {
    const formData = await request.formData();

    const name = asNonEmptyString(formData.get("name"));
    const goal = asNonEmptyString(formData.get("goal"));
    const shortName = asOptionalTrimmedString(formData.get("shortName"));
    const isCompleted = formData.get("isCompleted") === "on";

    const fieldErrors: Record<string, string> = {};

    // Required field validation
    const nameError = validateRequired(name, "名称");
    if (nameError) fieldErrors.name = nameError;

    const goalError = validateRequired(goal, "目標");
    if (goalError) fieldErrors.goal = goalError;

    // Max length validation (based on common practices: 255 for name/goal, 50 for shortName)
    const nameMaxError = validateMaxLength(name, "名称", 255);
    if (nameMaxError) fieldErrors.name = nameMaxError;

    const goalMaxError = validateMaxLength(goal, "目標", 1000);
    if (goalMaxError) fieldErrors.goal = goalMaxError;

    const shortNameMaxError = validateMaxLength(shortName, "略称", 50);
    if (shortNameMaxError) fieldErrors.shortName = shortNameMaxError;

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
