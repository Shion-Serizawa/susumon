/**
 * API共通型定義
 */

/**
 * エラーレスポンス
 */
export interface ApiError {
	error: {
		code: string;
		message: string;
	};
}

/**
 * ページネーション付きレスポンス
 */
export interface PaginatedResponse<T> {
	items: T[];
	nextCursor: string | null;
}

/**
 * カーソルベースページネーションのカーソルデータ
 */
export interface CursorData {
	[key: string]: string | number | boolean;
}

/**
 * Theme API 用のカーソル
 */
export interface ThemeCursor extends CursorData {
	createdAt: string;
	id: string;
}

/**
 * LearningLogEntry API 用のカーソル（将来用）
 */
export interface LogCursor extends CursorData {
	date: string;
	createdAt: string;
	id: string;
}

/**
 * MetaNote API 用のカーソル（将来用）
 */
export interface NoteCursor extends CursorData {
	noteDate: string;
	createdAt: string;
	id: string;
}
