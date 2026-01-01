/**
 * MetaNote Service
 * メタノートに関するビジネスロジック
 */

import { prisma } from '$lib/server/db';
import type { Prisma, MetaNote } from '@prisma/client';
import type { NoteCursor } from '$lib/server/api-types';
import { buildPaginatedResponse } from '$lib/server/pagination';
import type { MetaNoteCategory } from '$lib/server/validation';

/**
 * MetaNote with関連エンティティ
 */
export interface MetaNoteWithRelations extends MetaNote {
	relatedLog?: {
		id: string;
		themeId: string;
		date: Date;
		summary: string;
	} | null;
	themes: {
		id: string;
		name: string;
	}[];
}

/**
 * 現在のJST日付（YYYY-MM-DD）を取得
 */
export function getCurrentJSTDate(): string {
	const now = new Date();
	// UTC → JST (+9時間)
	const jstOffset = 9 * 60 * 60 * 1000;
	const jstTime = new Date(now.getTime() + jstOffset);

	const year = jstTime.getUTCFullYear();
	const month = String(jstTime.getUTCMonth() + 1).padStart(2, '0');
	const day = String(jstTime.getUTCDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

export class NoteService {
	/**
	 * メタノート一覧を取得
	 */
	async listNotes(params: {
		userId: string;
		category?: MetaNoteCategory;
		themeIds?: string[];
		startDate?: string;
		endDate?: string;
		limit: number;
		cursorData: NoteCursor | null;
	}) {
		const where: Prisma.MetaNoteWhereInput = {
			userId: params.userId
			// Prisma Client Extensions が自動的に state != 'DELETED' を追加
		};

		// category フィルタ
		if (params.category) {
			where.category = params.category;
		}

		// themeIds フィルタ（中間テーブル経由）
		if (params.themeIds && params.themeIds.length > 0) {
			where.metaNoteThemes = {
				some: {
					themeId: {
						in: params.themeIds
					}
				}
			};
		}

		// startDate / endDate フィルタ
		if (params.startDate || params.endDate) {
			where.noteDate = {};
			if (params.startDate) {
				where.noteDate.gte = new Date(params.startDate);
			}
			if (params.endDate) {
				where.noteDate.lte = new Date(params.endDate);
			}
		}

		// カーソルによる範囲指定
		if (params.cursorData) {
			where.OR = [
				{
					noteDate: {
						lt: new Date(params.cursorData.noteDate)
					}
				},
				{
					noteDate: new Date(params.cursorData.noteDate),
					createdAt: {
						lt: new Date(params.cursorData.createdAt)
					}
				},
				{
					noteDate: new Date(params.cursorData.noteDate),
					createdAt: new Date(params.cursorData.createdAt),
					id: {
						lt: params.cursorData.id
					}
				}
			];
		}

		// limit + 1 件取得して nextCursor の有無を判定
		const notes = await prisma.metaNote.findMany({
			where,
			orderBy: [{ noteDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
			take: params.limit + 1
		});

		// ページネーション結果の構築
		return buildPaginatedResponse(notes, params.limit, (note) => ({
			noteDate: note.noteDate.toISOString().split('T')[0],
			createdAt: note.createdAt.toISOString(),
			id: note.id
		}));
	}

	/**
	 * メタノートを作成
	 * - noteDate はサーバー側で自動生成（作成時のJST日付）
	 * - themeIds が指定された場合は中間テーブルに挿入
	 */
	async createNote(data: {
		userId: string;
		category: MetaNoteCategory;
		body: string;
		themeIds?: string[];
		relatedLogId?: string | null;
	}): Promise<MetaNote> {
		const noteDate = getCurrentJSTDate();

		return prisma.$transaction(async (tx) => {
			// MetaNote 作成
			const note = await tx.metaNote.create({
				data: {
					userId: data.userId,
					category: data.category,
					body: data.body,
					noteDate: new Date(noteDate),
					...(data.relatedLogId && { relatedLogId: data.relatedLogId })
				}
			});

			// themeIds が指定されている場合、中間テーブルに挿入
			if (data.themeIds && data.themeIds.length > 0) {
				await tx.metaNoteTheme.createMany({
					data: data.themeIds.map((themeId) => ({
						metaNoteId: note.id,
						themeId
					}))
				});
			}

			return note;
		});
	}

	/**
	 * メタノート詳細を取得
	 * - 関連ログとテーマ情報を含む
	 */
	async getNoteById(params: {
		userId: string;
		noteId: string;
	}): Promise<MetaNoteWithRelations | null> {
		const note = await prisma.metaNote.findFirst({
			where: {
				userId: params.userId,
				id: params.noteId
			},
			include: {
				relatedLog: {
					select: {
						id: true,
						themeId: true,
						date: true,
						summary: true
					}
				},
				metaNoteThemes: {
					include: {
						theme: {
							select: {
								id: true,
								name: true
							}
						}
					}
				}
			}
		});

		if (!note) {
			return null;
		}

		// metaNoteThemes から themes に変換
		return {
			...note,
			themes: note.metaNoteThemes.map((mnt) => mnt.theme)
		};
	}

	/**
	 * メタノートを更新
	 * - userId スコープで越境を防止
	 * - noteDate は更新不可（仕様）
	 * - themeIds 更新時は中間テーブルを削除＆再挿入
	 */
	async updateNoteById(params: {
		userId: string;
		noteId: string;
		data: {
			category?: MetaNoteCategory;
			body?: string;
			themeIds?: string[];
			relatedLogId?: string | null;
		};
	}): Promise<MetaNote | null> {
		return prisma.$transaction(async (tx) => {
			// 更新対象のデータ（noteDate を除く）
			const updateData: Prisma.MetaNoteUpdateInput = {};

			if (params.data.category !== undefined) {
				updateData.category = params.data.category;
			}
			if (params.data.body !== undefined) {
				updateData.body = params.data.body;
			}
			if (params.data.relatedLogId !== undefined) {
				updateData.relatedLogId = params.data.relatedLogId;
			}

			// MetaNote を更新
			const updateResult = await tx.metaNote.updateMany({
				where: {
					userId: params.userId,
					id: params.noteId,
					state: { not: 'DELETED' }
				},
				data: updateData
			});

			if (updateResult.count === 0) {
				return null;
			}

			// themeIds 更新時は中間テーブルを削除＆再挿入
			if (params.data.themeIds !== undefined) {
				// 既存の関連を削除
				await tx.metaNoteTheme.deleteMany({
					where: {
						metaNoteId: params.noteId
					}
				});

				// 新しい関連を挿入
				if (params.data.themeIds.length > 0) {
					await tx.metaNoteTheme.createMany({
						data: params.data.themeIds.map((themeId) => ({
							metaNoteId: params.noteId,
							themeId
						}))
					});
				}
			}

			// 更新後のデータを取得
			return tx.metaNote.findFirst({
				where: {
					userId: params.userId,
					id: params.noteId
				}
			});
		});
	}

	/**
	 * メタノートを削除（論理削除）
	 * - note.state を 'DELETED' に更新
	 * - 中間テーブルは自動的にカスケード削除される（Prismaスキーマ）
	 */
	async deleteNoteById(params: { userId: string; noteId: string }): Promise<boolean> {
		const now = new Date();

		const result = await prisma.metaNote.updateMany({
			where: {
				userId: params.userId,
				id: params.noteId,
				state: { not: 'DELETED' }
			},
			data: {
				state: 'DELETED',
				stateChangedAt: now
			}
		});

		return result.count > 0;
	}
}

// シングルトンインスタンスをエクスポート
export const noteService = new NoteService();
