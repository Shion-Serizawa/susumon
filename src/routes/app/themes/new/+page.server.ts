import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";
import type { Theme } from "$lib/types";
import {
  asNonEmptyString,
  asOptionalTrimmedString,
  validateMaxLength,
  validateRequired,
} from "$lib/server/form-utils";
import { readApiErrorMessage } from "$lib/server/api-utils";

export const actions: Actions = {
  default: async ({ request, fetch }) => {
    const formData = await request.formData();

    const name = asNonEmptyString(formData.get("name"));
    const goal = asNonEmptyString(formData.get("goal"));
    const shortName = asOptionalTrimmedString(formData.get("shortName"));

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
