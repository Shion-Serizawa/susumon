/**
 * API バリデーション共通関数
 */

import type { ApiError } from './api-types';

/**
 * Limit パラメータのバリデーション結果
 */
export interface ValidatedLimit {
	value: number;
	error?: ApiError;
}

/**
 * ThemeCreate のバリデーション結果
 */
export interface ValidatedThemeCreate {
	data: {
		name: string;
		goal: string;
		shortName?: string | null;
		isCompleted?: boolean;
	} | null;
	error?: ApiError;
}

/**
 * UUID パラメータのバリデーション結果
 */
export interface ValidatedUuid {
	value: string;
	error?: ApiError;
}

/**
 * limit パラメータをバリデーション
 * @param limitParam - クエリパラメータの値
 * @param defaultValue - デフォルト値（通常50）
 * @param min - 最小値（通常1）
 * @param max - 最大値（通常200）
 * @returns バリデーション結果
 */
export function validateLimit(
	limitParam: string | null,
	defaultValue = 50,
	min = 1,
	max = 200
): ValidatedLimit {
	if (!limitParam) {
		return { value: defaultValue };
	}

	const limit = parseInt(limitParam, 10);

	if (isNaN(limit) || limit < min || limit > max) {
		return {
			value: defaultValue,
			error: {
				error: {
					code: 'BadRequest',
					message: `limit must be between ${min} and ${max}`
				}
			}
		};
	}

	return { value: limit };
}

/**
 * ThemeCreate リクエストボディをバリデーション
 * @param body - リクエストボディ（unknown）
 * @returns バリデーション結果
 */
export function validateThemeCreate(body: unknown): ValidatedThemeCreate {
	// bodyがオブジェクトか確認
	if (!body || typeof body !== 'object') {
		return {
			data: null,
			error: {
				error: {
					code: 'BadRequest',
					message: 'Request body must be a JSON object'
				}
			}
		};
	}

	const data = body as Record<string, unknown>;

	// name のバリデーション（必須、文字列、1文字以上）
	if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
		return {
			data: null,
			error: {
				error: {
					code: 'BadRequest',
					message: 'name is required and must be a non-empty string'
				}
			}
		};
	}

	// goal のバリデーション（必須、文字列、1文字以上）
	if (!data.goal || typeof data.goal !== 'string' || data.goal.trim().length === 0) {
		return {
			data: null,
			error: {
				error: {
					code: 'BadRequest',
					message: 'goal is required and must be a non-empty string'
				}
			}
		};
	}

	// shortName のバリデーション（オプション、文字列またはnull）
	let shortName: string | null | undefined = undefined;
	if ('shortName' in data) {
		if (data.shortName === null) {
			shortName = null;
		} else if (typeof data.shortName === 'string') {
			shortName = data.shortName.trim().length > 0 ? data.shortName : null;
		} else {
			return {
				data: null,
				error: {
					error: {
						code: 'BadRequest',
						message: 'shortName must be a string or null'
					}
				}
			};
		}
	}

	// isCompleted のバリデーション（オプション、boolean）
	let isCompleted: boolean | undefined = undefined;
	if ('isCompleted' in data) {
		if (typeof data.isCompleted !== 'boolean') {
			return {
				data: null,
				error: {
					error: {
						code: 'BadRequest',
						message: 'isCompleted must be a boolean'
					}
				}
			};
		}
		isCompleted = data.isCompleted;
	}

	return {
		data: {
			name: data.name,
			goal: data.goal,
			...(shortName !== undefined && { shortName }),
			...(isCompleted !== undefined && { isCompleted })
		},
		error: undefined
	};
}

/**
 * UUID パラメータをバリデーション
 * @param value - パラメータ値
 * @param paramName - パラメータ名（エラーメッセージ用）
 */
export function validateUuidParam(value: string | null, paramName = 'id'): ValidatedUuid {
	if (!value || typeof value !== 'string') {
		return {
			value: '',
			error: {
				error: {
					code: 'BadRequest',
					message: `${paramName} is required`
				}
			}
		};
	}

	// UUID v1-v8 を許容する緩いチェック（形式のみ）
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(value)) {
		return {
			value: '',
			error: {
				error: {
					code: 'BadRequest',
					message: `${paramName} must be a valid UUID`
				}
			}
		};
	}

	return { value };
}
