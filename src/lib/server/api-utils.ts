/**
 * API utility functions for server-side API interactions
 */

import type { ApiErrorResponse } from "$lib/types";

/**
 * Read error message from API response
 * @param response - Fetch API response
 * @returns Error message extracted from response or fallback message
 */
export async function readApiErrorMessage(
	response: Response
): Promise<string> {
	const contentType = response.headers.get("content-type") ?? "";
	if (contentType.includes("application/json")) {
		try {
			const body = (await response.json()) as ApiErrorResponse;
			if (body?.error?.message) return body.error.message;
		} catch {
			// ignore JSON parse errors
		}
	}
	return response.statusText || `リクエストに失敗しました（${response.status}）`;
}
