import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateLogPatch } from '$lib/server/validation';
import { logService } from '$lib/server/services/log.service';
import { logDatabaseError } from '$lib/server/error-logging';

/**
 * GET /api/logs/[id]
 * ログ詳細を取得
 *
 * Response:
 * - 200: LearningLogEntry オブジェクト（テーマ情報含む）
 * - 401: Unauthorized
 * - 404: Not Found
 * - 500: InternalServerError
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	// 認証チェック
	if (!locals.user) {
		return json(
			{ error: { code: 'Unauthorized', message: 'Authentication required' } },
			{ status: 401 }
		);
	}

	const logId = params.id;

	// サービス呼び出し
	try {
		const log = await logService.getLogById({
			userId: locals.user.id,
			logId
		});

		if (!log) {
			return json({ error: { code: 'NotFound', message: 'Log not found' } }, { status: 404 });
		}

		return json(log);
	} catch (error) {
		logDatabaseError('GET /api/logs/[id]', error, { logId });
		return json(
			{ error: { code: 'InternalServerError', message: 'Database query failed' } },
			{ status: 500 }
		);
	}
};

/**
 * PATCH /api/logs/[id]
 * ログを更新
 *
 * Request Body (JSON):
 * - summary: string (optional) - 要約
 * - details: string | null (optional) - 詳細
 * - tags: string[] (optional) - タグ
 *
 * Response:
 * - 200: Updated LearningLogEntry オブジェクト
 * - 400: BadRequest - バリデーションエラー
 * - 401: Unauthorized - 認証エラー
 * - 404: Not Found - ログが存在しない
 * - 500: InternalServerError - サーバーエラー
 */
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	// 認証チェック
	if (!locals.user) {
		return json(
			{ error: { code: 'Unauthorized', message: 'Authentication required' } },
			{ status: 401 }
		);
	}

	const logId = params.id;

	// リクエストボディの取得
	let body: unknown;
	try {
		body = await request.json();
	} catch (error) {
		return json(
			{ error: { code: 'BadRequest', message: 'Invalid JSON body' } },
			{ status: 400 }
		);
	}

	// バリデーション
	const validationResult = validateLogPatch(body);
	if (validationResult.error) {
		return json(validationResult.error, { status: 400 });
	}

	const patchData = validationResult.data!;

	// サービス呼び出し
	try {
		const updatedLog = await logService.updateLogById({
			userId: locals.user.id,
			logId,
			data: patchData
		});

		if (!updatedLog) {
			return json({ error: { code: 'NotFound', message: 'Log not found' } }, { status: 404 });
		}

		return json(updatedLog);
	} catch (error) {
		logDatabaseError('PATCH /api/logs/[id]', error, {
			logId,
			updates: {
				hasSummary: patchData.summary !== undefined,
				hasDetails: patchData.details !== undefined,
				hasTags: patchData.tags !== undefined,
				tagsCount: patchData.tags?.length ?? 0
			}
		});
		return json(
			{ error: { code: 'InternalServerError', message: 'Failed to update log' } },
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/logs/[id]
 * ログを削除（論理削除）
 *
 * Response:
 * - 204: No Content
 * - 401: Unauthorized
 * - 404: Not Found
 * - 500: InternalServerError
 */
export const DELETE: RequestHandler = async ({ locals, params }) => {
	// 認証チェック
	if (!locals.user) {
		return json(
			{ error: { code: 'Unauthorized', message: 'Authentication required' } },
			{ status: 401 }
		);
	}

	const logId = params.id;

	// サービス呼び出し
	try {
		const deleted = await logService.deleteLogById({
			userId: locals.user.id,
			logId
		});

		if (!deleted) {
			return json({ error: { code: 'NotFound', message: 'Log not found' } }, { status: 404 });
		}

		return new Response(null, { status: 204 });
	} catch (error) {
		logDatabaseError('DELETE /api/logs/[id]', error, { logId });
		return json(
			{ error: { code: 'InternalServerError', message: 'Failed to delete log' } },
			{ status: 500 }
		);
	}
};
