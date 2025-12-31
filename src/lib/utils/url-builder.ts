/**
 * URL builder utilities for client-side and server-side use
 */

/**
 * Build themes API URL with query parameters
 * @param params - Query parameters
 * @returns URL string with query params
 */
export function buildThemesUrl(params: {
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

/**
 * Parse boolean from query parameter
 * @param value - Query parameter value
 * @returns Boolean value (defaults to false if null/invalid)
 */
export function parseBool(value: string | null): boolean {
	if (!value) return false;
	return value === "1" || value.toLowerCase() === "true";
}
