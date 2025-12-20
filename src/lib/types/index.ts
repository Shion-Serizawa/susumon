/**
 * Domain type definitions for Learning Log / Meta Note App (v0.2)
 * Based on: docs/spec/learning_log_meta_note_アプリ_db設計（draft_v_0.md (v0.2)
 */

// ===== Resource State =====

/**
 * ResourceState - リソースの状態（State Machine方式の論理削除）
 */
export const RESOURCE_STATES = ['ACTIVE', 'ARCHIVED', 'DELETED'] as const;
export type ResourceState = (typeof RESOURCE_STATES)[number];

/**
 * Check if a value is a valid ResourceState
 */
export function isValidResourceState(value: string): value is ResourceState {
	return RESOURCE_STATES.includes(value as ResourceState);
}

// ===== MetaNote Category =====

/**
 * MetaNoteCategory - メタノートのカテゴリ（英語キー）
 * DB値: 'INSIGHT', 'QUESTION', 'EMOTION'
 */
export const META_NOTE_CATEGORIES = ['INSIGHT', 'QUESTION', 'EMOTION'] as const;
export type MetaNoteCategory = (typeof META_NOTE_CATEGORIES)[number];

/**
 * Category labels for UI display (Japanese)
 */
export const CATEGORY_LABELS: Record<MetaNoteCategory, string> = {
	INSIGHT: '気づき',
	QUESTION: '疑問',
	EMOTION: '感情',
};

/**
 * Check if a value is a valid MetaNoteCategory
 */
export function isValidCategory(value: string): value is MetaNoteCategory {
	return META_NOTE_CATEGORIES.includes(value as MetaNoteCategory);
}

/**
 * Get Japanese label for a category
 */
export function getCategoryLabel(category: MetaNoteCategory): string {
	return CATEGORY_LABELS[category];
}

// ===== Domain Models =====

/**
 * Theme - 学習テーマ
 */
export interface Theme {
	id: string; // UUIDv7 (DB-generated)
	userId: string; // Supabase auth.users.id (uuid)
	name: string;
	shortName: string | null;
	goal: string;
	isCompleted: boolean;
	state: ResourceState;
	stateChangedAt: Date;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * LearningLogEntry - 日次ラーニングログ
 */
export interface LearningLogEntry {
	id: string; // UUIDv7 (DB-generated)
	userId: string; // Supabase auth.users.id (uuid)
	themeId: string;
	date: string; // YYYY-MM-DD (local JST date)
	summary: string;
	details: string | null;
	tags: string[];
	state: ResourceState;
	stateChangedAt: Date;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * MetaNote - メタノート（気づき/疑問/感情）
 */
export interface MetaNote {
	id: string; // UUIDv7 (DB-generated)
	userId: string; // Supabase auth.users.id (uuid)
	category: MetaNoteCategory; // 'INSIGHT', 'QUESTION', 'EMOTION'
	body: string;
	relatedLogId: string | null; // Optional single LearningLogEntry ID
	noteDate: string; // YYYY-MM-DD (auto-generated JST date at creation)
	state: ResourceState;
	stateChangedAt: Date;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * MetaNoteTheme - MetaNote <-> Theme 中間テーブル
 */
export interface MetaNoteTheme {
	metaNoteId: string;
	themeId: string;
	createdAt: Date;
}

/**
 * MetaNote with related themes (for API responses)
 */
export interface MetaNoteWithThemes extends MetaNote {
	themes: Array<{
		id: string;
		name: string;
	}>;
}

// ===== Authentication =====

/**
 * User - ユーザー（認証情報）
 * This is the minimal user info stored in locals.user
 */
export interface User {
	id: string; // Supabase auth.users.id (uuid)
	email: string;
}

// ===== API Responses =====

/**
 * API Error Response
 */
export interface ApiError {
	code: string;
	message: string;
	details?: unknown;
}

/**
 * API Error Response Wrapper
 */
export interface ApiErrorResponse {
	error: ApiError;
}

/**
 * Pagination Cursor (Base64-encoded JSON)
 * Used for cursor-based pagination across all API endpoints
 */
export interface PaginationCursor {
	// Cursor structure varies by endpoint (e.g., {createdAt, id} for themes)
	[key: string]: string | number | Date;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
	items: T[];
	nextCursor: string | null; // Base64-encoded cursor
}

// ===== DTOs (Data Transfer Objects) =====

/**
 * Theme Creation DTO
 */
export interface ThemeCreateDto {
	name: string;
	shortName?: string | null;
	goal: string;
	isCompleted?: boolean;
}

/**
 * Theme Update DTO
 */
export interface ThemeUpdateDto {
	name?: string;
	shortName?: string | null;
	goal?: string;
	isCompleted?: boolean;
}

/**
 * LearningLogEntry Creation DTO
 */
export interface LearningLogCreateDto {
	themeId: string;
	date: string; // YYYY-MM-DD
	summary: string;
	details?: string | null;
	tags?: string[];
}

/**
 * LearningLogEntry Update DTO
 */
export interface LearningLogUpdateDto {
	summary?: string;
	details?: string | null;
	tags?: string[];
}

/**
 * MetaNote Creation DTO
 */
export interface MetaNoteCreateDto {
	category: MetaNoteCategory;
	body: string;
	themeIds?: string[]; // Will be stored in meta_note_themes table
	relatedLogId?: string | null;
	// noteDate is auto-generated server-side (JST current date)
}

/**
 * MetaNote Update DTO
 */
export interface MetaNoteUpdateDto {
	category?: MetaNoteCategory;
	body?: string;
	themeIds?: string[]; // Will update meta_note_themes table
	relatedLogId?: string | null;
}
