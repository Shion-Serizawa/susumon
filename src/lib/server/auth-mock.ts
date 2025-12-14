/**
 * モック認証 - 開発環境専用
 *
 * Supabase OAuth のセットアップなしで開発できるようにする簡易認証。
 * 本番環境では絶対に使用しないこと。
 */

import process from 'node:process';

export interface MockUser {
  id: string;
  email: string;
  username: string;
}

/**
 * 開発用の固定ユーザー（UUIDv4形式）
 */
export const MOCK_USER: MockUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'dev@example.com',
  username: 'dev-user',
};

/**
 * 環境変数を取得（Deno/Node 両対応）
 */
function getEnv(key: string): string | undefined {
  // Deno 環境（`Deno` グローバルは型環境によって存在しないため、globalThis 経由で安全に参照する）
  const deno = (globalThis as { Deno?: { env?: { get?: (k: string) => string | undefined } } })
    .Deno;
  const denoValue = deno?.env?.get?.(key);
  if (denoValue !== undefined) return denoValue;

  // Node.js 環境
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
}

/**
 * 環境変数で開発モードかどうかを判定
 */
export function isDevMode(): boolean {
  return getEnv('DEV_MODE') === 'true' || getEnv('NODE_ENV') === 'development';
}

/**
 * モック認証が有効かどうか
 */
export function isMockAuthEnabled(): boolean {
  return getEnv('USE_MOCK_AUTH') === 'true';
}

/**
 * モックユーザーを取得
 * 本番環境で誤って呼ばれた場合はエラーを投げる
 */
export function getMockUser(): MockUser {
  if (!isMockAuthEnabled()) {
    throw new Error('Mock auth is not enabled. Set USE_MOCK_AUTH=true in .env');
  }

  if (getEnv('NODE_ENV') === 'production') {
    throw new Error('Mock auth cannot be used in production!');
  }

  return MOCK_USER;
}
