import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import type { Prisma } from '@prisma/client';
import type { ThemeCursor } from '$lib/server/api-types';
import { validateLimit, validateThemeCreate } from '$lib/server/validation';
import { decodeCursor, buildPaginatedResponse } from '$lib/server/pagination';

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

	// WHERE 句の構築（型安全）
	const where: Prisma.ThemeWhereInput = {
		userId: locals.user.id // ユーザースコープ制限（必須）
		// Prisma Client Extensions が自動的に state != 'DELETED' を追加
	};

	// isCompleted フィルタ
	if (!includeCompleted) {
		where.isCompleted = false;
	}

	// カーソルによる範囲指定
	if (cursorData) {
		where.OR = [
			{
				createdAt: {
					gt: new Date(cursorData.createdAt)
				}
			},
			{
				createdAt: new Date(cursorData.createdAt),
				id: {
					gt: cursorData.id
				}
			}
		];
	}

	try {
		// limit + 1 件取得して nextCursor の有無を判定
		const themes = await prisma.theme.findMany({
			where,
			orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
			take: limit + 1
		});

		// ページネーション結果の構築
		const { items, nextCursor } = buildPaginatedResponse(themes, limit, (theme) => ({
			createdAt: theme.createdAt.toISOString(),
			id: theme.id
		}));

		return json({
			items,
			nextCursor
		});
	} catch (error) {
		console.error('[GET /api/themes] Database error:', error);
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

	try {
		// テーマ作成（IDはDB側でuuid_v7()により自動生成）
		const theme = await prisma.theme.create({
			data: {
				userId: locals.user.id,
				name: themeData.name,
				goal: themeData.goal,
				...(themeData.shortName !== undefined && { shortName: themeData.shortName }),
				...(themeData.isCompleted !== undefined && { isCompleted: themeData.isCompleted })
			}
		});

		return json(theme, { status: 201 });
	} catch (error) {
		console.error('[POST /api/themes] Database error:', error);
		return json(
			{ error: { code: 'InternalServerError', message: 'Failed to create theme' } },
			{ status: 500 }
		);
	}
};
