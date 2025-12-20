/**
 * Domain type definitions for Learning Log / Meta Note App
 * Based on: docs/spec/learning_log_meta_note_アプリ_機能仕様（draft_v_0.md
 */

/**
 * Theme - 学習テーマ
 */
export interface Theme {
  id: string; // UUIDv7
  userId: string; // Supabase auth.users.id (uuid)
  name: string;
  shortName: string | null;
  goal: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null; // v0.1: defined but not used (no soft delete)
}

/**
 * LearningLogEntry - 日次ラーニングログ
 */
export interface LearningLogEntry {
  id: string; // UUIDv7
  userId: string; // Supabase auth.users.id (uuid)
  themeId: string;
  date: string; // YYYY-MM-DD (local JST date)
  summary: string;
  details: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null; // v0.1: defined but not used (no soft delete)
}

/**
 * MetaNote - メタノート（気づき/疑問/感情）
 */
export interface MetaNote {
  id: string; // UUIDv7
  userId: string; // Supabase auth.users.id (uuid)
  category: MetaNoteCategory;
  body: string;
  themeIds: string[]; // 0..N theme IDs
  relatedLogId: string | null; // Optional single LearningLogEntry ID
  noteDate: string; // YYYY-MM-DD (auto-generated JST date at creation)
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null; // v0.1: defined but not used (no soft delete)
}

/**
 * MetaNoteCategory - メタノートのカテゴリ（Enum）
 */
export enum MetaNoteCategory {
  KIZUKI = '気づき',
  GIMON = '疑問',
  KANJO = '感情',
}

/**
 * User - ユーザー（認証情報）
 * This is the minimal user info stored in locals.user
 */
export interface User {
  id: string; // Supabase auth.users.id (uuid)
  email: string;
}

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
  data: T[];
  nextCursor: string | null; // Base64-encoded cursor
  hasMore: boolean;
}
