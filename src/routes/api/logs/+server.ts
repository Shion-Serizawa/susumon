import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { LogCursor } from '$lib/server/api-types';
import {
	validateLimit,
	validateLogCreate,
	validateUuidParam,
	validateDateParam
} from '$lib/server/validation';
import { decodeCursor } from '$lib/server/pagination';
import { logService } from '$lib/server/services/log.service';
import { Prisma } from '@prisma/client';

/**
 * GET /api/logs
 * ログ一覧を取得
 *
 * Query Parameters:
 * - themeId: string (optional) - テーマIDでフィルタ
 * - start: string (optional) - 開始日付（YYYY-MM-DD）
 * - end: string (optional) - 終了日付（YYYY-MM-DD）
 * - limit: number (1-200, default: 50) - 取得件数
 * - cursor: string (optional) - ページネーションカーソル
 *
 * Response:
 * - 200: { items: LearningLogEntry[], nextCursor: string | null }
 * - 401: Unauthorized
 * - 400: BadRequest
 * - 500: InternalServerError
 */
export const GET: RequestHandler = async ({ locals, url }) => {
	// 認証チェック
	if (!locals.user) {
		return json(
			{ error: { code: 'Unauthorized', message: 'Authentication required' } },
			{ status: 401 }
		);
	}

	// クエリパラメータの取得
	const themeIdParam = url.searchParams.get('themeId');
	const startDateParam = url.searchParams.get('start');
	const endDateParam = url.searchParams.get('end');
	const limitParam = url.searchParams.get('limit');
	const cursorParam = url.searchParams.get('cursor');

	// themeId のバリデーション（オプション）
	let themeId: string | undefined = undefined;
	if (themeIdParam) {
		const themeIdResult = validateUuidParam(themeIdParam, 'themeId');
		if (themeIdResult.error) {
			return json(themeIdResult.error, { status: 400 });
		}
		themeId = themeIdResult.value;
	}

	// 日付パラメータのバリデーション（オプション）
	let startDate: string | undefined = undefined;
	let endDate: string | undefined = undefined;

	if (startDateParam) {
		const startDateResult = validateDateParam(startDateParam, 'start');
		if (startDateResult.error) {
			return json(startDateResult.error, { status: 400 });
		}
		startDate = startDateResult.value;
	}

	if (endDateParam) {
		const endDateResult = validateDateParam(endDateParam, 'end');
		if (endDateResult.error) {
			return json(endDateResult.error, { status: 400 });
		}
		endDate = endDateResult.value;
	}

	// limit のバリデーション
	const limitResult = validateLimit(limitParam);
	if (limitResult.error) {
		return json(limitResult.error, { status: 400 });
	}
	const limit = limitResult.value;

	// cursor のデコード
	const cursorResult = decodeCursor<LogCursor>(cursorParam);
	if (cursorResult.error) {
		return json(cursorResult.error, { status: 400 });
	}
	const cursorData = cursorResult.data;

	// サービス呼び出し
	try {
		const result = await logService.listLogs({
			userId: locals.user.id,
			themeId,
			startDate,
			endDate,
			limit,
			cursorData
		});

		return json(result);
	} catch (error) {
		console.error('[GET /api/logs] Database error:', error);
		return json(
			{ error: { code: 'InternalServerError', message: 'Database query failed' } },
			{ status: 500 }
		);
	}
};

/**
 * POST /api/logs
 * ログを作成
 *
 * Request Body (JSON):
 * - themeId: string (required) - テーマID
 * - date: string (required) - 日付（YYYY-MM-DD）
 * - summary: string (required) - 要約
 * - details: string | null (optional) - 詳細
 * - tags: string[] (optional, default: []) - タグ
 *
 * Response:
 * - 201: Created - LearningLogEntry オブジェクト
 * - 400: BadRequest - バリデーションエラー / 外部キー制約違反
 * - 401: Unauthorized - 認証エラー
 * - 409: Conflict - 1日1テーマ1ログ制約違反
 * - 500: InternalServerError - サーバーエラー
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	// 認証チェック
	if (!locals.user) {
		return json(
			{ error: { code: 'Unauthorized', message: 'Authentication required' } },
			{ status: 401 }
		);
	}

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
	const validationResult = validateLogCreate(body);
	if (validationResult.error) {
		return json(validationResult.error, { status: 400 });
	}

	const logData = validationResult.data!;

	// サービス呼び出し
	try {
		const log = await logService.createLog({
			userId: locals.user.id,
			...logData
		});

		return json(log, { status: 201 });
	} catch (error: unknown) {
		console.error('[POST /api/logs] Database error:', error);

		// Prismaエラーの型ガード
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			// P2002: 一意制約違反（1日1テーマ1ログ制約）
			if (error.code === 'P2002') {
				return json(
					{
						error: {
							code: 'Conflict',
							message: 'A log for this theme on this date already exists'
						}
					},
					{ status: 409 }
				);
			}

			// P2003: 外部キー制約違反（themeIdが存在しない）
			if (error.code === 'P2003') {
				return json(
					{ error: { code: 'BadRequest', message: 'Referenced theme not found' } },
					{ status: 400 }
				);
			}
		}

		return json(
			{ error: { code: 'InternalServerError', message: 'Failed to create log' } },
			{ status: 500 }
		);
	}
};
