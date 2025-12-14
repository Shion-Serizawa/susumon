/**
 * SvelteKit Server Hooks
 * - 認証処理（Supabase または モック）
 * - locals.user の設定
 */

import type { Handle } from '@sveltejs/kit';
import { isMockAuthEnabled, getMockUser } from '$lib/server/auth-mock';

export const handle: Handle = async ({ event, resolve }) => {
  // モック認証が有効な場合
  if (isMockAuthEnabled()) {
    console.log('[Auth] Using mock authentication');
    event.locals.user = getMockUser();
    return resolve(event);
  }

  // 本番認証（Supabase）
  // TODO: Supabase Auth の実装
  // 1. Cookie から access_token を取得
  // 2. Supabase でトークン検証
  // 3. locals.user を設定

  const accessToken = event.cookies.get('sb-access-token');

  if (!accessToken) {
    // 未認証
    event.locals.user = null;
    return resolve(event);
  }

  // NOTE:
  // ここから先は Supabase Auth の実装が入るまで「未認証扱い」で固定する。
  // USE_MOCK_AUTH=false なのにモックユーザーへフォールバックすると、本番での誤認証リスクになるため。
  console.warn('[Auth] Supabase auth not implemented yet; treating request as unauthenticated');
  event.locals.user = null;

  return resolve(event);
};
