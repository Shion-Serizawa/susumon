import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from '../../../routes/api/logs/[id]/+server';
import {
	cleanupDatabase,
	mockUser,
	mockUser2,
	createTestTheme,
	createTestLog
} from '$lib/server/test-utils';

describe('GET /api/logs/[id]', () => {
	beforeEach(async () => {
		await cleanupDatabase();
	});

	afterEach(async () => {
		await cleanupDatabase();
	});

	it('should return 401 when user is not authenticated', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/logs/00000000-0000-0000-0000-000000000001');
		const event = {
			request,
			locals: {},
			url: new URL('http://localhost:5173/api/logs/00000000-0000-0000-0000-000000000001'),
			params: { id: '00000000-0000-0000-0000-000000000001' },
			route: { id: '/api/logs/[id]' }
		} as any;

		// Act
		const response = await GET(event);
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

	it('should return log with theme information', async () => {
		// Arrange: Create theme and log
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const log = await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-15',
			summary: '型定義の基礎を学習',
			details: 'Interface と Type の違いについて学んだ',
			tags: ['typescript', 'types']
		});

		const request = new Request(`http://localhost:5173/api/logs/${log.id}`);
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: log.id },
			route: { id: '/api/logs/[id]' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body).toMatchObject({
			id: log.id,
			themeId: theme.id,
			summary: '型定義の基礎を学習',
			details: 'Interface と Type の違いについて学んだ',
			tags: ['typescript', 'types']
		});
		expect(body.theme).toBeDefined();
		expect(body.theme.id).toBe(theme.id);
		expect(body.theme.name).toBe('TypeScript学習');
	});

	it('should return 404 when log does not exist', async () => {
		// Arrange
		const nonExistentId = '00000000-0000-0000-0000-999999999999';
		const request = new Request(`http://localhost:5173/api/logs/${nonExistentId}`);
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: nonExistentId },
			route: { id: '/api/logs/[id]' }
		} as any;

		// Act
		const response = await GET(event);
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

	it('should not return log from another user (user isolation)', async () => {
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

		// Try to access with mockUser
		const request = new Request(`http://localhost:5173/api/logs/${log.id}`);
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: log.id },
			route: { id: '/api/logs/[id]' }
		} as any;

		// Act
		const response = await GET(event);
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

	it('should not return deleted log', async () => {
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

		const request = new Request(`http://localhost:5173/api/logs/${log.id}`);
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: log.id },
			route: { id: '/api/logs/[id]' }
		} as any;

		// Act
		const response = await GET(event);
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
