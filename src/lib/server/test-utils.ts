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

/**
 * Create a test learning log directly via SQL to bypass security guards
 * Returns the created log data
 */
export async function createTestLog(userId: string, data: {
	themeId: string;
	date: string;
	summary: string;
	details?: string | null;
	tags?: string[];
	state?: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
}) {
	// Use queryRaw with RETURNING to get the created record
	const result = await prisma.$queryRaw<Array<{
		id: string;
		user_id: string;
		theme_id: string;
		date: Date;
		summary: string;
		details: string | null;
		tags: string[];
		state: string;
		created_at: Date;
		updated_at: Date;
	}>>`
		INSERT INTO learning_log_entries (user_id, theme_id, date, summary, details, tags, state, state_changed_at, created_at, updated_at)
		VALUES (
			${userId}::uuid,
			${data.themeId}::uuid,
			${data.date}::date,
			${data.summary},
			${data.details ?? null},
			${data.tags ?? []}::text[],
			${(data.state ?? 'ACTIVE')}::"ResourceState",
			NOW(),
			NOW(),
			NOW()
		)
		RETURNING *
	`;

	return result[0];
}

/**
 * Create a test meta note directly via SQL to bypass security guards
 * Returns the created note data
 */
export async function createTestNote(userId: string, data: {
	category: 'INSIGHT' | 'QUESTION' | 'EMOTION';
	body: string;
	noteDate: string;
	relatedLogId?: string | null;
	themeIds?: string[];
	state?: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
}) {
	// Use queryRaw with RETURNING to get the created record
	const result = await prisma.$queryRaw<Array<{
		id: string;
		user_id: string;
		category: string;
		body: string;
		note_date: Date;
		related_log_id: string | null;
		state: string;
		created_at: Date;
		updated_at: Date;
	}>>`
		INSERT INTO meta_notes (user_id, category, body, note_date, related_log_id, state, state_changed_at, created_at, updated_at)
		VALUES (
			${userId}::uuid,
			${data.category},
			${data.body},
			${data.noteDate}::date,
			${data.relatedLogId ?? null}::uuid,
			${(data.state ?? 'ACTIVE')}::"ResourceState",
			NOW(),
			NOW(),
			NOW()
		)
		RETURNING *
	`;

	const note = result[0];

	// Insert theme relationships if themeIds provided
	if (data.themeIds && data.themeIds.length > 0) {
		for (const themeId of data.themeIds) {
			await prisma.$executeRaw`
				INSERT INTO meta_note_themes (meta_note_id, theme_id, created_at)
				VALUES (${note.id}::uuid, ${themeId}::uuid, NOW())
			`;
		}
	}

	return note;
}
