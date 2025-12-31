import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from '../../../routes/api/logs/+server';
import {
	cleanupDatabase,
	mockUser,
	mockUser2,
	createTestTheme,
	createTestLog
} from '$lib/server/test-utils';

describe('GET /api/logs', () => {
	beforeEach(async () => {
		await cleanupDatabase();
	});

	afterEach(async () => {
		await cleanupDatabase();
	});

	it('should return 401 when user is not authenticated', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/logs');
		const event = {
			request,
			locals: {},
			url: new URL('http://localhost:5173/api/logs'),
			params: {},
			route: { id: '/api/logs' }
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

	it('should return empty array when no logs exist', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/logs');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/logs'),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body).toEqual({
			items: [],
			nextCursor: null
		});
	});

	it('should return logs for authenticated user', async () => {
		// Arrange: Create test theme and logs
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-15',
			summary: 'TypeScript基礎を学習'
		});
		await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-14',
			summary: 'プロジェクトセットアップ'
		});

		const request = new Request('http://localhost:5173/api/logs');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/logs'),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body.items).toHaveLength(2);
		// 並び順: date desc, created_at desc
		expect(body.items[0].summary).toBe('TypeScript基礎を学習');
		expect(body.items[1].summary).toBe('プロジェクトセットアップ');
		expect(body.nextCursor).toBeNull();
	});

	it('should only return logs for the authenticated user (user isolation)', async () => {
		// Arrange: Create logs for two different users
		const theme1 = await createTestTheme(mockUser.id, {
			name: 'User1 Theme',
			goal: 'Goal for user 1'
		});
		const theme2 = await createTestTheme(mockUser2.id, {
			name: 'User2 Theme',
			goal: 'Goal for user 2'
		});

		await createTestLog(mockUser.id, {
			themeId: theme1.id,
			date: '2025-01-15',
			summary: 'User1 Log'
		});
		await createTestLog(mockUser2.id, {
			themeId: theme2.id,
			date: '2025-01-15',
			summary: 'User2 Log'
		});

		const request = new Request('http://localhost:5173/api/logs');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/logs'),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body.items).toHaveLength(1);
		expect(body.items[0].summary).toBe('User1 Log');
	});

	it('should filter by themeId', async () => {
		// Arrange
		const theme1 = await createTestTheme(mockUser.id, {
			name: 'TypeScript',
			goal: 'Learn TypeScript'
		});
		const theme2 = await createTestTheme(mockUser.id, {
			name: 'React',
			goal: 'Learn React'
		});

		await createTestLog(mockUser.id, {
			themeId: theme1.id,
			date: '2025-01-15',
			summary: 'TypeScript Log'
		});
		await createTestLog(mockUser.id, {
			themeId: theme2.id,
			date: '2025-01-15',
			summary: 'React Log'
		});

		const request = new Request(`http://localhost:5173/api/logs?themeId=${theme1.id}`);
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body.items).toHaveLength(1);
		expect(body.items[0].summary).toBe('TypeScript Log');
	});

	it('should filter by date range (start and end)', async () => {
		// Arrange
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript',
			goal: 'Learn TypeScript'
		});

		await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-10',
			summary: 'Before range'
		});
		await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-15',
			summary: 'In range 1'
		});
		await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-16',
			summary: 'In range 2'
		});
		await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-20',
			summary: 'After range'
		});

		const request = new Request('http://localhost:5173/api/logs?start=2025-01-15&end=2025-01-16');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body.items).toHaveLength(2);
		const summaries = body.items.map((log: any) => log.summary).sort();
		expect(summaries).toEqual(['In range 1', 'In range 2']);
	});

	it('should filter by start date only', async () => {
		// Arrange
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript',
			goal: 'Learn TypeScript'
		});

		await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-10',
			summary: 'Before start'
		});
		await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-15',
			summary: 'After start 1'
		});
		await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-20',
			summary: 'After start 2'
		});

		const request = new Request('http://localhost:5173/api/logs?start=2025-01-15');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body.items).toHaveLength(2);
		const summaries = body.items.map((log: any) => log.summary).sort();
		expect(summaries).toEqual(['After start 1', 'After start 2']);
	});

	it('should validate limit parameter', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/logs?limit=300');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('limit must be between 1 and 200');
	});

	it('should validate themeId parameter', async () => {
		// Arrange: Invalid UUID
		const request = new Request('http://localhost:5173/api/logs?themeId=invalid-uuid');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('themeId must be a valid UUID');
	});

	it('should validate start date parameter', async () => {
		// Arrange: Invalid date format
		const request = new Request('http://localhost:5173/api/logs?start=2025/01/15');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('start must be in YYYY-MM-DD format');
	});

	it('should validate cursor parameter', async () => {
		// Arrange: Invalid base64 cursor
		const request = new Request('http://localhost:5173/api/logs?cursor=invalid!!!');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('Invalid cursor format');
	});
});
