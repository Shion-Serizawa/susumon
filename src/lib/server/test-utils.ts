/**
 * Test utilities for API endpoint testing
 */

import { prisma } from './db';

/**
 * Mock user for testing
 */
export const mockUser = {
	id: '00000000-0000-0000-0000-000000000001',
	email: 'test@example.com'
};

/**
 * Another mock user for testing user isolation
 */
export const mockUser2 = {
	id: '00000000-0000-0000-0000-000000000002',
	email: 'test2@example.com'
};

/**
 * Clean up database for tests
 * Deletes all data in reverse dependency order
 */
export async function cleanupDatabase() {
	// Use raw queries to bypass Prisma Client Extensions security guards
	// Delete all test data regardless of state
	await prisma.$executeRaw`DELETE FROM meta_note_themes`;
	await prisma.$executeRaw`DELETE FROM meta_notes`;
	await prisma.$executeRaw`DELETE FROM learning_log_entries`;
	await prisma.$executeRaw`DELETE FROM themes`;
}

/**
 * Create a test theme directly via SQL to bypass security guards
 * Returns the created theme data
 */
export async function createTestTheme(userId: string, data: {
	name: string;
	goal: string;
	shortName?: string;
	isCompleted?: boolean;
	state?: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
}) {
	// Use queryRaw with RETURNING to get the created record
	const result = await prisma.$queryRaw<Array<{
		id: string;
		user_id: string;
		name: string;
		goal: string;
		short_name: string | null;
		is_completed: boolean;
		state: string;
		created_at: Date;
		updated_at: Date;
	}>>`
		INSERT INTO themes (user_id, name, goal, short_name, is_completed, state, state_changed_at, created_at, updated_at)
		VALUES (
			${userId}::uuid,
			${data.name},
			${data.goal},
			${data.shortName ?? null},
			${data.isCompleted ?? false},
			${(data.state ?? 'ACTIVE')}::"ResourceState",
			NOW(),
			NOW(),
			NOW()
		)
		RETURNING *
	`;

	return result[0];
}
