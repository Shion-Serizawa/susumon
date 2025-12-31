/**
 * エラーログ共通ユーティリティ
 *
 * エンドポイント間でエラーログフォーマットの一貫性を保つためのヘルパー関数
 */

/**
 * データベースエラーを構造化ログとして出力
 *
 * @param endpoint - エンドポイント名（例: 'GET /api/logs'）
 * @param error - エラーオブジェクト
 * @param context - 追加のコンテキスト情報（フィルタ、データ等）
 */
export function logDatabaseError(
	endpoint: string,
	error: unknown,
	context?: Record<string, unknown>
): void {
	console.error(`[${endpoint}] Database error:`, {
		...context,
		errorType: error instanceof Error ? error.constructor.name : typeof error,
		message: error instanceof Error ? error.message : String(error),
		// スタックトレースは開発環境でのみ出力（本番では長すぎる可能性）
		...(process.env.NODE_ENV === 'development' && error instanceof Error
			? { stack: error.stack }
			: {})
	});
}
