import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from '../../../routes/api/notes/+server';
import {
	cleanupDatabase,
	mockUser,
	mockUser2,
	createTestTheme,
	createTestLog
} from '$lib/server/test-utils';

describe('POST /api/notes', () => {
	beforeEach(async () => {
		await cleanupDatabase();
	});

	afterEach(async () => {
		await cleanupDatabase();
	});

	it('should return 401 when user is not authenticated', async () => {
		// Arrange
		const requestBody = {
			category: 'INSIGHT',
			body: 'テストノート'
		};
		const request = new Request('http://localhost:5173/api/notes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: {},
			url: new URL('http://localhost:5173/api/notes'),
			params: {},
			route: { id: '/api/notes' }
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

	it('should create a note successfully with minimal fields', async () => {
		// Arrange
		const requestBody = {
			category: 'INSIGHT',
			body: 'ジェネリクスの使い方が理解できた'
		};

		const request = new Request('http://localhost:5173/api/notes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/notes'),
			params: {},
			route: { id: '/api/notes' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(201);
		expect(body).toMatchObject({
			category: 'INSIGHT',
			body: 'ジェネリクスの使い方が理解できた'
		});
		expect(body.id).toBeDefined();
		expect(body.noteDate).toBeDefined();
		expect(body.createdAt).toBeDefined();
		expect(body.updatedAt).toBeDefined();
	});

	it('should create a note with themeIds', async () => {
		// Arrange: Create test theme
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const requestBody = {
			category: 'INSIGHT',
			body: 'ジェネリクスの使い方が理解できた',
			themeIds: [theme.id]
		};

		const request = new Request('http://localhost:5173/api/notes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/notes'),
			params: {},
			route: { id: '/api/notes' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(201);
		expect(body).toMatchObject({
			category: 'INSIGHT',
			body: 'ジェネリクスの使い方が理解できた'
		});
		expect(body.id).toBeDefined();
	});

	it('should create a note with relatedLogId', async () => {
		// Arrange: Create test theme and log
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const log = await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-15',
			summary: 'TypeScript基礎を学習'
		});

		const requestBody = {
			category: 'INSIGHT',
			body: 'ジェネリクスの使い方が理解できた',
			relatedLogId: log.id
		};

		const request = new Request('http://localhost:5173/api/notes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/notes'),
			params: {},
			route: { id: '/api/notes' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(201);
		expect(body).toMatchObject({
			category: 'INSIGHT',
			body: 'ジェネリクスの使い方が理解できた',
			relatedLogId: log.id
		});
	});

	it('should return 400 when category is missing', async () => {
		// Arrange
		const requestBody = {
			body: 'ノート本文'
		};

		const request = new Request('http://localhost:5173/api/notes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/notes'),
			params: {},
			route: { id: '/api/notes' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
	});

	it('should return 400 when category is invalid', async () => {
		// Arrange
		const requestBody = {
			category: 'INVALID_CATEGORY',
			body: 'ノート本文'
		};

		const request = new Request('http://localhost:5173/api/notes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/notes'),
			params: {},
			route: { id: '/api/notes' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
	});

	it('should return 400 when body is missing', async () => {
		// Arrange
		const requestBody = {
			category: 'INSIGHT'
		};

		const request = new Request('http://localhost:5173/api/notes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/notes'),
			params: {},
			route: { id: '/api/notes' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
	});

	it('should return 400 when themeId does not exist', async () => {
		// Arrange
		const requestBody = {
			category: 'INSIGHT',
			body: 'ノート本文',
			themeIds: ['00000000-0000-0000-0000-000000000099']
		};

		const request = new Request('http://localhost:5173/api/notes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/notes'),
			params: {},
			route: { id: '/api/notes' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
	});

	it('should return 400 when relatedLogId does not exist', async () => {
		// Arrange
		const requestBody = {
			category: 'INSIGHT',
			body: 'ノート本文',
			relatedLogId: '00000000-0000-0000-0000-000000000099'
		};

		const request = new Request('http://localhost:5173/api/notes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/notes'),
			params: {},
			route: { id: '/api/notes' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
	});
});
