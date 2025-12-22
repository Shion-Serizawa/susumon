import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';

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
	const limit = limitParam ? parseInt(limitParam, 10) : 50;
	if (limit < 1 || limit > 200 || isNaN(limit)) {
		return json(
			{
				error: {
					code: 'BadRequest',
					message: 'limit must be between 1 and 200'
				}
			},
			{ status: 400 }
		);
	}

	// cursor のデコード
	let cursorData: { createdAt: string; id: string } | null = null;
	if (cursorParam) {
		try {
			cursorData = JSON.parse(atob(cursorParam));
		} catch (error) {
			return json(
				{ error: { code: 'BadRequest', message: 'Invalid cursor format' } },
				{ status: 400 }
			);
		}
	}

	// WHERE 句の構築
	const where: any = {
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

		// nextCursor の生成
		let nextCursor: string | null = null;
		if (themes.length > limit) {
			const lastItem = themes[limit - 1];
			nextCursor = btoa(
				JSON.stringify({
					createdAt: lastItem.createdAt.toISOString(),
					id: lastItem.id
				})
			);
			themes.pop(); // 余分な1件を削除
		}

		return json({
			items: themes,
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
