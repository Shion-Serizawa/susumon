import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PATCH } from '../../../routes/api/notes/[id]/+server';
import {
	cleanupDatabase,
	mockUser,
	mockUser2,
	createTestTheme,
	createTestLog,
	createTestNote
} from '$lib/server/test-utils';

describe('PATCH /api/notes/[id]', () => {
	beforeEach(async () => {
		await cleanupDatabase();
	});

	afterEach(async () => {
		await cleanupDatabase();
	});

	it('should return 401 when user is not authenticated', async () => {
		// Arrange
		const requestBody = { body: '更新後の本文' };
		const request = new Request('http://localhost:5173/api/notes/test-id', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: {},
			url: new URL('http://localhost:5173/api/notes/test-id'),
			params: { id: 'test-id' },
			route: { id: '/api/notes/[id]' }
		} as any;

		// Act
		const response = await PATCH(event);
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

	it('should update note successfully', async () => {
		// Arrange: Create note
		const note = await createTestNote(mockUser.id, {
			category: 'INSIGHT',
			body: '元の本文',
			noteDate: '2025-01-15'
		});

		const requestBody = {
			category: 'QUESTION',
			body: '更新後の本文'
		};

		const request = new Request(`http://localhost:5173/api/notes/${note.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(`http://localhost:5173/api/notes/${note.id}`),
			params: { id: note.id },
			route: { id: '/api/notes/[id]' }
		} as any;

		// Act
		const response = await PATCH(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body).toMatchObject({
			id: note.id,
			category: 'QUESTION',
			body: '更新後の本文'
		});
	});

	it('should update only specified fields', async () => {
		// Arrange: Create note
		const note = await createTestNote(mockUser.id, {
			category: 'INSIGHT',
			body: '元の本文',
			noteDate: '2025-01-15'
		});

		const requestBody = {
			body: '更新後の本文のみ'
		};

		const request = new Request(`http://localhost:5173/api/notes/${note.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(`http://localhost:5173/api/notes/${note.id}`),
			params: { id: note.id },
			route: { id: '/api/notes/[id]' }
		} as any;

		// Act
		const response = await PATCH(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body).toMatchObject({
			id: note.id,
			category: 'INSIGHT', // 変更なし
			body: '更新後の本文のみ'
		});
	});

	it('should update themeIds (replace existing)', async () => {
		// Arrange: Create themes and note
		const theme1 = await createTestTheme(mockUser.id, {
			name: 'テーマ1',
			goal: '目標1'
		});
		const theme2 = await createTestTheme(mockUser.id, {
			name: 'テーマ2',
			goal: '目標2'
		});

		const note = await createTestNote(mockUser.id, {
			category: 'INSIGHT',
			body: 'ノート本文',
			noteDate: '2025-01-15',
			themeIds: [theme1.id]
		});

		const requestBody = {
			themeIds: [theme2.id]
		};

		const request = new Request(`http://localhost:5173/api/notes/${note.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(`http://localhost:5173/api/notes/${note.id}`),
			params: { id: note.id },
			route: { id: '/api/notes/[id]' }
		} as any;

		// Act
		const response = await PATCH(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body).toMatchObject({
			id: note.id
		});
	});

	it('should update relatedLogId', async () => {
		// Arrange: Create theme, log, and note
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: '基礎習得'
		});

		const log = await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-15',
			summary: '学習ログ'
		});

		const note = await createTestNote(mockUser.id, {
			category: 'INSIGHT',
			body: 'ノート本文',
			noteDate: '2025-01-15'
		});

		const requestBody = {
			relatedLogId: log.id
		};

		const request = new Request(`http://localhost:5173/api/notes/${note.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(`http://localhost:5173/api/notes/${note.id}`),
			params: { id: note.id },
			route: { id: '/api/notes/[id]' }
		} as any;

		// Act
		const response = await PATCH(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body).toMatchObject({
			id: note.id,
			relatedLogId: log.id
		});
	});

	it('should return 404 when note does not exist', async () => {
		// Arrange
		const nonExistentId = '00000000-0000-0000-0000-000000000099';
		const requestBody = { body: '更新後の本文' };

		const request = new Request(`http://localhost:5173/api/notes/${nonExistentId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(`http://localhost:5173/api/notes/${nonExistentId}`),
			params: { id: nonExistentId },
			route: { id: '/api/notes/[id]' }
		} as any;

		// Act
		const response = await PATCH(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(404);
		expect(body).toEqual({
			error: {
				code: 'NotFound',
				message: 'Note not found'
			}
		});
	});

	it('should return 404 when note belongs to another user', async () => {
		// Arrange: Create note for user2
		const note = await createTestNote(mockUser2.id, {
			category: 'INSIGHT',
			body: 'User2のノート',
			noteDate: '2025-01-15'
		});

		const requestBody = { body: '更新試行' };

		const request = new Request(`http://localhost:5173/api/notes/${note.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser }, // mockUser でアクセス
			url: new URL(`http://localhost:5173/api/notes/${note.id}`),
			params: { id: note.id },
			route: { id: '/api/notes/[id]' }
		} as any;

		// Act
		const response = await PATCH(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(404);
		expect(body).toEqual({
			error: {
				code: 'NotFound',
				message: 'Note not found'
			}
		});
	});

	it('should return 400 when no fields provided', async () => {
		// Arrange: Create note
		const note = await createTestNote(mockUser.id, {
			category: 'INSIGHT',
			body: '元の本文',
			noteDate: '2025-01-15'
		});

		const requestBody = {};

		const request = new Request(`http://localhost:5173/api/notes/${note.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(`http://localhost:5173/api/notes/${note.id}`),
			params: { id: note.id },
			route: { id: '/api/notes/[id]' }
		} as any;

		// Act
		const response = await PATCH(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
	});

	it('should return 400 when themeId does not exist', async () => {
		// Arrange: Create note
		const note = await createTestNote(mockUser.id, {
			category: 'INSIGHT',
			body: '元の本文',
			noteDate: '2025-01-15'
		});

		const requestBody = {
			themeIds: ['00000000-0000-0000-0000-000000000099']
		};

		const request = new Request(`http://localhost:5173/api/notes/${note.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(`http://localhost:5173/api/notes/${note.id}`),
			params: { id: note.id },
			route: { id: '/api/notes/[id]' }
		} as any;

		// Act
		const response = await PATCH(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
	});

	it('should return 400 when relatedLogId does not exist', async () => {
		// Arrange: Create note
		const note = await createTestNote(mockUser.id, {
			category: 'INSIGHT',
			body: '元の本文',
			noteDate: '2025-01-15'
		});

		const requestBody = {
			relatedLogId: '00000000-0000-0000-0000-000000000099'
		};

		const request = new Request(`http://localhost:5173/api/notes/${note.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(`http://localhost:5173/api/notes/${note.id}`),
			params: { id: note.id },
			route: { id: '/api/notes/[id]' }
		} as any;

		// Act
		const response = await PATCH(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
	});
});
