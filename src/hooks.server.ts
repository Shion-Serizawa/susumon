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

  try {
    // TODO: Supabase Client で JWT を検証
    // const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    // if (error) throw error;
    // event.locals.user = {
    //   id: user.id,
    //   email: user.email,
    //   username: user.user_metadata?.preferred_username || user.email
    // };

    // 暫定: モックユーザーを返す（本実装後に削除）
    console.warn('[Auth] Supabase auth not implemented yet, using mock user');
    event.locals.user = getMockUser();
  } catch (error) {
    console.error('[Auth] Failed to verify token:', error);
    event.locals.user = null;
  }

  return resolve(event);
};
