import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from '../../../routes/api/logs/+server';
import { cleanupDatabase, mockUser, mockUser2, createTestTheme } from '$lib/server/test-utils';

describe('POST /api/logs', () => {
	beforeEach(async () => {
		await cleanupDatabase();
	});

	afterEach(async () => {
		await cleanupDatabase();
	});

	it('should return 401 when user is not authenticated', async () => {
		// Arrange
		const requestBody = {
			themeId: '00000000-0000-0000-0000-000000000001',
			date: '2025-01-15',
			summary: 'Test log'
		};
		const request = new Request('http://localhost:5173/api/logs', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: {},
			url: new URL('http://localhost:5173/api/logs'),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		// Act
		const response = await POST(event);
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

	it('should create a log successfully', async () => {
		// Arrange: Create theme first
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const requestBody = {
			themeId: theme.id,
			date: '2025-01-15',
			summary: '型定義の基礎を学習',
			details: 'Interface と Type の違いについて学んだ',
			tags: ['typescript', 'types']
		};

		const request = new Request('http://localhost:5173/api/logs', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/logs'),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(201);
		expect(body).toMatchObject({
			themeId: theme.id,
			summary: '型定義の基礎を学習',
			details: 'Interface と Type の違いについて学んだ',
			tags: ['typescript', 'types']
		});
		expect(body.id).toBeDefined();
		expect(body.createdAt).toBeDefined();
		expect(body.updatedAt).toBeDefined();
	});

	it('should create a log with minimal fields (no details or tags)', async () => {
		// Arrange
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const requestBody = {
			themeId: theme.id,
			date: '2025-01-15',
			summary: '基礎学習'
		};

		const request = new Request('http://localhost:5173/api/logs', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/logs'),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(201);
		expect(body.summary).toBe('基礎学習');
		expect(body.details).toBeNull();
		expect(body.tags).toEqual([]);
	});

	it('should return 400 when themeId is missing', async () => {
		// Arrange
		const requestBody = {
			date: '2025-01-15',
			summary: 'Test log'
		};

		const request = new Request('http://localhost:5173/api/logs', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/logs'),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('themeId is required');
	});

	it('should return 400 when themeId is not a valid UUID', async () => {
		// Arrange
		const requestBody = {
			themeId: 'invalid-uuid',
			date: '2025-01-15',
			summary: 'Test log'
		};

		const request = new Request('http://localhost:5173/api/logs', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/logs'),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('themeId must be a valid UUID');
	});

	it('should return 400 when date is missing', async () => {
		// Arrange
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const requestBody = {
			themeId: theme.id,
			summary: 'Test log'
		};

		const request = new Request('http://localhost:5173/api/logs', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/logs'),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('date is required');
	});

	it('should return 400 when date is not in YYYY-MM-DD format', async () => {
		// Arrange
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const requestBody = {
			themeId: theme.id,
			date: '2025/01/15', // Invalid format
			summary: 'Test log'
		};

		const request = new Request('http://localhost:5173/api/logs', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/logs'),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('date must be in YYYY-MM-DD format');
	});

	it('should return 400 when summary is missing', async () => {
		// Arrange
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const requestBody = {
			themeId: theme.id,
			date: '2025-01-15'
		};

		const request = new Request('http://localhost:5173/api/logs', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/logs'),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('summary is required');
	});

	it('should return 400 when tags is not an array', async () => {
		// Arrange
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const requestBody = {
			themeId: theme.id,
			date: '2025-01-15',
			summary: 'Test log',
			tags: 'not-an-array'
		};

		const request = new Request('http://localhost:5173/api/logs', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/logs'),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('tags must be an array');
	});

	it('should return 400 when referenced theme does not exist (P2003)', async () => {
		// Arrange
		const requestBody = {
			themeId: '00000000-0000-0000-0000-999999999999', // Non-existent theme
			date: '2025-01-15',
			summary: 'Test log'
		};

		const request = new Request('http://localhost:5173/api/logs', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/logs'),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('Referenced theme not found');
	});

	it('should return 409 when violating unique constraint (1 log per theme per day)', async () => {
		// Arrange: Create theme and log
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const requestBody = {
			themeId: theme.id,
			date: '2025-01-15',
			summary: 'First log'
		};

		// Create first log
		const request1 = new Request('http://localhost:5173/api/logs', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event1 = {
			request: request1,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/logs'),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		await POST(event1);

		// Try to create second log with same theme and date
		const requestBody2 = {
			themeId: theme.id,
			date: '2025-01-15',
			summary: 'Second log (should fail)'
		};

		const request2 = new Request('http://localhost:5173/api/logs', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody2)
		});
		const event2 = {
			request: request2,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/logs'),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		// Act
		const response = await POST(event2);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(409);
		expect(body.error.code).toBe('Conflict');
		expect(body.error.message).toContain('A log for this theme on this date already exists');
	});

	it('should return 400 when JSON body is invalid', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/logs', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: 'invalid json{'
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/logs'),
			params: {},
			route: { id: '/api/logs' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('Invalid JSON body');
	});
});
