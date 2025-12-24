import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DELETE } from '../../../routes/api/themes/[id]/+server';
import { cleanupDatabase, mockUser, mockUser2, createTestTheme } from '$lib/server/test-utils';
import { prisma } from '$lib/server/db';

describe('DELETE /api/themes/[id]', () => {
	beforeEach(async () => {
		await cleanupDatabase();
	});

	afterEach(async () => {
		await cleanupDatabase();
	});

	it('should return 401 when user is not authenticated', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/themes/00000000-0000-0000-0000-000000000001', {
			method: 'DELETE'
		});
		const event = {
			request,
			locals: {},
			url: new URL(request.url),
			params: { id: '00000000-0000-0000-0000-000000000001' },
			route: { id: '/api/themes/[id]' }
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

	it('should return 400 when id is not a valid uuid', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/themes/not-a-uuid', { method: 'DELETE' });
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: 'not-a-uuid' },
			route: { id: '/api/themes/[id]' }
		} as any;

		// Act
		const response = await DELETE(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('valid UUID');
	});

	it('should return 404 when theme does not exist', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/themes/00000000-0000-0000-0000-000000000099', {
			method: 'DELETE'
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: '00000000-0000-0000-0000-000000000099' },
			route: { id: '/api/themes/[id]' }
		} as any;

		// Act
		const response = await DELETE(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(404);
		expect(body).toEqual({ error: { code: 'NotFound', message: 'Theme not found' } });
	});

	it('should return 404 when theme belongs to a different user (user isolation)', async () => {
		// Arrange
		const theme = await createTestTheme(mockUser2.id, {
			name: 'User2 Theme',
			goal: 'Goal for user 2'
		});

		const request = new Request(`http://localhost:5173/api/themes/${theme.id}`, { method: 'DELETE' });
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: theme.id },
			route: { id: '/api/themes/[id]' }
		} as any;

		// Act
		const response = await DELETE(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(404);
		expect(body).toEqual({ error: { code: 'NotFound', message: 'Theme not found' } });
	});

	it('should return 204 and soft delete theme and related logs/notes', async () => {
		// Arrange
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		// related log
		const logRows = await prisma.$queryRaw<Array<{ id: string }>>`
			INSERT INTO learning_log_entries (user_id, theme_id, date, summary, details, tags, state, state_changed_at, created_at, updated_at)
			VALUES (
				${mockUser.id}::uuid,
				${theme.id}::uuid,
				CURRENT_DATE,
				'Summary',
				NULL,
				ARRAY[]::text[],
				'ACTIVE'::"ResourceState",
				NOW(),
				NOW(),
				NOW()
			)
			RETURNING id
		`;
		expect(logRows[0].id).toBeDefined();

		// related note via meta_note_themes
		const noteRows = await prisma.$queryRaw<Array<{ id: string }>>`
			INSERT INTO meta_notes (user_id, category, body, related_log_id, note_date, state, state_changed_at, created_at, updated_at)
			VALUES (
				${mockUser.id}::uuid,
				'INSIGHT',
				'Body',
				NULL,
				CURRENT_DATE,
				'ACTIVE'::"ResourceState",
				NOW(),
				NOW(),
				NOW()
			)
			RETURNING id
		`;
		const noteId = noteRows[0].id;
		await prisma.$executeRaw`
			INSERT INTO meta_note_themes (meta_note_id, theme_id, created_at)
			VALUES (${noteId}::uuid, ${theme.id}::uuid, NOW())
		`;

		const request = new Request(`http://localhost:5173/api/themes/${theme.id}`, { method: 'DELETE' });
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: theme.id },
			route: { id: '/api/themes/[id]' }
		} as any;

		// Act
		const response = await DELETE(event);

		// Assert (response)
		expect(response.status).toBe(204);

		// Assert (DB) - use raw queries to avoid state filters
		const themeState = await prisma.$queryRaw<Array<{ state: string }>>`
			SELECT state FROM themes WHERE id = ${theme.id}::uuid
		`;
		expect(themeState[0]?.state).toBe('DELETED');

		const logStates = await prisma.$queryRaw<Array<{ state: string }>>`
			SELECT state FROM learning_log_entries WHERE theme_id = ${theme.id}::uuid
		`;
		expect(logStates).toHaveLength(1);
		expect(logStates[0].state).toBe('DELETED');

		const noteStates = await prisma.$queryRaw<Array<{ state: string }>>`
			SELECT n.state
			FROM meta_notes n
			JOIN meta_note_themes mnt ON mnt.meta_note_id = n.id
			WHERE mnt.theme_id = ${theme.id}::uuid
		`;
		expect(noteStates).toHaveLength(1);
		expect(noteStates[0].state).toBe('DELETED');
	});
});

