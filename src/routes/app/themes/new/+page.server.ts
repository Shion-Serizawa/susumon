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
  return response.statusText || `Request failed (${response.status})`;
}

export const actions: Actions = {
  default: async ({ request, fetch }) => {
    const formData = await request.formData();

    const name = asNonEmptyString(formData.get("name"));
    const goal = asNonEmptyString(formData.get("goal"));
    const shortName = asOptionalTrimmedString(formData.get("shortName"));

    const fieldErrors: Record<string, string> = {};
    if (!name) fieldErrors.name = "Name is required.";
    if (!goal) fieldErrors.goal = "Goal is required.";
    if (shortName && shortName.length > 50) {
      fieldErrors.shortName = "Short name must be 50 characters or less.";
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
          "Theme API is not implemented yet (POST /api/themes). Complete backend task 1.2 first.",
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
