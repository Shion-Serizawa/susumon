import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from '../../../routes/api/notes/[id]/+server';
import {
	cleanupDatabase,
	mockUser,
	mockUser2,
	createTestTheme,
	createTestLog,
	createTestNote
} from '$lib/server/test-utils';

describe('GET /api/notes/[id]', () => {
	beforeEach(async () => {
		await cleanupDatabase();
	});

	afterEach(async () => {
		await cleanupDatabase();
	});

	it('should return 401 when user is not authenticated', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/notes/test-id');
		const event = {
			request,
			locals: {},
			url: new URL('http://localhost:5173/api/notes/test-id'),
			params: { id: 'test-id' },
			route: { id: '/api/notes/[id]' }
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

	it('should return note with relations', async () => {
		// Arrange: Create test data
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const log = await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-15',
			summary: 'TypeScript基礎を学習'
		});

		const note = await createTestNote(mockUser.id, {
			category: 'INSIGHT',
			body: 'ジェネリクスの使い方が理解できた',
			noteDate: '2025-01-15',
			themeIds: [theme.id],
			relatedLogId: log.id
		});

		const request = new Request(`http://localhost:5173/api/notes/${note.id}`);
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(`http://localhost:5173/api/notes/${note.id}`),
			params: { id: note.id },
			route: { id: '/api/notes/[id]' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body).toMatchObject({
			id: note.id,
			category: 'INSIGHT',
			body: 'ジェネリクスの使い方が理解できた'
		});
		// 関連ログの情報が含まれる
		expect(body.relatedLog).toMatchObject({
			id: log.id,
			summary: 'TypeScript基礎を学習'
		});
		// テーマ情報が含まれる
		expect(body.themes).toHaveLength(1);
		expect(body.themes[0]).toMatchObject({
			id: theme.id,
			name: 'TypeScript学習'
		});
	});

	it('should return 404 when note does not exist', async () => {
		// Arrange
		const nonExistentId = '00000000-0000-0000-0000-000000000099';
		const request = new Request(`http://localhost:5173/api/notes/${nonExistentId}`);
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(`http://localhost:5173/api/notes/${nonExistentId}`),
			params: { id: nonExistentId },
			route: { id: '/api/notes/[id]' }
		} as any;

		// Act
		const response = await GET(event);
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

		const request = new Request(`http://localhost:5173/api/notes/${note.id}`);
		const event = {
			request,
			locals: { user: mockUser }, // mockUser でアクセス
			url: new URL(`http://localhost:5173/api/notes/${note.id}`),
			params: { id: note.id },
			route: { id: '/api/notes/[id]' }
		} as any;

		// Act
		const response = await GET(event);
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

	it('should return note without relations', async () => {
		// Arrange: Create note without themes and relatedLog
		const note = await createTestNote(mockUser.id, {
			category: 'QUESTION',
			body: '疑問点メモ',
			noteDate: '2025-01-15'
		});

		const request = new Request(`http://localhost:5173/api/notes/${note.id}`);
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(`http://localhost:5173/api/notes/${note.id}`),
			params: { id: note.id },
			route: { id: '/api/notes/[id]' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body).toMatchObject({
			id: note.id,
			category: 'QUESTION',
			body: '疑問点メモ',
			relatedLog: null
		});
		expect(body.themes).toHaveLength(0);
	});
});
