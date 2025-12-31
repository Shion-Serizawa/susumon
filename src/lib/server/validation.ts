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
 * ThemePatch のバリデーション結果
 */
export interface ValidatedThemePatch {
	data: {
		name?: string;
		goal?: string;
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
 * LearningLogCreate のバリデーション結果
 */
export interface ValidatedLogCreate {
	data: {
		themeId: string;
		date: string;
		summary: string;
		details?: string | null;
		tags?: string[];
	} | null;
	error?: ApiError;
}

/**
 * LearningLogPatch のバリデーション結果
 */
export interface ValidatedLogPatch {
	data: {
		summary?: string;
		details?: string | null;
		tags?: string[];
	} | null;
	error?: ApiError;
}

/**
 * Date パラメータのバリデーション結果
 */
export interface ValidatedDate {
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
 * ThemePatch リクエストボディをバリデーション
 * @param body - リクエストボディ（unknown）
 * @returns バリデーション結果
 */
export function validateThemePatch(body: unknown): ValidatedThemePatch {
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
	const patch: {
		name?: string;
		goal?: string;
		shortName?: string | null;
		isCompleted?: boolean;
	} = {};

	// name（任意、文字列、1文字以上）
	if ('name' in data) {
		if (typeof data.name !== 'string' || data.name.trim().length === 0) {
			return {
				data: null,
				error: {
					error: {
						code: 'BadRequest',
						message: 'name must be a non-empty string'
					}
				}
			};
		}
		patch.name = data.name;
	}

	// goal（任意、文字列、1文字以上）
	if ('goal' in data) {
		if (typeof data.goal !== 'string' || data.goal.trim().length === 0) {
			return {
				data: null,
				error: {
					error: {
						code: 'BadRequest',
						message: 'goal must be a non-empty string'
					}
				}
			};
		}
		patch.goal = data.goal;
	}

	// shortName（任意、文字列またはnull）
	if ('shortName' in data) {
		if (data.shortName === null) {
			patch.shortName = null;
		} else if (typeof data.shortName === 'string') {
			patch.shortName = data.shortName.trim().length > 0 ? data.shortName : null;
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

	// isCompleted（任意、boolean）
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
		patch.isCompleted = data.isCompleted;
	}

	// 何も更新項目がない場合
	if (Object.keys(patch).length === 0) {
		return {
			data: null,
			error: {
				error: {
					code: 'BadRequest',
					message: 'At least one field must be provided'
				}
			}
		};
	}

	return { data: patch };
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

/**
 * LearningLogCreate リクエストボディをバリデーション
 * @param body - リクエストボディ（unknown）
 * @returns バリデーション結果
 */
export function validateLogCreate(body: unknown): ValidatedLogCreate {
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

	// themeId のバリデーション（必須、UUID）
	if (!data.themeId || typeof data.themeId !== 'string') {
		return {
			data: null,
			error: {
				error: {
					code: 'BadRequest',
					message: 'themeId is required and must be a string'
				}
			}
		};
	}

	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(data.themeId)) {
		return {
			data: null,
			error: {
				error: {
					code: 'BadRequest',
					message: 'themeId must be a valid UUID'
				}
			}
		};
	}

	// date のバリデーション（必須、YYYY-MM-DD形式）
	if (!data.date || typeof data.date !== 'string') {
		return {
			data: null,
			error: {
				error: {
					code: 'BadRequest',
					message: 'date is required and must be a string'
				}
			}
		};
	}

	// 日付のバリデーション（validateDateParam ユーティリティを再利用）
	const dateValidation = validateDateParam(data.date, 'date');
	if (dateValidation.error) {
		return {
			data: null,
			error: dateValidation.error
		};
	}

	// summary のバリデーション（必須、文字列、1文字以上）
	if (!data.summary || typeof data.summary !== 'string' || data.summary.trim().length === 0) {
		return {
			data: null,
			error: {
				error: {
					code: 'BadRequest',
					message: 'summary is required and must be a non-empty string'
				}
			}
		};
	}

	// details のバリデーション（オプション、文字列またはnull）
	let details: string | null | undefined = undefined;
	if ('details' in data) {
		if (data.details === null) {
			details = null;
		} else if (typeof data.details === 'string') {
			details = data.details;
		} else {
			return {
				data: null,
				error: {
					error: {
						code: 'BadRequest',
						message: 'details must be a string or null'
					}
				}
			};
		}
	}

	// tags のバリデーション（オプション、文字列配列）
	let tags: string[] | undefined = undefined;
	if ('tags' in data) {
		if (!Array.isArray(data.tags)) {
			return {
				data: null,
				error: {
					error: {
						code: 'BadRequest',
						message: 'tags must be an array'
					}
				}
			};
		}

		if (!data.tags.every((tag) => typeof tag === 'string')) {
			return {
				data: null,
				error: {
					error: {
						code: 'BadRequest',
						message: 'tags must be an array of strings'
					}
				}
			};
		}

		tags = data.tags as string[];
	}

	return {
		data: {
			themeId: data.themeId,
			date: data.date,
			summary: data.summary,
			...(details !== undefined && { details }),
			...(tags !== undefined && { tags })
		},
		error: undefined
	};
}

/**
 * LearningLogPatch リクエストボディをバリデーション
 * @param body - リクエストボディ（unknown）
 * @returns バリデーション結果
 */
export function validateLogPatch(body: unknown): ValidatedLogPatch {
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
	const patch: {
		summary?: string;
		details?: string | null;
		tags?: string[];
	} = {};

	// summary（任意、文字列、1文字以上）
	if ('summary' in data) {
		if (typeof data.summary !== 'string' || data.summary.trim().length === 0) {
			return {
				data: null,
				error: {
					error: {
						code: 'BadRequest',
						message: 'summary must be a non-empty string'
					}
				}
			};
		}
		patch.summary = data.summary;
	}

	// details（任意、文字列またはnull）
	if ('details' in data) {
		if (data.details === null) {
			patch.details = null;
		} else if (typeof data.details === 'string') {
			patch.details = data.details;
		} else {
			return {
				data: null,
				error: {
					error: {
						code: 'BadRequest',
						message: 'details must be a string or null'
					}
				}
			};
		}
	}

	// tags（任意、文字列配列）
	if ('tags' in data) {
		if (!Array.isArray(data.tags)) {
			return {
				data: null,
				error: {
					error: {
						code: 'BadRequest',
						message: 'tags must be an array'
					}
				}
			};
		}

		if (!data.tags.every((tag) => typeof tag === 'string')) {
			return {
				data: null,
				error: {
					error: {
						code: 'BadRequest',
						message: 'tags must be an array of strings'
					}
				}
			};
		}

		patch.tags = data.tags as string[];
	}

	// 何も更新項目がない場合
	if (Object.keys(patch).length === 0) {
		return {
			data: null,
			error: {
				error: {
					code: 'BadRequest',
					message: 'At least one field must be provided'
				}
			}
		};
	}

	return { data: patch };
}

/**
 * Date パラメータをバリデーション（YYYY-MM-DD形式）
 * @param value - パラメータ値
 * @param paramName - パラメータ名（エラーメッセージ用）
 */
export function validateDateParam(value: string | null, paramName = 'date'): ValidatedDate {
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

	const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
	if (!dateRegex.test(value)) {
		return {
			value: '',
			error: {
				error: {
					code: 'BadRequest',
					message: `${paramName} must be in YYYY-MM-DD format`
				}
			}
		};
	}

	// 日付として有効かチェック
	const parsedDate = new Date(value);
	if (isNaN(parsedDate.getTime())) {
		return {
			value: '',
			error: {
				error: {
					code: 'BadRequest',
					message: `${paramName} must be a valid date`
				}
			}
		};
	}

	return { value };
}
