import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from '../../../routes/api/themes/+server';
import { cleanupDatabase, mockUser, mockUser2, createTestTheme } from '$lib/server/test-utils';

describe('GET /api/themes', () => {
	beforeEach(async () => {
		// Clean database before each test
		await cleanupDatabase();
	});

	afterEach(async () => {
		// Clean database after each test
		await cleanupDatabase();
	});

	it('should return 401 when user is not authenticated', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/themes');
		const event = {
			request,
			locals: {},
			url: new URL('http://localhost:5173/api/themes'),
			params: {},
			route: { id: '/api/themes' }
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

	it('should return empty array when no themes exist', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/themes');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/themes'),
			params: {},
			route: { id: '/api/themes' }
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

	it('should return themes for authenticated user', async () => {
		// Arrange: Create test themes
		await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});
		await createTestTheme(mockUser.id, {
			name: 'React学習',
			goal: 'Reactの基礎を習得する'
		});

		const request = new Request('http://localhost:5173/api/themes');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/themes'),
			params: {},
			route: { id: '/api/themes' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body.items).toHaveLength(2);
		expect(body.items[0].name).toBe('TypeScript学習');
		expect(body.items[1].name).toBe('React学習');
		expect(body.nextCursor).toBeNull();
	});

	it('should only return themes for the authenticated user (user isolation)', async () => {
		// Arrange: Create themes for two different users
		await createTestTheme(mockUser.id, {
			name: 'User1 Theme',
			goal: 'Goal for user 1'
		});
		await createTestTheme(mockUser2.id, {
			name: 'User2 Theme',
			goal: 'Goal for user 2'
		});

		const request = new Request('http://localhost:5173/api/themes');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/themes'),
			params: {},
			route: { id: '/api/themes' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body.items).toHaveLength(1);
		expect(body.items[0].name).toBe('User1 Theme');
	});

	it('should filter by isCompleted when includeCompleted=false', async () => {
		// Arrange
		await createTestTheme(mockUser.id, {
			name: 'Active Theme',
			goal: 'Active goal',
			isCompleted: false
		});
		await createTestTheme(mockUser.id, {
			name: 'Completed Theme',
			goal: 'Completed goal',
			isCompleted: true
		});

		const request = new Request('http://localhost:5173/api/themes?includeCompleted=false');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/themes?includeCompleted=false'),
			params: {},
			route: { id: '/api/themes' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body.items).toHaveLength(1);
		expect(body.items[0].name).toBe('Active Theme');
		expect(body.items[0].isCompleted).toBe(false);
	});

	it('should include completed themes when includeCompleted=true', async () => {
		// Arrange
		await createTestTheme(mockUser.id, {
			name: 'Active Theme',
			goal: 'Active goal',
			isCompleted: false
		});
		await createTestTheme(mockUser.id, {
			name: 'Completed Theme',
			goal: 'Completed goal',
			isCompleted: true
		});

		const request = new Request('http://localhost:5173/api/themes?includeCompleted=true');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/themes?includeCompleted=true'),
			params: {},
			route: { id: '/api/themes' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body.items).toHaveLength(2);
	});

	it('should validate limit parameter', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/themes?limit=300');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/themes?limit=300'),
			params: {},
			route: { id: '/api/themes' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('limit must be between 1 and 200');
	});

	it('should validate cursor parameter', async () => {
		// Arrange: Invalid base64 cursor
		const request = new Request('http://localhost:5173/api/themes?cursor=invalid!!!');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/themes?cursor=invalid!!!'),
			params: {},
			route: { id: '/api/themes' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('Invalid cursor format');
	});

	it('should not include archived themes by default (includeArchived=false)', async () => {
		// Arrange
		await createTestTheme(mockUser.id, {
			name: 'Active Theme',
			goal: 'Active goal',
			state: 'ACTIVE'
		});
		await createTestTheme(mockUser.id, {
			name: 'Archived Theme',
			goal: 'Archived goal',
			state: 'ARCHIVED'
		});

		const request = new Request('http://localhost:5173/api/themes');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: {},
			route: { id: '/api/themes' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body.items).toHaveLength(1);
		expect(body.items[0].name).toBe('Active Theme');
	});

	it('should include archived themes when includeArchived=true', async () => {
		// Arrange
		await createTestTheme(mockUser.id, {
			name: 'Active Theme',
			goal: 'Active goal',
			state: 'ACTIVE'
		});
		await createTestTheme(mockUser.id, {
			name: 'Archived Theme',
			goal: 'Archived goal',
			state: 'ARCHIVED'
		});

		const request = new Request('http://localhost:5173/api/themes?includeArchived=true');
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: {},
			route: { id: '/api/themes' }
		} as any;

		// Act
		const response = await GET(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body.items).toHaveLength(2);
		const names = (body.items as Array<{ name: string }>).map((t) => t.name).sort();
		expect(names).toEqual(['Active Theme', 'Archived Theme']);
	});
});
