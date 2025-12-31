/**
 * LearningLog Service
 * 学習ログに関するビジネスロジック
 */

import { prisma } from '$lib/server/db';
import type { Prisma, LearningLogEntry } from '@prisma/client';
import type { LogCursor } from '$lib/server/api-types';
import { buildPaginatedResponse } from '$lib/server/pagination';
import { formatDateAsLocal } from '$lib/server/date-utils';

export class LogService {
	/**
	 * ログ一覧を取得
	 */
	async listLogs(params: {
		userId: string;
		themeId?: string;
		startDate?: string;
		endDate?: string;
		limit: number;
		cursorData: LogCursor | null;
	}) {
		const where: Prisma.LearningLogEntryWhereInput = {
			userId: params.userId
			// Prisma Client Extensions が自動的に state != 'DELETED' を追加
		};

		// themeId フィルタ
		if (params.themeId) {
			where.themeId = params.themeId;
		}

		// 日付範囲フィルタ
		if (params.startDate || params.endDate) {
			where.date = {};
			if (params.startDate) {
				where.date.gte = new Date(params.startDate);
			}
			if (params.endDate) {
				where.date.lte = new Date(params.endDate);
			}
		}

		// カーソルによる範囲指定
		// 並び順: date desc, createdAt desc, id desc
		if (params.cursorData) {
			const cursorDate = new Date(params.cursorData.date);
			const cursorCreatedAt = new Date(params.cursorData.createdAt);

			where.OR = [
				// date が cursor より小さい（降順なので過去の日付）
				{ date: { lt: cursorDate } },
				// date が同じで createdAt が小さい
				{
					date: cursorDate,
					createdAt: { lt: cursorCreatedAt }
				},
				// date と createdAt が同じで id が小さい
				{
					date: cursorDate,
					createdAt: cursorCreatedAt,
					id: { lt: params.cursorData.id }
				}
			];
		}

		// limit + 1 件取得して nextCursor の有無を判定
		const logs = await prisma.learningLogEntry.findMany({
			where,
			orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
			take: params.limit + 1
		});

		// ページネーション結果の構築
		return buildPaginatedResponse(logs, params.limit, (log) => ({
			date: formatDateAsLocal(log.date), // YYYY-MM-DD（ローカルタイムゾーン）
			createdAt: log.createdAt.toISOString(),
			id: log.id
		}));
	}

	/**
	 * ログを作成
	 */
	async createLog(data: {
		userId: string;
		themeId: string;
		date: string;
		summary: string;
		details?: string | null;
		tags?: string[];
	}): Promise<LearningLogEntry> {
		return prisma.learningLogEntry.create({
			data: {
				userId: data.userId,
				themeId: data.themeId,
				date: new Date(data.date),
				summary: data.summary,
				...(data.details !== undefined && { details: data.details }),
				...(data.tags !== undefined && { tags: data.tags })
			}
		});
	}

	/**
	 * ログ詳細を取得（テーマ情報含む）
	 */
	async getLogById(params: {
		userId: string;
		logId: string;
	}): Promise<(LearningLogEntry & { theme: { id: string; name: string } }) | null> {
		const log = await prisma.learningLogEntry.findFirst({
			where: {
				userId: params.userId,
				id: params.logId
			},
			include: {
				theme: {
					select: {
						id: true,
						name: true
					}
				}
			}
		});

		return log;
	}

	/**
	 * ログを更新
	 */
	async updateLogById(params: {
		userId: string;
		logId: string;
		data: {
			summary?: string;
			details?: string | null;
			tags?: string[];
		};
	}): Promise<LearningLogEntry | null> {
		const updateResult = await prisma.learningLogEntry.updateMany({
			where: {
				userId: params.userId,
				id: params.logId,
				state: { not: 'DELETED' }
			},
			data: params.data as Prisma.LearningLogEntryUpdateManyMutationInput
		});

		if (updateResult.count === 0) {
			return null;
		}

		return prisma.learningLogEntry.findFirst({
			where: {
				userId: params.userId,
				id: params.logId
			}
		});
	}

	/**
	 * ログを削除（論理削除）
	 */
	async deleteLogById(params: { userId: string; logId: string }): Promise<boolean> {
		const now = new Date();

		const updateResult = await prisma.learningLogEntry.updateMany({
			where: {
				userId: params.userId,
				id: params.logId,
				state: { not: 'DELETED' }
			},
			data: {
				state: 'DELETED',
				stateChangedAt: now
			}
		});

		return updateResult.count > 0;
	}
}

// シングルトンインスタンスをエクスポート
export const logService = new LogService();
