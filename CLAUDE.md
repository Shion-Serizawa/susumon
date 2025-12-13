# Learning Log / Meta Note アプリ - Claude Code プロジェクトメモリ

## Project Context

### Purpose
個人学習の継続と振り返りを目的とした個人用ログ管理アプリケーション（v0.1）

### Architecture
- **Framework**: SvelteKit (Fullstack - Single Repository)
- **Runtime**: Deno Deploy
- **Database**: Neon PostgreSQL または Deno Deploy Prisma Postgres
- **ORM**: Prisma (Deno Deploy対応)
- **Auth**: Supabase Auth (GitHub OAuth)
- **ID Strategy**: UUIDv7 (アプリ側生成), user_id は Supabase auth.users.id (uuid)

### Core Domain
- **Theme**: 学習テーマ（フラット構造、達成フラグ付き）
- **LearningLogEntry**: 日次学習ログ（1日1テーマ1ログ制約）
- **MetaNote**: メタ認知記録（気づき/疑問/感情、テーマ複数紐付け可）

---

## Key Directories

```
susumon/
├── docs/
│   ├── spec/                    # 仕様書（機能・技術・DB設計）
│   └── tech/                    # 技術ドキュメント
├── src/
│   ├── routes/
│   │   ├── api/                 # API エンドポイント (+server.ts)
│   │   └── (app)/               # UI ページ (+page.svelte)
│   ├── lib/
│   │   ├── server/              # サーバー専用コード（DB, auth）
│   │   ├── components/          # Svelte コンポーネント
│   │   └── types/               # TypeScript 型定義
│   └── hooks.server.ts          # SvelteKit フック（認証）
├── prisma/
│   ├── schema.prisma            # Prisma スキーマ
│   └── migrations/              # マイグレーション
└── .claude/                     # Claude Code 設定
```

---

## Standards

### Before Coding (BP: Before Practice)

- **BP-1 (MUST)**: 仕様書を参照して要件を確認する
  - 機能仕様: `docs/spec/learning_log_meta_note_アプリ_機能仕様（draft_v_0.md`
  - 技術仕様: `docs/spec/learning_log_meta_note_アプリ_技術仕様（final_v_0.md`
  - DB設計: `docs/spec/learning_log_meta_note_アプリ_db設計（draft_v_0.md`

- **BP-2 (MUST)**: 複雑な実装は Plan Mode（Shift+Tab 2回）でアプローチを確認

- **BP-3 (SHOULD)**: 既存コードのパターンを踏襲（`user_id` スコープ制限、エラーハンドリング）

### While Coding (C: Coding)

- **C-1 (MUST)**: API は必ず `user_id` でスコープ制限（越境防止）
  ```typescript
  // Good
  const themes = await prisma.theme.findMany({
    where: { userId: locals.user.id }
  });

  // Bad (全ユーザーのデータが取れてしまう)
  const themes = await prisma.theme.findMany();
  ```

- **C-2 (MUST)**: ドメイン用語を統一
  - `theme` (テーマ), `log` (ラーニングログ), `note` (メタノート)
  - `noteDate` (noteDateであってdate_noteではない)

- **C-3 (MUST)**: エラーレスポンスは統一フォーマット
  ```typescript
  return json({ error: { code: 'NotFound', message: '...' } }, { status: 404 });
  ```

- **C-4 (MUST)**: 日付処理は JST ローカル日付（`YYYY-MM-DD`）
  - `LearningLogEntry.date`, `MetaNote.noteDate` は `DATE` 型
  - `createdAt`, `updatedAt` は `timestamptz` (UTC)

- **C-5 (SHOULD)**: Pagination はカーソル方式（Base64 JSON）
  - themes: `{createdAt, id}` (昇順)
  - logs: `{date, createdAt, id}` (降順)
  - notes: `{noteDate, createdAt, id}` (降順)

- **C-6 (SHOULD)**: 型安全性を優先（Prisma型を活用、`any` は避ける）

### Testing (T)

- **T-1 (SHOULD)**: API エンドポイントには最低限の統合テストを追加
- **T-2 (SHOULD)**: 一意制約違反、外部キー制約違反のテストケースを含める

