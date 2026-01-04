import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ThemeCursor } from '$lib/server/api-types';
import { validateLimit, validateThemeCreate } from '$lib/server/validation';
import { decodeCursor } from '$lib/server/pagination';
import { themeService } from '$lib/server/services/theme.service';
import { logDatabaseError } from '$lib/server/error-logging';

/**
 * GET /api/themes
 * テーマ一覧を取得
 *
 * Query Parameters:
 * - includeCompleted: boolean (default: false) - 完了済みテーマを含めるか
 * - limit: number (1-200, default: 50) - 取得件数
 * - cursor: string (optional) - ページネーションカーソル
 *
 * Response:
 * - 200: { items: Theme[], nextCursor: string | null }
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
	const includeCompleted = url.searchParams.get('includeCompleted') === 'true';
	const includeArchived = url.searchParams.get('includeArchived') === 'true';
	const limitParam = url.searchParams.get('limit');
	const cursorParam = url.searchParams.get('cursor');

	// limit のバリデーション
	const limitResult = validateLimit(limitParam);
	if (limitResult.error) {
		return json(limitResult.error, { status: 400 });
	}
	const limit = limitResult.value;

	// cursor のデコード
	const cursorResult = decodeCursor<ThemeCursor>(cursorParam);
	if (cursorResult.error) {
		return json(cursorResult.error, { status: 400 });
	}
	const cursorData = cursorResult.data;

	// サービス呼び出し
	try {
		const result = await themeService.listThemes({
			userId: locals.user.id,
			includeCompleted,
			includeArchived,
			limit,
			cursorData
		});

		return json(result);
	} catch (error) {
		logDatabaseError('GET /api/themes', error, {
			filters: { includeCompleted, includeArchived, limit }
		});
		return json(
			{ error: { code: 'InternalServerError', message: 'Database query failed' } },
			{ status: 500 }
		);
	}
};

/**
 * POST /api/themes
 * テーマを作成
 *
 * Request Body (JSON):
 * - name: string (required) - テーマ名
 * - goal: string (required) - 目標
 * - shortName: string | null (optional) - 短縮名
 * - isCompleted: boolean (optional, default: false) - 完了フラグ
 *
 * Response:
 * - 201: Created - Theme オブジェクト
 * - 400: BadRequest - バリデーションエラー
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
	const validationResult = validateThemeCreate(body);
	if (validationResult.error) {
		return json(validationResult.error, { status: 400 });
	}

	const themeData = validationResult.data!;

	// サービス呼び出し
	try {
		const theme = await themeService.createTheme({
			userId: locals.user.id,
			...themeData
		});

		return json(theme, { status: 201 });
	} catch (error) {
		logDatabaseError('POST /api/themes', error, {
			data: {
				hasName: !!themeData.name,
				hasGoal: !!themeData.goal
			}
		});
		return json(
			{ error: { code: 'InternalServerError', message: 'Failed to create theme' } },
			{ status: 500 }
		);
	}
};
