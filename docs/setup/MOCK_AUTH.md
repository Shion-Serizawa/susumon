# モック認証ガイド

開発環境で Supabase OAuth のセットアップなしに開発を開始するための簡易認証システム。

---

## 概要

### 目的

- **開発速度の向上**: Supabase プロジェクトの作成、GitHub OAuth の設定なしに開発開始
- **オフライン開発**: ネット接続不要で認証フローをテスト
- **シンプル**: 固定ユーザーで自動ログイン

### 注意事項

⚠️ **本番環境では絶対に使用しないこと**

モック認証は開発専用です。本番環境では必ず Supabase Auth を使用してください。

---

## 使い方

### 1. モック認証を有効化

`.env` ファイルで以下を設定:

```env
USE_MOCK_AUTH="true"
NODE_ENV="development"
```

### 2. 開発サーバーを起動

```bash
make dev
# または
deno task dev
```

### 3. 動作確認

すべてのリクエストで自動的に以下のユーザーでログイン済みになります:

```typescript
{
  id: '00000000-0000-0000-0000-000000000001',
  email: 'dev@example.com',
  username: 'dev-user'
}
```

---

## 仕組み

### フロー

```
1. ブラウザ → SvelteKit サーバー
2. hooks.server.ts が実行
3. USE_MOCK_AUTH=true を検出
4. locals.user に固定ユーザーを設定
5. API エンドポイント → locals.user を使用
```

### コード

#### `src/lib/server/auth-mock.ts`

固定ユーザーの定義とモード判定。

```typescript
export const MOCK_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'dev@example.com',
  username: 'dev-user',
};

export function isMockAuthEnabled(): boolean {
  return Deno.env.get('USE_MOCK_AUTH') === 'true';
}
```

#### `src/hooks.server.ts`

リクエストごとに `locals.user` を設定。

```typescript
export const handle: Handle = async ({ event, resolve }) => {
  if (isMockAuthEnabled()) {
    event.locals.user = getMockUser();
    return resolve(event);
  }

  // 本番: Supabase Auth
  // ...
};
```

#### API エンドポイント

`locals.user` を使用して認証チェック。

```typescript
// src/routes/api/themes/+server.ts
export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ error: { code: 'Unauthorized', message: '...' } }, { status: 401 });
  }

  const themes = await prisma.theme.findMany({
    where: { userId: locals.user.id }, // モックユーザーのID
  });

  return json({ items: themes, nextCursor: null });
};
```

---

## 本番認証への移行

### 手順

1. **Supabase プロジェクトを作成**
   - [Supabase Dashboard](https://app.supabase.com/) にログイン
   - 新規プロジェクトを作成

2. **GitHub OAuth を設定**
   - GitHub → Settings → Developer settings → OAuth Apps
   - Callback URL: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
   - Client ID/Secret を Supabase に登録

3. **`.env` を更新**
   ```env
   USE_MOCK_AUTH="false"
   SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
   SUPABASE_ANON_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

4. **`hooks.server.ts` を実装**
   - Cookie から `access_token` を取得
   - Supabase で JWT を検証
   - `locals.user` を設定

5. **ログイン/ログアウト画面を実装**
   - `/login` ページで `signInWithOAuth` を呼び出し
   - `/auth/callback` でトークンを exchange
   - Cookie に保存

---

## トラブルシューティング

### 問題: モック認証が有効にならない

**確認事項**:
1. `.env` ファイルが存在するか
2. `USE_MOCK_AUTH="true"` が設定されているか
3. 開発サーバーを再起動したか

```bash
# .env を確認
cat .env | grep USE_MOCK_AUTH

# 開発サーバーを再起動
make dev
```

### 問題: API が 401 Unauthorized を返す

**原因**: `locals.user` が正しく設定されていない

**解決**:
```bash
# hooks.server.ts にログを追加
console.log('[Auth] locals.user:', event.locals.user);

# ブラウザの開発者ツールで確認
# Network タブ → API リクエスト → Preview
```

### 問題: 本番環境でモック認証が動作してしまう

**絶対に避けるべき状況**

**対策**:
1. `hooks.server.ts` に本番チェックを追加済み:
   ```typescript
   if (Deno.env.get('NODE_ENV') === 'production' && isMockAuthEnabled()) {
     throw new Error('Mock auth cannot be used in production!');
   }
   ```

2. デプロイ前チェック:
   ```bash
   /deploy-prep production
   ```

3. 環境変数を確認:
   ```bash
   # Deno Deploy ダッシュボードで
   USE_MOCK_AUTH が false であることを確認
   NODE_ENV が production であることを確認
   ```

---

## 複数ユーザーのテスト

モック認証で複数ユーザーをテストしたい場合。

### 方法 1: Cookie で切り替え

```typescript
// src/lib/server/auth-mock.ts
export function getMockUser(userId?: string): MockUser {
  if (userId === '2') {
    return {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'user2@example.com',
      username: 'user-2',
    };
  }

  return MOCK_USER; // デフォルトユーザー
}

// src/hooks.server.ts
const mockUserId = event.cookies.get('mock-user-id');
event.locals.user = getMockUser(mockUserId);
```

ブラウザの開発者ツールで Cookie `mock-user-id` を `1` or `2` に設定。

### 方法 2: クエリパラメータで切り替え

```typescript
// src/hooks.server.ts
const url = new URL(event.request.url);
const mockUserId = url.searchParams.get('mock_user');
event.locals.user = getMockUser(mockUserId);
```

アクセス: `http://localhost:5173?mock_user=2`

---

## まとめ

- **開発環境**: `USE_MOCK_AUTH=true` で固定ユーザー自動ログイン
- **本番環境**: `USE_MOCK_AUTH=false` + Supabase Auth
- **移行**: いつでも簡単に本番認証へ切り替え可能

モック認証により、OAuth の設定なしに API/UI 開発を開始できます。
