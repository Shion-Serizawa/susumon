import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { NoteCursor } from '$lib/server/api-types';
import {
	validateLimit,
	validateNoteCreate,
	validateUuidParam,
	validateDateParam,
	VALID_CATEGORIES,
	type MetaNoteCategory
} from '$lib/server/validation';
import { decodeCursor } from '$lib/server/pagination';
import { noteService } from '$lib/server/services/note.service';
import { logDatabaseError } from '$lib/server/error-logging';
import { Prisma } from '@prisma/client';

/**
 * GET /api/notes
 * メタノート一覧を取得
 *
 * Query Parameters:
 * - category: string (optional) - カテゴリでフィルタ（INSIGHT/QUESTION/EMOTION）
 * - themeId: string (optional) - テーマIDでフィルタ（中間テーブル経由）
 * - start: string (optional) - 開始日付（YYYY-MM-DD）
 * - end: string (optional) - 終了日付（YYYY-MM-DD）
 * - limit: number (1-200, default: 50) - 取得件数
 * - cursor: string (optional) - ページネーションカーソル
 *
 * Response:
 * - 200: { items: MetaNote[], nextCursor: string | null }
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
	const categoryParam = url.searchParams.get('category');
	const themeIdParam = url.searchParams.get('themeId');
	const startDateParam = url.searchParams.get('start');
	const endDateParam = url.searchParams.get('end');
	const limitParam = url.searchParams.get('limit');
	const cursorParam = url.searchParams.get('cursor');

	// category のバリデーション（オプション）
	let category: MetaNoteCategory | undefined = undefined;
	if (categoryParam) {
		if (!VALID_CATEGORIES.includes(categoryParam as MetaNoteCategory)) {
			return json(
				{
					error: {
						code: 'BadRequest',
						message: `category must be one of: ${VALID_CATEGORIES.join(', ')}`
					}
				},
				{ status: 400 }
			);
		}
		category = categoryParam as MetaNoteCategory;
	}

	// themeId のバリデーション（オプション）
	let themeIds: string[] | undefined = undefined;
	if (themeIdParam) {
		const themeIdResult = validateUuidParam(themeIdParam, 'themeId');
		if (themeIdResult.error) {
			return json(themeIdResult.error, { status: 400 });
		}
		themeIds = [themeIdResult.value];
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
	const cursorResult = decodeCursor<NoteCursor>(cursorParam);
	if (cursorResult.error) {
		return json(cursorResult.error, { status: 400 });
	}
	const cursorData = cursorResult.data;

	// サービス呼び出し
	try {
		const result = await noteService.listNotes({
			userId: locals.user.id,
			category,
			themeIds,
			startDate,
			endDate,
			limit,
			cursorData
		});

		return json(result);
	} catch (error) {
		logDatabaseError('GET /api/notes', error, {
			filters: {
				category,
				hasThemeId: !!themeIds,
				hasDateRange: !!(startDate || endDate),
				dateRange: startDate || endDate ? `${startDate || 'any'} to ${endDate || 'any'}` : undefined,
				limit
			}
		});
		return json(
			{ error: { code: 'InternalServerError', message: 'Database query failed' } },
			{ status: 500 }
		);
	}
};

/**
 * POST /api/notes
 * メタノートを作成
 *
 * Request Body (JSON):
 * - category: string (required) - カテゴリ（INSIGHT/QUESTION/EMOTION）
 * - body: string (required) - 本文
 * - themeIds: string[] (optional, default: []) - 関連テーマID
 * - relatedLogId: string | null (optional) - 関連ログID
 * - noteDate: サーバー側で自動生成（リクエストボディに含めない）
 *
 * Response:
 * - 201: Created - MetaNote オブジェクト
 * - 400: BadRequest - バリデーションエラー / 外部キー制約違反
 * - 401: Unauthorized - 認証エラー
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
	const validationResult = validateNoteCreate(body);
	if (validationResult.error) {
		return json(validationResult.error, { status: 400 });
	}

	const noteData = validationResult.data!;

	// サービス呼び出し
	try {
		const note = await noteService.createNote({
			userId: locals.user.id,
			...noteData
		});

		return json(note, { status: 201 });
	} catch (error: unknown) {
		logDatabaseError('POST /api/notes', error, {
			data: {
				category: noteData.category,
				hasBody: !!noteData.body,
				themeIdsCount: noteData.themeIds?.length ?? 0,
				hasRelatedLogId: noteData.relatedLogId !== undefined
			}
		});

		// Prismaエラーの型ガード
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			// P2003: 外部キー制約違反（themeId または relatedLogId が存在しない）
			if (error.code === 'P2003') {
				return json(
					{ error: { code: 'BadRequest', message: 'Referenced theme or log not found' } },
					{ status: 400 }
				);
			}
		}

		return json(
			{ error: { code: 'InternalServerError', message: 'Failed to create note' } },
			{ status: 500 }
		);
	}
};
