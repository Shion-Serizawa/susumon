import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from '../../../routes/api/themes/[id]/+server';
import { cleanupDatabase, mockUser, mockUser2, createTestTheme } from '$lib/server/test-utils';

describe('GET /api/themes/[id]', () => {
	beforeEach(async () => {
		await cleanupDatabase();
	});

	afterEach(async () => {
		await cleanupDatabase();
	});

	it('should return 401 when user is not authenticated', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/themes/00000000-0000-0000-0000-000000000001');
		const event = {
			request,
			locals: {},
			url: new URL(request.url),
			params: { id: '00000000-0000-0000-0000-000000000001' },
			route: { id: '/api/themes/[id]' }
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

	it('should return 400 when id is not a valid uuid', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/themes/not-a-uuid');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: 'not-a-uuid' },
			route: { id: '/api/themes/[id]' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('valid UUID');
	});

	it('should return 200 when theme exists for the authenticated user', async () => {
		// Arrange
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const request = new Request(`http://localhost:5173/api/themes/${theme.id}`);
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: theme.id },
			route: { id: '/api/themes/[id]' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body).toMatchObject({
			id: theme.id,
			userId: mockUser.id,
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する',
			isCompleted: false,
			state: 'ACTIVE'
		});
		expect(body.createdAt).toBeDefined();
		expect(body.updatedAt).toBeDefined();
	});

	it('should return 404 when theme does not exist', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/themes/00000000-0000-0000-0000-000000000099');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: '00000000-0000-0000-0000-000000000099' },
			route: { id: '/api/themes/[id]' }
		} as any;

		// Act
		const response = await GET(event);
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

		const request = new Request(`http://localhost:5173/api/themes/${theme.id}`);
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: theme.id },
			route: { id: '/api/themes/[id]' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(404);
		expect(body).toEqual({ error: { code: 'NotFound', message: 'Theme not found' } });
	});
});

