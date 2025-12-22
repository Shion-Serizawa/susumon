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
		limit: number;
		cursorData: ThemeCursor | null;
	}) {
		const where: Prisma.ThemeWhereInput = {
			userId: params.userId
			// Prisma Client Extensions が自動的に state != 'DELETED' を追加
		};

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
}

// シングルトンインスタンスをエクスポート
export const themeService = new ThemeService();
