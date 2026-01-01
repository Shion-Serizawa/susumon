import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from '../../../routes/api/notes/+server';
import {
	cleanupDatabase,
	mockUser,
	mockUser2,
	createTestTheme,
	createTestNote
} from '$lib/server/test-utils';

describe('GET /api/notes', () => {
	beforeEach(async () => {
		await cleanupDatabase();
	});

	afterEach(async () => {
		await cleanupDatabase();
	});

	it('should return 401 when user is not authenticated', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/notes');
		const event = {
			request,
			locals: {},
			url: new URL('http://localhost:5173/api/notes'),
			params: {},
			route: { id: '/api/notes' }
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

	it('should return empty array when no notes exist', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/notes');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/notes'),
			params: {},
			route: { id: '/api/notes' }
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

	it('should return notes for authenticated user', async () => {
		// Arrange: Create test theme and notes
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		await createTestNote(mockUser.id, {
			category: 'INSIGHT',
			body: 'ジェネリクスの使い方が理解できた',
			noteDate: '2025-01-15',
			themeIds: [theme.id]
		});
		await createTestNote(mockUser.id, {
			category: 'QUESTION',
			body: 'Mapped Typesの実用例は？',
			noteDate: '2025-01-14',
			themeIds: [theme.id]
		});

		const request = new Request('http://localhost:5173/api/notes');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/notes'),
			params: {},
			route: { id: '/api/notes' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body.items).toHaveLength(2);
		// noteDate降順、最新が先
		expect(body.items[0].body).toBe('ジェネリクスの使い方が理解できた');
		expect(body.items[1].body).toBe('Mapped Typesの実用例は？');
	});

	it('should filter by category', async () => {
		// Arrange
		await createTestNote(mockUser.id, {
			category: 'INSIGHT',
			body: 'インサイト1',
			noteDate: '2025-01-15'
		});
		await createTestNote(mockUser.id, {
			category: 'QUESTION',
			body: '疑問1',
			noteDate: '2025-01-14'
		});

		const request = new Request('http://localhost:5173/api/notes?category=INSIGHT');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/notes?category=INSIGHT'),
			params: {},
			route: { id: '/api/notes' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body.items).toHaveLength(1);
		expect(body.items[0].category).toBe('INSIGHT');
	});

	it('should filter by themeId', async () => {
		// Arrange
		const theme1 = await createTestTheme(mockUser.id, {
			name: 'テーマ1',
			goal: '目標1'
		});
		const theme2 = await createTestTheme(mockUser.id, {
			name: 'テーマ2',
			goal: '目標2'
		});

		await createTestNote(mockUser.id, {
			category: 'INSIGHT',
			body: 'テーマ1のノート',
			noteDate: '2025-01-15',
			themeIds: [theme1.id]
		});
		await createTestNote(mockUser.id, {
			category: 'INSIGHT',
			body: 'テーマ2のノート',
			noteDate: '2025-01-14',
			themeIds: [theme2.id]
		});

		const request = new Request(`http://localhost:5173/api/notes?themeId=${theme1.id}`);
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(`http://localhost:5173/api/notes?themeId=${theme1.id}`),
			params: {},
			route: { id: '/api/notes' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body.items).toHaveLength(1);
		expect(body.items[0].body).toBe('テーマ1のノート');
	});

	it('should filter by date range', async () => {
		// Arrange
		await createTestNote(mockUser.id, {
			category: 'INSIGHT',
			body: 'ノート1',
			noteDate: '2025-01-10'
		});
		await createTestNote(mockUser.id, {
			category: 'INSIGHT',
			body: 'ノート2',
			noteDate: '2025-01-15'
		});
		await createTestNote(mockUser.id, {
			category: 'INSIGHT',
			body: 'ノート3',
			noteDate: '2025-01-20'
		});

		const request = new Request('http://localhost:5173/api/notes?start=2025-01-12&end=2025-01-18');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/notes?start=2025-01-12&end=2025-01-18'),
			params: {},
			route: { id: '/api/notes' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body.items).toHaveLength(1);
		expect(body.items[0].body).toBe('ノート2');
	});

	it('should not return notes from other users', async () => {
		// Arrange: Create notes for different users
		await createTestNote(mockUser.id, {
			category: 'INSIGHT',
			body: 'User1のノート',
			noteDate: '2025-01-15'
		});
		await createTestNote(mockUser2.id, {
			category: 'INSIGHT',
			body: 'User2のノート',
			noteDate: '2025-01-15'
		});

		const request = new Request('http://localhost:5173/api/notes');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/notes'),
			params: {},
			route: { id: '/api/notes' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body.items).toHaveLength(1);
		expect(body.items[0].body).toBe('User1のノート');
	});

	it('should return 400 when category is invalid', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/notes?category=INVALID');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/notes?category=INVALID'),
			params: {},
			route: { id: '/api/notes' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
	});
});
