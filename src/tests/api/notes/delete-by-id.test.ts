import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DELETE } from '../../../routes/api/notes/[id]/+server';
import {
	cleanupDatabase,
	mockUser,
	mockUser2,
	createTestNote
} from '$lib/server/test-utils';
import { prisma } from '$lib/server/db';

describe('DELETE /api/notes/[id]', () => {
	beforeEach(async () => {
		await cleanupDatabase();
	});

	afterEach(async () => {
		await cleanupDatabase();
	});

	it('should return 401 when user is not authenticated', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/notes/test-id', {
			method: 'DELETE'
		});
		const event = {
			request,
			locals: {},
			url: new URL('http://localhost:5173/api/notes/test-id'),
			params: { id: 'test-id' },
			route: { id: '/api/notes/[id]' }
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

	it('should delete note successfully (logical delete)', async () => {
		// Arrange: Create note
		const note = await createTestNote(mockUser.id, {
			category: 'INSIGHT',
			body: 'テストノート',
			noteDate: '2025-01-15'
		});

		const request = new Request(`http://localhost:5173/api/notes/${note.id}`, {
			method: 'DELETE'
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(`http://localhost:5173/api/notes/${note.id}`),
			params: { id: note.id },
			route: { id: '/api/notes/[id]' }
		} as any;

		// Act
		const response = await DELETE(event);

		// Assert
		expect(response.status).toBe(204);

		// Verify: Check that note is logically deleted (state = 'DELETED')
		const deletedNote = await prisma.$queryRaw<Array<{
			id: string;
			state: string;
		}>>`SELECT id, state FROM meta_notes WHERE id = ${note.id}::uuid`;

		expect(deletedNote).toHaveLength(1);
		expect(deletedNote[0].state).toBe('DELETED');
	});

	it('should return 404 when note does not exist', async () => {
		// Arrange
		const nonExistentId = '00000000-0000-0000-0000-000000000099';
		const request = new Request(`http://localhost:5173/api/notes/${nonExistentId}`, {
			method: 'DELETE'
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(`http://localhost:5173/api/notes/${nonExistentId}`),
			params: { id: nonExistentId },
			route: { id: '/api/notes/[id]' }
		} as any;

		// Act
		const response = await DELETE(event);
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

		const request = new Request(`http://localhost:5173/api/notes/${note.id}`, {
			method: 'DELETE'
		});
		const event = {
			request,
			locals: { user: mockUser }, // mockUser でアクセス
			url: new URL(`http://localhost:5173/api/notes/${note.id}`),
			params: { id: note.id },
			route: { id: '/api/notes/[id]' }
		} as any;

		// Act
		const response = await DELETE(event);
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

	it('should return 404 when note is already deleted', async () => {
		// Arrange: Create and delete note
		const note = await createTestNote(mockUser.id, {
			category: 'INSIGHT',
			body: 'テストノート',
			noteDate: '2025-01-15',
			state: 'DELETED'
		});

		const request = new Request(`http://localhost:5173/api/notes/${note.id}`, {
			method: 'DELETE'
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(`http://localhost:5173/api/notes/${note.id}`),
			params: { id: note.id },
			route: { id: '/api/notes/[id]' }
		} as any;

		// Act
		const response = await DELETE(event);
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
});
