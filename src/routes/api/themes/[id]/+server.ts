import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { themeService } from '$lib/server/services/theme.service';
import { validateThemePatch, validateUuidParam } from '$lib/server/validation';
import { logDatabaseError } from '$lib/server/error-logging';

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
		logDatabaseError('GET /api/themes/[id]', error, { themeId: themeIdResult.value });
		return json(
			{ error: { code: 'InternalServerError', message: 'Database query failed' } },
			{ status: 500 }
		);
	}
};

/**
 * PATCH /api/themes/[id]
 * テーマを更新
 *
 * Request Body (JSON):
 * - name: string (optional) - テーマ名
 * - shortName: string | null (optional) - 短縮名
 * - goal: string (optional) - 目標
 * - isCompleted: boolean (optional) - 完了フラグ
 *
 * Response:
 * - 200: Theme
 * - 400: BadRequest
 * - 401: Unauthorized
 * - 404: NotFound
 * - 500: InternalServerError
 */
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
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

	// リクエストボディの取得
	let body: unknown;
	try {
		body = await request.json();
	} catch (error) {
		return json({ error: { code: 'BadRequest', message: 'Invalid JSON body' } }, { status: 400 });
	}

	// バリデーション
	const validationResult = validateThemePatch(body);
	if (validationResult.error) {
		return json(validationResult.error, { status: 400 });
	}

	const patchData = validationResult.data!;

	// サービス呼び出し
	try {
		const theme = await themeService.updateThemeById({
			userId: locals.user.id,
			themeId: themeIdResult.value,
			data: patchData
		});

		if (!theme) {
			return json({ error: { code: 'NotFound', message: 'Theme not found' } }, { status: 404 });
		}

		return json(theme);
	} catch (error) {
		logDatabaseError('PATCH /api/themes/[id]', error, {
			themeId: themeIdResult.value,
			updates: {
				hasName: patchData.name !== undefined,
				hasGoal: patchData.goal !== undefined,
				hasIsCompleted: patchData.isCompleted !== undefined
			}
		});
		return json(
			{ error: { code: 'InternalServerError', message: 'Failed to update theme' } },
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/themes/[id]
 * テーマを削除（論理削除）
 *
 * Response:
 * - 204: No Content
 * - 400: BadRequest
 * - 401: Unauthorized
 * - 404: NotFound
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

	// パスパラメータのバリデーション
	const themeIdResult = validateUuidParam(params.id, 'id');
	if (themeIdResult.error) {
		return json(themeIdResult.error, { status: 400 });
	}

	try {
		const deleted = await themeService.deleteThemeById({
			userId: locals.user.id,
			themeId: themeIdResult.value
		});

		if (!deleted) {
			return json({ error: { code: 'NotFound', message: 'Theme not found' } }, { status: 404 });
		}

		return new Response(null, { status: 204 });
	} catch (error) {
		logDatabaseError('DELETE /api/themes/[id]', error, { themeId: themeIdResult.value });
		return json(
			{ error: { code: 'InternalServerError', message: 'Failed to delete theme' } },
			{ status: 500 }
		);
	}
};
