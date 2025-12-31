import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PATCH } from '../../../routes/api/logs/[id]/+server';
import {
	cleanupDatabase,
	mockUser,
	mockUser2,
	createTestTheme,
	createTestLog
} from '$lib/server/test-utils';

describe('PATCH /api/logs/[id]', () => {
	beforeEach(async () => {
		await cleanupDatabase();
	});

	afterEach(async () => {
		await cleanupDatabase();
	});

	it('should return 401 when user is not authenticated', async () => {
		// Arrange
		const requestBody = { summary: 'Updated summary' };
		const request = new Request('http://localhost:5173/api/logs/00000000-0000-0000-0000-000000000001', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: {},
			url: new URL('http://localhost:5173/api/logs/00000000-0000-0000-0000-000000000001'),
			params: { id: '00000000-0000-0000-0000-000000000001' },
			route: { id: '/api/logs/[id]' }
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

	it('should update log summary successfully', async () => {
		// Arrange
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const log = await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-15',
			summary: 'Original summary',
			details: 'Original details',
			tags: ['tag1']
		});

		const requestBody = {
			summary: 'Updated summary'
		};

		const request = new Request(`http://localhost:5173/api/logs/${log.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: log.id },
			route: { id: '/api/logs/[id]' }
		} as any;

		// Act
		const response = await PATCH(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body.summary).toBe('Updated summary');
		expect(body.details).toBe('Original details'); // Unchanged
		expect(body.tags).toEqual(['tag1']); // Unchanged
	});

	it('should update log details successfully', async () => {
		// Arrange
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const log = await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-15',
			summary: 'Summary',
			details: 'Original details'
		});

		const requestBody = {
			details: 'Updated details'
		};

		const request = new Request(`http://localhost:5173/api/logs/${log.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: log.id },
			route: { id: '/api/logs/[id]' }
		} as any;

		// Act
		const response = await PATCH(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body.details).toBe('Updated details');
		expect(body.summary).toBe('Summary'); // Unchanged
	});

	it('should update log tags successfully', async () => {
		// Arrange
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const log = await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-15',
			summary: 'Summary',
			tags: ['old-tag']
		});

		const requestBody = {
			tags: ['new-tag1', 'new-tag2']
		};

		const request = new Request(`http://localhost:5173/api/logs/${log.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: log.id },
			route: { id: '/api/logs/[id]' }
		} as any;

		// Act
		const response = await PATCH(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body.tags).toEqual(['new-tag1', 'new-tag2']);
	});

	it('should update multiple fields at once', async () => {
		// Arrange
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const log = await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-15',
			summary: 'Original summary',
			details: 'Original details',
			tags: ['old']
		});

		const requestBody = {
			summary: 'New summary',
			details: 'New details',
			tags: ['new']
		};

		const request = new Request(`http://localhost:5173/api/logs/${log.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: log.id },
			route: { id: '/api/logs/[id]' }
		} as any;

		// Act
		const response = await PATCH(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body.summary).toBe('New summary');
		expect(body.details).toBe('New details');
		expect(body.tags).toEqual(['new']);
	});

	it('should set details to null', async () => {
		// Arrange
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const log = await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-15',
			summary: 'Summary',
			details: 'Some details'
		});

		const requestBody = {
			details: null
		};

		const request = new Request(`http://localhost:5173/api/logs/${log.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: log.id },
			route: { id: '/api/logs/[id]' }
		} as any;

		// Act
		const response = await PATCH(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(body.details).toBeNull();
	});

	it('should return 400 when no fields are provided', async () => {
		// Arrange
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const log = await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-15',
			summary: 'Summary'
		});

		const requestBody = {};

		const request = new Request(`http://localhost:5173/api/logs/${log.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: log.id },
			route: { id: '/api/logs/[id]' }
		} as any;

		// Act
		const response = await PATCH(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('At least one field must be provided');
	});

	it('should return 400 when summary is empty string', async () => {
		// Arrange
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const log = await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-15',
			summary: 'Summary'
		});

		const requestBody = {
			summary: '   '
		};

		const request = new Request(`http://localhost:5173/api/logs/${log.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: log.id },
			route: { id: '/api/logs/[id]' }
		} as any;

		// Act
		const response = await PATCH(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('summary must be a non-empty string');
	});

	it('should return 400 when tags is not an array', async () => {
		// Arrange
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const log = await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-15',
			summary: 'Summary'
		});

		const requestBody = {
			tags: 'not-an-array'
		};

		const request = new Request(`http://localhost:5173/api/logs/${log.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: log.id },
			route: { id: '/api/logs/[id]' }
		} as any;

		// Act
		const response = await PATCH(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('tags must be an array');
	});

	it('should return 404 when log does not exist', async () => {
		// Arrange
		const nonExistentId = '00000000-0000-0000-0000-999999999999';
		const requestBody = {
			summary: 'Updated summary'
		};

		const request = new Request(`http://localhost:5173/api/logs/${nonExistentId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: nonExistentId },
			route: { id: '/api/logs/[id]' }
		} as any;

		// Act
		const response = await PATCH(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(404);
		expect(body).toEqual({
			error: {
				code: 'NotFound',
				message: 'Log not found'
			}
		});
	});

	it('should not update log from another user (user isolation)', async () => {
		// Arrange: Create log for user2
		const theme = await createTestTheme(mockUser2.id, {
			name: 'User2 Theme',
			goal: 'Goal for user 2'
		});

		const log = await createTestLog(mockUser2.id, {
			themeId: theme.id,
			date: '2025-01-15',
			summary: 'Original summary'
		});

		const requestBody = {
			summary: 'Hacked summary'
		};

		// Try to update with mockUser
		const request = new Request(`http://localhost:5173/api/logs/${log.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: log.id },
			route: { id: '/api/logs/[id]' }
		} as any;

		// Act
		const response = await PATCH(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(404);
		expect(body).toEqual({
			error: {
				code: 'NotFound',
				message: 'Log not found'
			}
		});
	});

	it('should return 400 when JSON body is invalid', async () => {
		// Arrange
		const theme = await createTestTheme(mockUser.id, {
			name: 'TypeScript学習',
			goal: 'TypeScriptの基礎を習得する'
		});

		const log = await createTestLog(mockUser.id, {
			themeId: theme.id,
			date: '2025-01-15',
			summary: 'Summary'
		});

		const request = new Request(`http://localhost:5173/api/logs/${log.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: 'invalid json{'
		});
		const event = {
			request,
			locals: { user: mockUser },
			url: new URL(request.url),
			params: { id: log.id },
			route: { id: '/api/logs/[id]' }
		} as any;

		// Act
		const response = await PATCH(event);
		const body = await response.json();

		// Assert
		expect(response.status).toBe(400);
		expect(body.error.code).toBe('BadRequest');
		expect(body.error.message).toContain('Invalid JSON body');
	});
});
