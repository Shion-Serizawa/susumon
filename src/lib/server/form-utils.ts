/**
 * Form utility functions for server-side form processing
 */

/**
 * Convert FormDataEntryValue to non-empty string or null
 * @param value - FormData value
 * @returns Trimmed string if non-empty, otherwise null
 */
export function asNonEmptyString(
	value: FormDataEntryValue | null
): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

/**
 * Convert FormDataEntryValue to optional trimmed string
 * Same as asNonEmptyString, kept as alias for semantic clarity
 * @param value - FormData value
 * @returns Trimmed string if non-empty, otherwise null
 */
export function asOptionalTrimmedString(
	value: FormDataEntryValue | null
): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

/**
 * Field-level validation errors
 */
export interface FieldErrors {
	[key: string]: string;
}

/**
 * Validate string length constraints
 * @param value - String to validate
 * @param fieldName - Field name for error message (Japanese)
 * @param maxLength - Maximum allowed length
 * @returns Error message if validation fails, otherwise null
 */
export function validateMaxLength(
	value: string | null,
	fieldName: string,
	maxLength: number
): string | null {
	if (value && value.length > maxLength) {
		return `${fieldName}は${maxLength}文字以内にしてください。`;
	}
	return null;
}

/**
 * Validate required field
 * @param value - Value to validate
 * @param fieldName - Field name for error message (Japanese)
 * @returns Error message if validation fails, otherwise null
 */
export function validateRequired(
	value: string | null,
	fieldName: string
): string | null {
	if (!value) {
		return `${fieldName}は必須です。`;
	}
	return null;
}
