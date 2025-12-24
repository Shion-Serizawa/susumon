/**
 * Theme Service
 * テーマに関するビジネスロジック
 */

import { prisma } from '$lib/server/db';
import type { Prisma, Theme } from '@prisma/client';
import type { ThemeCursor } from '$lib/server/api-types';
import { buildPaginatedResponse } from '$lib/server/pagination';

export class ThemeService {
	/**
	 * テーマ一覧を取得
	 */
	async listThemes(params: {
		userId: string;
		includeCompleted: boolean;
		includeArchived: boolean;
		limit: number;
		cursorData: ThemeCursor | null;
	}) {
		const where: Prisma.ThemeWhereInput = {
			userId: params.userId
			// Prisma Client Extensions が自動的に state != 'DELETED' を追加
		};

		// state フィルタ（デフォルトは ACTIVE のみ）
		if (!params.includeArchived) {
			where.state = 'ACTIVE';
		}

		// isCompleted フィルタ
		if (!params.includeCompleted) {
			where.isCompleted = false;
		}

		// カーソルによる範囲指定
		if (params.cursorData) {
			where.OR = [
				{
					createdAt: {
						gt: new Date(params.cursorData.createdAt)
					}
				},
				{
					createdAt: new Date(params.cursorData.createdAt),
					id: {
						gt: params.cursorData.id
					}
				}
			];
		}

		// limit + 1 件取得して nextCursor の有無を判定
		const themes = await prisma.theme.findMany({
			where,
			orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
			take: params.limit + 1
		});

		// ページネーション結果の構築
		return buildPaginatedResponse(themes, params.limit, (theme) => ({
			createdAt: theme.createdAt.toISOString(),
			id: theme.id
		}));
	}

	/**
	 * テーマを作成
	 */
	async createTheme(data: {
		userId: string;
		name: string;
		goal: string;
		shortName?: string | null;
		isCompleted?: boolean;
	}): Promise<Theme> {
		return prisma.theme.create({
			data: {
				userId: data.userId,
				name: data.name,
				goal: data.goal,
				...(data.shortName !== undefined && { shortName: data.shortName }),
				...(data.isCompleted !== undefined && { isCompleted: data.isCompleted })
			}
		});
	}

	/**
	 * テーマ詳細を取得
	 */
	async getThemeById(params: { userId: string; themeId: string }): Promise<Theme | null> {
		return prisma.theme.findFirst({
			where: {
				userId: params.userId,
				id: params.themeId
			}
		});
	}

	/**
	 * テーマを更新
	 * - userId スコープで越境を防止
	 * - state = 'DELETED' は更新対象外
	 */
	async updateThemeById(params: {
		userId: string;
		themeId: string;
		data: {
			name?: string;
			goal?: string;
			shortName?: string | null;
			isCompleted?: boolean;
		};
	}): Promise<Theme | null> {
		const updateResult = await prisma.theme.updateMany({
			where: {
				userId: params.userId,
				id: params.themeId,
				state: { not: 'DELETED' }
			},
			data: params.data as Prisma.ThemeUpdateManyMutationInput
		});

		if (updateResult.count === 0) {
			return null;
		}

		return prisma.theme.findFirst({
			where: {
				userId: params.userId,
				id: params.themeId
			}
		});
	}

	/**
	 * テーマを削除（論理削除）
	 * - theme.state を 'DELETED' に更新
	 * - 関連する logs / notes も 'DELETED' に更新（v0.2 仕様）
	 */
	async deleteThemeById(params: { userId: string; themeId: string }): Promise<boolean> {
		const now = new Date();

		const result = await prisma.$transaction(async (tx) => {
			const themeUpdate = await tx.theme.updateMany({
				where: {
					userId: params.userId,
					id: params.themeId,
					state: { not: 'DELETED' }
				},
				data: {
					state: 'DELETED',
					stateChangedAt: now
				}
			});

			if (themeUpdate.count === 0) {
				return { deleted: false };
			}

			await tx.learningLogEntry.updateMany({
				where: {
					userId: params.userId,
					themeId: params.themeId,
					state: { not: 'DELETED' }
				},
				data: {
					state: 'DELETED',
					stateChangedAt: now
				}
			});

			await tx.metaNote.updateMany({
				where: {
					userId: params.userId,
					state: { not: 'DELETED' },
					metaNoteThemes: {
						some: { themeId: params.themeId }
					}
				},
				data: {
					state: 'DELETED',
					stateChangedAt: now
				}
			});

			return { deleted: true };
		});

		return result.deleted;
	}
}

// シングルトンインスタンスをエクスポート
export const themeService = new ThemeService();
