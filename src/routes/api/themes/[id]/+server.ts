import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { themeService } from '$lib/server/services/theme.service';
import { validateUuidParam } from '$lib/server/validation';

/**
 * GET /api/themes/[id]
 * テーマ詳細を取得
 *
 * Path Parameters:
 * - id: string (uuid) - テーマID
 *
 * Response:
 * - 200: Theme
 * - 400: BadRequest
 * - 401: Unauthorized
 * - 404: NotFound
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

	// パスパラメータのバリデーション
	const themeIdResult = validateUuidParam(params.id, 'id');
	if (themeIdResult.error) {
		return json(themeIdResult.error, { status: 400 });
	}

	// サービス呼び出し
	try {
		const theme = await themeService.getThemeById({
			userId: locals.user.id,
			themeId: themeIdResult.value
		});

		if (!theme) {
			return json({ error: { code: 'NotFound', message: 'Theme not found' } }, { status: 404 });
		}

		return json(theme);
	} catch (error) {
		console.error('[GET /api/themes/[id]] Database error:', error);
		return json(
			{ error: { code: 'InternalServerError', message: 'Database query failed' } },
			{ status: 500 }
		);
	}
};

