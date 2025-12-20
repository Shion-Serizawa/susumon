# Learning Log / Meta Note アプリ

## Project Context

### Purpose
個人学習の継続と振り返りを目的とした個人用ログ管理アプリケーション（v0.2）

### Architecture
- **Framework**: SvelteKit (Fullstack - Single Repository)
- **Runtime**: Deno Deploy
- **Database**: Deno Deploy Prisma Postgres (PostgreSQL 17+)
- **ORM**: Prisma (Deno Deploy対応)
- **Auth**: Supabase Auth (GitHub OAuth)
- **ID Strategy**: UUIDv7 (DB側生成 `uuid_v7()`), user_id は Supabase auth.users.id (uuid)
- **State Management**: ResourceState enum (ACTIVE/ARCHIVED/DELETED)

### Core Domain
- **Theme**: 学習テーマ（フラット構造、達成フラグ付き、状態管理）
- **LearningLogEntry**: 日次学習ログ（1日1テーマ1ログ制約、状態管理）
- **MetaNote**: メタ認知記録（INSIGHT/QUESTION/EMOTION、テーマ多対多）
- **MetaNoteTheme**: MetaNote <-> Theme 中間テーブル

---

## Key Directories

```
susumon/
├── docs/
│   ├── spec/                    # 仕様書（機能・技術・DB設計）
│   ├── tech/                    # 技術ドキュメント
│   ├── tasks/                   # タスク計画（Phase別）
│   └── setup/                   # セットアップガイド
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

## Task Planning

開発タスクは段階的に計画されています：

- **Phase 0**: [環境構築](docs/tasks/00_環境構築.md) - 開発環境とインフラ基盤
- **Phase 1-BE**: [バックエンド開発](docs/tasks/01_バックエンド開発.md) - REST API実装（Phase 1-FEと並列可）
- **Phase 1-FE**: [フロントエンド開発](docs/tasks/02_フロントエンド開発.md) - UI/UX実装（Phase 1-BEと並列可）

**詳細**: [docs/tasks/README.md](docs/tasks/README.md) を参照

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
  // Good - Prisma Client Extensionsで自動チェック
  const themes = await prisma.theme.findMany({
    where: { userId: locals.user.id }  // userId必須（自動検証）
  });

  // Bad - SECURITYエラーが発生する
  const themes = await prisma.theme.findMany();
  // Error: "SECURITY: Theme.findMany requires userId in where clause"
  ```
  - **重要**: `src/lib/server/db.ts`でPrisma Client Extensionsによる自動検証を実装済み
  - `state != 'DELETED'` も自動付与（明示的に指定しない限り）

- **C-2 (MUST)**: ドメイン用語を統一
  - `theme` (テーマ), `log` (ラーニングログ), `note` (メタノート)
  - `noteDate` (noteDateであってdate_noteではない)
  - `category`: DB値は英語キー（INSIGHT/QUESTION/EMOTION）、UI表示は多言語対応

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
- **DB-2 (MUST)**: v0.2 はState Machine方式の論理削除（`state` カラムで管理）
  - ACTIVE: 通常状態
  - ARCHIVED: アーカイブ（将来の機能用）
  - DELETED: 削除済み（通常のクエリから除外）
- **DB-3 (MUST)**: UUIDv7 はDB側で生成（PostgreSQL 17の`uuid_v7()`関数）
  - Prismaスキーマ: `@default(dbgenerated("uuid_v7()"))`
  - アプリ側でのID生成は不要

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

## Critical Constraints (v0.2)

### Data Constraints
1. **1日1テーマ1ログ**: `(user_id, theme_id, date)` は一意（DB 制約）
2. **MetaNote の noteDate**: サーバー側で自動生成（作成時の JST 日付）
3. **category**: `'INSIGHT' | 'QUESTION' | 'EMOTION'` の3値のみ（CHECK 制約）
   - UI表示: INSIGHT→「気づき」、QUESTION→「疑問」、EMOTION→「感情」
4. **state**: すべてのリソースは状態を持つ（ACTIVE/ARCHIVED/DELETED）

