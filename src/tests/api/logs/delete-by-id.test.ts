import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DELETE } from '../../../routes/api/logs/[id]/+server';
import {
	cleanupDatabase,
	mockUser,
	mockUser2,
	createTestTheme,
	createTestLog
} from '$lib/server/test-utils';
import { prisma } from '$lib/server/db';

describe('DELETE /api/logs/[id]', () => {
	beforeEach(async () => {
		await cleanupDatabase();
	});

	afterEach(async () => {
		await cleanupDatabase();
	});

	it('should return 401 when user is not authenticated', async () => {
		// Arrange
		const request = new Request(
			'http://localhost:5173/api/logs/00000000-0000-0000-0000-000000000001',
			{
				method: 'DELETE'
			}
		);
		const event = {
			request,
			locals: {},
			url: new URL('http://localhost:5173/api/logs/00000000-0000-0000-0000-000000000001'),
			params: { id: '00000000-0000-0000-0000-000000000001' },
			route: { id: '/api/logs/[id]' }
		} as any;

		// Act
		const response = await DELETE(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(401);
		expect(body).toEqual({
			error: {
				code: 'Unauthorized',
				message: 'Authentication required'
			}
		});
	});

	it('should delete log successfully (logical delete)', async () => {
		// Arrange
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const log = await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-15',
			summary: 'Test log'
		});

		const request = new Request(`http://localhost:5173/api/logs/${log.id}`, {
			method: 'DELETE'
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: log.id },
			route: { id: '/api/logs/[id]' }
		} as any;

		// Act
		const response = await DELETE(event);

		// Assert
		expect(response.status).toBe(204);
		expect(response.body).toBeNull();

		// Verify log is logically deleted (state = 'DELETED')
		const deletedLog = await prisma.$queryRaw<
			Array<{ id: string; state: string }>
		>`SELECT id, state FROM learning_log_entries WHERE id = ${log.id}::uuid`;
		expect(deletedLog).toHaveLength(1);
		expect(deletedLog[0].state).toBe('DELETED');

		// Verify log is not accessible via normal query (Prisma Extensions filter it out)
		const normalQuery = await prisma.learningLogEntry.findFirst({
			where: { id: log.id, userId: mockUser.id }
		});
		expect(normalQuery).toBeNull();
	});

	it('should return 404 when log does not exist', async () => {
		// Arrange
		const nonExistentId = '00000000-0000-0000-0000-999999999999';
		const request = new Request(`http://localhost:5173/api/logs/${nonExistentId}`, {
			method: 'DELETE'
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: nonExistentId },
			route: { id: '/api/logs/[id]' }
		} as any;

		// Act
		const response = await DELETE(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(404);
		expect(body).toEqual({
			error: {
				code: 'NotFound',
				message: 'Log not found'
			}
		});
	});

	it('should not delete log from another user (user isolation)', async () => {
		// Arrange: Create log for user2
		const theme = await createTestTheme(mockUser2.id, {
			name: 'User2 Theme',
			goal: 'Goal for user 2'
		});

		const log = await createTestLog(mockUser2.id, {
			themeId: theme.id,
			date: '2025-01-15',
			summary: 'User2 Log'
		});

		// Try to delete with mockUser
		const request = new Request(`http://localhost:5173/api/logs/${log.id}`, {
			method: 'DELETE'
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: log.id },
			route: { id: '/api/logs/[id]' }
		} as any;

		// Act
		const response = await DELETE(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(404);
		expect(body).toEqual({
			error: {
				code: 'NotFound',
				message: 'Log not found'
			}
		});

		// Verify log is still ACTIVE
		const stillActiveLog = await prisma.$queryRaw<
			Array<{ id: string; state: string }>
		>`SELECT id, state FROM learning_log_entries WHERE id = ${log.id}::uuid`;
		expect(stillActiveLog).toHaveLength(1);
		expect(stillActiveLog[0].state).toBe('ACTIVE');
	});

	it('should return 404 when trying to delete already deleted log', async () => {
		// Arrange: Create and delete log
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const log = await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-15',
			summary: 'Test log',
			state: 'DELETED'
		});

		const request = new Request(`http://localhost:5173/api/logs/${log.id}`, {
			method: 'DELETE'
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: log.id },
			route: { id: '/api/logs/[id]' }
		} as any;

		// Act
		const response = await DELETE(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(404);
		expect(body).toEqual({
			error: {
				code: 'NotFound',
				message: 'Log not found'
			}
		});
	});
});
