import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateNotePatch } from '$lib/server/validation';
import { noteService } from '$lib/server/services/note.service';
import { logDatabaseError } from '$lib/server/error-logging';
import { Prisma } from '@prisma/client';

/**
 * GET /api/notes/[id]
 * メタノート詳細を取得
 *
 * Response:
 * - 200: MetaNote オブジェクト（関連ログとテーマ情報含む）
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

	const noteId = params.id;

	// サービス呼び出し
	try {
		const note = await noteService.getNoteById({
			userId: locals.user.id,
			noteId
		});

		if (!note) {
			return json({ error: { code: 'NotFound', message: 'Note not found' } }, { status: 404 });
		}

		return json(note);
	} catch (error) {
		logDatabaseError('GET /api/notes/[id]', error, { noteId });
		return json(
			{ error: { code: 'InternalServerError', message: 'Database query failed' } },
			{ status: 500 }
		);
	}
};

/**
 * PATCH /api/notes/[id]
 * メタノートを更新
 *
 * Request Body (JSON):
 * - category: string (optional) - カテゴリ（INSIGHT/QUESTION/EMOTION）
 * - body: string (optional) - 本文
 * - themeIds: string[] (optional) - 関連テーマID（中間テーブルを削除＆再挿入）
 * - relatedLogId: string | null (optional) - 関連ログID
 * - noteDate: 更新不可（仕様）
 *
 * Response:
 * - 200: Updated MetaNote オブジェクト
 * - 400: BadRequest - バリデーションエラー / 外部キー制約違反
 * - 401: Unauthorized - 認証エラー
 * - 404: Not Found - ノートが存在しない
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

	const noteId = params.id;

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
	const validationResult = validateNotePatch(body);
	if (validationResult.error) {
		return json(validationResult.error, { status: 400 });
	}

	const patchData = validationResult.data!;

	// サービス呼び出し
	try {
		const updatedNote = await noteService.updateNoteById({
			userId: locals.user.id,
			noteId,
			data: patchData
		});

		if (!updatedNote) {
			return json({ error: { code: 'NotFound', message: 'Note not found' } }, { status: 404 });
		}

		return json(updatedNote);
	} catch (error: unknown) {
		logDatabaseError('PATCH /api/notes/[id]', error, {
			noteId,
			updates: {
				hasCategory: patchData.category !== undefined,
				hasBody: patchData.body !== undefined,
				hasThemeIds: patchData.themeIds !== undefined,
				themeIdsCount: patchData.themeIds?.length ?? 0,
				hasRelatedLogId: patchData.relatedLogId !== undefined
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
			{ error: { code: 'InternalServerError', message: 'Failed to update note' } },
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/notes/[id]
 * メタノートを削除（論理削除）
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

	const noteId = params.id;

	// サービス呼び出し
	try {
		const deleted = await noteService.deleteNoteById({
			userId: locals.user.id,
			noteId
		});

		if (!deleted) {
			return json({ error: { code: 'NotFound', message: 'Note not found' } }, { status: 404 });
		}

		return new Response(null, { status: 204 });
	} catch (error) {
		logDatabaseError('DELETE /api/notes/[id]', error, { noteId });
		return json(
			{ error: { code: 'InternalServerError', message: 'Failed to delete note' } },
			{ status: 500 }
		);
	}
};
