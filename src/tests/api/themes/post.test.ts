import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from '../../../routes/api/themes/+server';
import { cleanupDatabase, mockUser } from '$lib/server/test-utils';

describe('POST /api/themes', () => {
	beforeEach(async () => {
		await cleanupDatabase();
	});

	afterEach(async () => {
		await cleanupDatabase();
	});

	it('should return 401 when user is not authenticated', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/themes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'Test Theme', goal: 'Test Goal' })
		});
		const event = {
			request,
			locals: {},
			url: new URL('http://localhost:5173/api/themes'),
			params: {},
			route: { id: '/api/themes' }
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

	it('should create a theme successfully with all fields', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/themes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: 'TypeScript学習',
				shortName: 'TS',
				goal: 'TypeScriptの基礎を習得する',
				isCompleted: false
			})
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/themes'),
			params: {},
			route: { id: '/api/themes' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(201);
		expect(body).toMatchObject({
			name: 'TypeScript学習',
			shortName: 'TS',
			goal: 'TypeScriptの基礎を習得する',
			isCompleted: false,
			userId: mockUser.id,
			state: 'ACTIVE'
		});
		expect(body.id).toBeDefined();
		expect(body.createdAt).toBeDefined();
		expect(body.updatedAt).toBeDefined();
	});

	it('should create a theme with only required fields', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/themes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: 'React学習',
				goal: 'Reactの基礎を習得する'
			})
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/themes'),
			params: {},
			route: { id: '/api/themes' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(201);
		expect(body).toMatchObject({
			name: 'React学習',
			goal: 'Reactの基礎を習得する',
			isCompleted: false, // デフォルト値
			userId: mockUser.id
		});
		expect(body.shortName).toBeNull();
	});

	it('should return 400 when name is missing', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/themes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				goal: 'Test Goal'
			})
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/themes'),
			params: {},
			route: { id: '/api/themes' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('name');
	});

	it('should return 400 when name is empty string', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/themes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: '   ',
				goal: 'Test Goal'
			})
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/themes'),
			params: {},
			route: { id: '/api/themes' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('name');
	});

	it('should return 400 when goal is missing', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/themes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: 'Test Theme'
			})
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/themes'),
			params: {},
			route: { id: '/api/themes' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('goal');
	});

	it('should return 400 when goal is empty string', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/themes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: 'Test Theme',
				goal: '   '
			})
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/themes'),
			params: {},
			route: { id: '/api/themes' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('goal');
	});

	it('should return 400 when isCompleted is not a boolean', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/themes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: 'Test Theme',
				goal: 'Test Goal',
				isCompleted: 'true' // 文字列
			})
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/themes'),
			params: {},
			route: { id: '/api/themes' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('isCompleted');
	});

	it('should return 400 when body is invalid JSON', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/themes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: 'invalid json{'
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/themes'),
			params: {},
			route: { id: '/api/themes' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('Invalid JSON');
	});

	it('should handle shortName as null', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/themes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: 'Test Theme',
				goal: 'Test Goal',
				shortName: null
			})
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/themes'),
			params: {},
			route: { id: '/api/themes' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(201);
		expect(body.shortName).toBeNull();
	});

	it('should handle empty shortName as null', async () => {
		// Arrange
		const request = new Request('http://localhost:5173/api/themes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: 'Test Theme',
				goal: 'Test Goal',
				shortName: '   ' // 空白文字列
			})
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL('http://localhost:5173/api/themes'),
			params: {},
			route: { id: '/api/themes' }
		} as any;

		// Act
		const response = await POST(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(201);
		expect(body.shortName).toBeNull();
	});
});