### Business Rules
- `isCompleted = true` のテーマはラーニングログ入力UIでは非表示
- `state = 'DELETED'` のリソースは通常のクエリで自動除外（Prisma Extensions）
- メタノート入力UIでは、達成済みテーマもトグルで選択可能
- `relatedLogId` は任意（日次ログ画面から作成時は自動設定）

### Technical Decisions
- **認証**: HttpOnly Cookie でセッション保持（`SameSite=Lax`, `Secure=true`）
- **ページネーション**: カーソル方式（limit: 1-200, default: 50）
- **CSV Export**: 配列フィールドは `;` 区切り（詳細仕様は後回し）

---

## Gotchas & Pitfalls

### [2025-01-XX] Deno Deploy + SvelteKit
- `@deno/svelte-adapter` を使用（公式ドキュメント参照: `docs/tech/deno_deploy_sveltekit_注意点_2025.md`）
- `deno.json` の `compilerOptions.lib` に `["deno.window", "dom"]` 必須

### [2025-01-XX] Supabase Auth + Cookie
- `hooks.server.ts` で Cookie からトークン読み取り → `locals.user` 設定
- クライアント側は `/api/auth/session` で状態確認（Bearer は JS で保持しない）

### [2025-01-XX] Prisma + Deno
- Edge 対応の Prisma Client 生成が必要（`prisma generate --data-proxy` 等）
- 接続プールの設定に注意（Deno Deploy Prisma Postgres / Accelerate を利用する場合は公式ドキュメント優先）

### [2025-01-XX] UUIDv7 (v0.2)
- PostgreSQL 17の`uuid_v7()`関数をDB側で使用
- 時系列ソートが可能（created_at のインデックス削減に有効）
- アプリ側でのID生成は不要（DB側で自動採番）

### [2025-01-XX] State Machine論理削除 (v0.2)
- すべてのリソースに`state`カラム（ResourceState enum）
- Prisma Client Extensionsで自動的に`state != 'DELETED'`をフィルタ
- 削除操作は`UPDATE ... SET state = 'DELETED'`で実行
- 物理削除は管理画面やバッチ処理で別途実装

### [2025-01-XX] 中間テーブル (v0.2)
- MetaNote <-> Theme の関連は`meta_note_themes`テーブルで管理
- 参照整合性をDB制約で保証
- 配列型（theme_ids）は廃止

---

## Documentation Pointers

- **v0.2変更ログ**: `docs/spec/CHANGELOG_v0.2.md` - v0.1からの主要な変更点

- 仕様書（最新版の確認必須）:
  - 機能仕様: `docs/spec/learning_log_meta_note_アプリ_機能仕様（draft_v_0.md:1`
  - 技術仕様: `docs/spec/learning_log_meta_note_アプリ_技術仕様（final_v_0.md:1`
  - DB設計 (v0.2): `docs/spec/learning_log_meta_note_アプリ_db設計（draft_v_0.md:1`

- OpenAPI 定義: `docs/spec/learning_log_meta_note_アプリ_技術仕様（final_v_0.md:69`
  - **注意**: category値は'INSIGHT'/'QUESTION'/'EMOTION'に変更（v0.2）

- Pagination 実装詳細: `docs/spec/learning_log_meta_note_アプリ_技術仕様（final_v_0.md:759`

- 認証フロー図: `docs/spec/learning_log_meta_note_アプリ_技術仕様（final_v_0.md:695`

---

## Out of Scope (v0.2)

以下は意図的にスコープ外（後回し）:
- Rate Limit / Idempotency
- 監査ログ / 変更履歴（状態変更の詳細追跡）
- RLS (Row Level Security) - API 層で担保（Prisma Client Extensions）
- ARCHIVED状態の活用（UI未実装）
- E2E テスト（最小限のみ）
- CSV Export の詳細仕様（エスケープルール等）

詳細: `docs/spec/learning_log_meta_note_アプリ_技術課題・後回し一覧（v_0.md`

---

## Version History

- **2025-01-XX**: v0.2 DB設計大幅改善（State Machine、中間テーブル、PostgreSQL 17）
- **2025-01-XX**: v0.1 仕様確定、CLAUDE.md 初版作成
