# 開発環境セットアップガイド

Learning Log / Meta Note アプリの開発環境を構築する手順。

---

## 前提条件

- **Deno**: v2.60 以上（[インストール](https://deno.land/manual/getting_started/installation)）
- **Git**: バージョン管理
- **Node.js**: v18 以上（任意。入れておくと周辺ツールが楽なことがあります）
- **PostgreSQL**: v14 以上（ローカル開発用）

---

## 1. リポジトリのクローン

```bash
git clone https://github.com/YOUR_USERNAME/susumon.git
cd susumon
```

---

## 2. 前提ソフトウェアのインストール

### 必須
- **Deno**: v2.60 以上
  ```bash
  # インストール（まだの場合）
  # macOS/Linux
  curl -fsSL https://deno.land/install.sh | sh

  # Windows
  irm https://deno.land/install.ps1 | iex
  ```

- **Docker & Docker Compose**: 最新版（DB用）
  - [Docker Desktop](https://www.docker.com/products/docker-desktop/) をインストール

### オプション
- **Node.js**: v18以上（なくても可）

### 確認
```bash
deno --version     # deno 2.60.0 以上
docker --version   # Docker version 24.0.0 以上
docker compose version  # Docker Compose version v2.20.0 以上
```

---

## 3. クイックスタート（最速セットアップ）

**初めての場合は、この1コマンドで全自動セットアップ**:

```bash
deno task setup
```

これで以下がすべて実行されます:
1. `.env` ファイルの作成（`.env.example` からコピー）
2. PostgreSQL の Docker コンテナ起動
3. Prisma マイグレーション実行

その後、`.env` を編集して Supabase の設定を追加してください。

---

## 4. 手動セットアップ（詳細版）

クイックスタートがうまくいかない場合、または細かく制御したい場合。

### 4.1 依存関係のインストール

```bash
# Prisma CLI は `deno task db:*` で実行できます（グローバルインストール不要）
# Node系ツールを使う場合のみ `npm install` を実行してください
```

### 4.2 環境変数の設定

#### 4.2.1 `.env` ファイルの作成

`.env.example` をコピーして `.env` を作成:

```bash
cp .env.example .env
```

### 3.2 必要な環境変数

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/susumon?schema=public"

# Supabase (認証)
SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
SUPABASE_ANON_KEY="YOUR_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"

# Application
APP_ORIGIN="http://localhost:5173"
```

### 3.3 Supabase プロジェクトの作成

1. [Supabase Dashboard](https://app.supabase.com/) にログイン
2. 新規プロジェクトを作成
3. Settings → API → Project URL を `SUPABASE_URL` にコピー
4. Settings → API → anon public を `SUPABASE_ANON_KEY` にコピー
5. Settings → API → service_role (secret) を `SUPABASE_SERVICE_ROLE_KEY` にコピー

### 3.4 GitHub OAuth の設定

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. 以下を設定:
   - **Application name**: Learning Log (Dev)
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
3. Client ID と Client Secret を取得
4. Supabase Dashboard → Authentication → Providers → GitHub を有効化
5. GitHub の Client ID と Secret を Supabase に登録

---

## 4. データベースのセットアップ

### 推奨: Docker Compose（ローカル完結型）

**最も簡単でおすすめ**の方法です。

```bash
# 1. PostgreSQL を Docker で起動
deno task db:up

# または
docker compose up -d postgres

# 2. マイグレーションを実行
deno task db:migrate

# または
deno task db:migrate:dev

# 3. Prisma Studio（DB GUI）で確認
deno task db:studio

# または
deno task db:studio
```

**動作確認**:
- PostgreSQL: `localhost:5432`
- Adminer (Web UI): `http://localhost:8080`
  - System: PostgreSQL
  - Server: postgres
  - Username: susumon
  - Password: susumon_dev_password
  - Database: susumon_dev

### オプション 1: ローカル PostgreSQL（直接インストール）

Docker を使いたくない場合。

```bash
# PostgreSQL を起動（macOS Homebrew の例）
brew services start postgresql@16

# データベースを作成
createdb susumon_dev

# .env を編集
DATABASE_URL="postgresql://YOUR_USER@localhost:5432/susumon_dev"

# マイグレーション実行
deno task db:migrate:dev
```

### オプション 2: Deno Deploy Prisma Postgres (本番と同じ環境)

本番環境と同じ Deno Deploy Prisma Postgres を開発環境でも使いたい場合。

1. [Deno Deploy Dashboard](https://dash.deno.com/) にログイン
2. プロジェクトを作成
3. Database タブ → Prisma Postgres をプロビジョニング
4. Connection String をコピー
5. `.env` に設定:
   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@your-project.prisma.deno.dev/database?sslmode=require"
   ```
6. マイグレーション実行:
   ```bash
   deno task db:migrate:dev
   ```

**注意**: 本番環境では Deno Deploy Prisma Postgres を使用します。開発環境はローカル Docker が推奨です。

### データベースのリセット（開発中）

```bash
# すべてのデータを削除して再構築
deno task db:reset
```

**警告**: 本番環境では絶対に実行しないこと！

---

## 5. 開発サーバーの起動

```bash
# SvelteKit 開発サーバー（内部で Prisma Client 生成も実行）
deno task dev
```

ブラウザで [http://localhost:5173](http://localhost:5173) を開く。

---

## 6. 動作確認

### 6.1 認証フローのテスト

1. `/login` にアクセス
2. "Login with GitHub" をクリック
3. GitHub でアプリを承認
4. リダイレクトされてホーム画面に遷移

### 6.2 API エンドポイントのテスト

```bash
# 例: テーマ一覧取得（要認証）
curl -H "Cookie: YOUR_SESSION_COOKIE" http://localhost:5173/api/themes
```

---

## 7. テストの実行

```bash
# 全テストを実行
deno task test

# 特定のテストファイル
deno task test src/routes/api/themes/+server.test.ts
```

---

## 8. コード品質チェック

```bash
# TypeScript 型チェック
deno task typecheck

# Linter
deno task lint

# Formatter（自動整形）
deno task format
```

---

## 9. Claude Code の設定（推奨）

### 9.1 CLAUDE.md の確認

プロジェクトルートの `CLAUDE.md` を確認。Claude Code がこのファイルを読み込んでプロジェクトのコンテキストを理解します。

### 9.2 MCP サーバーのインストール

詳細は `docs/setup/MCP_SETUP.md` を参照。

必須:
- **GitHub**: PR・Issue 管理
 - （DB 管理は基本 `Prisma Studio` を使用）

推奨:
- **Context7**: 最新ドキュメント検索
- **Brave Search**: Web 検索
- （v0.1 未導入）E2E テスト

### 9.3 カスタム Skills のインストール

```bash
# Skills は .claude/skills/ に既に配置されています
# Claude Code 起動時に自動読み込みされます
```

### 9.4 スラッシュコマンドの確認

```bash
# 利用可能なコマンド
/review          # コードレビュー
/spec-check      # 仕様との整合性チェック
/deploy-prep     # デプロイ準備チェック
```

---

## 10. 開発ワークフロー

### 10.1 新機能の実装

1. **仕様確認**: `docs/spec/` 内のドキュメントを参照
2. **Plan Mode**: Claude Code で Shift+Tab 2回押下 → 実装計画を立てる
3. **実装**: API → DB → UI の順で実装
4. **テスト**: `/test-e2e` または `deno task test`
5. **レビュー**: `/review` でコード品質チェック
6. **コミット**: `git commit -m "feat: 新機能の説明"`

### 10.2 バグ修正

1. **再現**: 問題を再現する手順を確認
2. **原因特定**: ログ・デバッガを使用
3. **修正**: 最小限の変更で修正
4. **テスト**: 回帰テストを追加
5. **コミット**: `git commit -m "fix: バグの説明"`

---

## 11. トラブルシューティング

### 問題: Prisma Client が見つからない

```bash
# Prisma Client を再生成
deno task db:generate
```

### 問題: マイグレーションが失敗する

```bash
# マイグレーション履歴を確認
deno task db:migrate:status

# データベースをリセット（開発環境のみ！）
deno task db:reset
```

### 問題: Supabase 認証エラー

1. `.env` の `SUPABASE_URL` と `SUPABASE_ANON_KEY` を確認
2. Supabase Dashboard で GitHub Provider が有効か確認
3. Callback URL が正しいか確認（`https://YOUR_PROJECT.supabase.co/auth/v1/callback`）

### 問題: Deno Deploy でビルドエラー

1. `deno.json` の `compilerOptions.lib` に `["deno.window", "dom"]` が含まれているか確認
2. `@deno/svelte-adapter` が最新版か確認
3. `docs/tech/deno_deploy_sveltekit_注意点_2025.md` を参照

---

## 12. 参考リンク

- [SvelteKit ドキュメント](https://kit.svelte.dev/docs)
- [Prisma ドキュメント](https://www.prisma.io/docs)
- [Deno Deploy ドキュメント](https://deno.com/deploy/docs)
- [Supabase ドキュメント](https://supabase.com/docs)
- [Claude Code ガイド](https://docs.anthropic.com/claude/docs/claude-code)

---

セットアップが完了したら、`/spec-check`（Claude Code のスラッシュコマンド）で仕様との整合性を確認してから開発を開始することを推奨します。
