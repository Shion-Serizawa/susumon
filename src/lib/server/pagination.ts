/**
 * カーソルベースページネーション共通関数
 */

import type { ApiError, CursorData } from './api-types';

/**
 * カーソルのデコード結果
 */
export interface DecodedCursor<T extends CursorData> {
	data: T | null;
	error?: ApiError;
}

/**
 * Base64エンコードされたJSONカーソルをデコード
 * @param cursorParam - Base64エンコードされたカーソル文字列
 * @returns デコード結果
 */
export function decodeCursor<T extends CursorData>(
	cursorParam: string | null
): DecodedCursor<T> {
	if (!cursorParam) {
		return { data: null };
	}

	try {
		const decoded = JSON.parse(atob(cursorParam));
		return { data: decoded as T };
	} catch (error) {
		return {
			data: null,
			error: {
				error: {
					code: 'BadRequest',
					message: 'Invalid cursor format'
				}
			}
		};
	}
}

/**
 * カーソルデータをBase64エンコード
 * @param cursorData - エンコードするカーソルデータ
 * @returns Base64エンコードされた文字列
 */
export function encodeCursor<T extends CursorData>(cursorData: T): string {
	return btoa(JSON.stringify(cursorData));
}

/**
 * ページネーション結果の構築
 * @param items - 取得したアイテム配列（limit + 1件）
 * @param limit - リクエストされた件数
 * @param getCursorData - 最後のアイテムからカーソルデータを抽出する関数
 * @returns { items, nextCursor }
 */
export function buildPaginatedResponse<T, C extends CursorData>(
	items: T[],
	limit: number,
	getCursorData: (item: T) => C
): { items: T[]; nextCursor: string | null } {
	let nextCursor: string | null = null;

	if (items.length > limit) {
		// limit + 1件取得した場合、次ページがある
		const lastItem = items[limit - 1]; // 実際の最後のアイテム（0-indexed）
		nextCursor = encodeCursor(getCursorData(lastItem));
		items.pop(); // 余分な1件を削除
	}

	return { items, nextCursor };
}