### Database (DB)

- **DB-1 (MUST)**: マイグレーションは手動実行（`prisma migrate dev` / `deploy`）
- **DB-2 (MUST)**: v0.1 は物理削除（`deleted_at` は定義するが使用しない）
- **DB-3 (MUST)**: UUIDv7 はアプリ側で生成（`uuidv7()` 関数を使用）

---

## Common Commands

```bash
# 開発サーバー起動
deno task dev

# Prisma マイグレーション
deno task db:migrate:dev     # 開発環境
deno task db:migrate:deploy  # 本番環境

# Prisma Studio（DB GUI）
deno task db:studio

# 型チェック
deno task typecheck

# Lint & Format
deno task lint
deno task format

# テスト
deno task test
```

---

## Critical Constraints (v0.1)

### Data Constraints
1. **1日1テーマ1ログ**: `(user_id, theme_id, date)` は一意（DB 制約）
2. **MetaNote の noteDate**: サーバー側で自動生成（作成時の JST 日付）
3. **category**: `'気づき' | '疑問' | '感情'` の3値のみ（CHECK 制約）

### Business Rules
- `isCompleted = true` のテーマはラーニングログ入力UIでは非表示
- メタノート入力UIでは、達成済みテーマもトグルで選択可能
- `relatedLogId` は任意（日次ログ画面から作成時は自動設定）

### Technical Decisions
- **認証**: HttpOnly Cookie でセッション保持（`SameSite=Lax`, `Secure=true`）
- **ページネーション**: カーソル方式（limit: 1-200, default: 50）
- **CSV Export**: 配列フィールドは `;` 区切り（詳細仕様は後回し）

---

## Gotchas & Pitfalls

### [2025-01-XX] Deno Deploy + SvelteKit
- `@sveltejs/adapter-deno` を使用（公式ドキュメント参照: `docs/tech/deno_deploy_sveltekit_注意点_2025.md`）
- `deno.json` の `compilerOptions.lib` に `["deno.window", "dom"]` 必須

### [2025-01-XX] Supabase Auth + Cookie
- `hooks.server.ts` で Cookie からトークン読み取り → `locals.user` 設定
- クライアント側は `/api/auth/session` で状態確認（Bearer は JS で保持しない）

### [2025-01-XX] Prisma + Deno
- Edge 対応の Prisma Client 生成が必要（`prisma generate --data-proxy` 等）
- 接続プールの設定に注意（Neon は `?pgbouncer=true` 推奨）

### [2025-01-XX] UUIDv7
- 時系列ソートが可能（created_at のインデックス削減に有効）
- npm パッケージ `uuidv7` を使用予定

---

## Documentation Pointers

- 仕様書（最新版の確認必須）:
  - 機能仕様: `docs/spec/learning_log_meta_note_アプリ_機能仕様（draft_v_0.md:1`
  - 技術仕様: `docs/spec/learning_log_meta_note_アプリ_技術仕様（final_v_0.md:1`
  - DB設計: `docs/spec/learning_log_meta_note_アプリ_db設計（draft_v_0.md:1`

- OpenAPI 定義: `docs/spec/learning_log_meta_note_アプリ_技術仕様（final_v_0.md:69`

- Pagination 実装詳細: `docs/spec/learning_log_meta_note_アプリ_技術仕様（final_v_0.md:759`

- 認証フロー図: `docs/spec/learning_log_meta_note_アプリ_技術仕様（final_v_0.md:695`

---

## Out of Scope (v0.1)

以下は意図的にスコープ外（後回し）:
- Rate Limit / Idempotency
- 監査ログ / 変更履歴
- RLS (Row Level Security) - API 層で担保
- 論理削除の実装（定義のみ）
- E2E テスト（最小限のみ）
- CSV Export の詳細仕様（エスケープルール等）

詳細: `docs/spec/learning_log_meta_note_アプリ_技術課題・後回し一覧（v_0.md`

---

## Version History

- **2025-01-XX**: v0.1 仕様確定、CLAUDE.md 初版作成
