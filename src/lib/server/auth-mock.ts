/**
 * モック認証 - 開発環境専用
 *
 * Supabase OAuth のセットアップなしで開発できるようにする簡易認証。
 * 本番環境では絶対に使用しないこと。
 */

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
 * 環境変数で開発モードかどうかを判定
 */
export function isDevMode(): boolean {
  return Deno.env.get('DEV_MODE') === 'true' || Deno.env.get('NODE_ENV') === 'development';
}

/**
 * モック認証が有効かどうか
 */
export function isMockAuthEnabled(): boolean {
  return Deno.env.get('USE_MOCK_AUTH') === 'true';
}

/**
 * モックユーザーを取得
 * 本番環境で誤って呼ばれた場合はエラーを投げる
 */
export function getMockUser(): MockUser {
  if (!isMockAuthEnabled()) {
    throw new Error('Mock auth is not enabled. Set USE_MOCK_AUTH=true in .env');
  }

  if (Deno.env.get('NODE_ENV') === 'production') {
    throw new Error('Mock auth cannot be used in production!');
  }

  return MOCK_USER;
}
