# Repo Readiness Audit（開発開始前チェック）

最終更新: 2025-12-14  
対象: `susumon/`（静的レビュー + 一部コマンド実行で検証。外部サービス接続は未実施）

このドキュメントは「今のリポジトリの状態で、環境構築から開発開始までスムーズに進められるか」「ドキュメント/コードの矛盾がないか」を随時追記していくメモです。

---

## 結論（現状のざっくり判定）

- **UIだけ触り始める（SvelteKitの画面を編集する）**: できる可能性が高い（`src/routes/+page.svelte` はテンプレ状態）
- **DB/Prisma を使った API 開発を始める**: まだ詰まりやすい（Prisma 設定・タスク・マイグレーション導線に矛盾/不足がある）
- **Supabase Auth を前提にした実装を始める**: 未実装が多い（`hooks.server.ts` が TODO/暫定動作）

---

## 重大（早めに潰さないと詰まる/危ない）

### 1) Prisma（Deno 対応）の前提が docs と実装で食い違い

- ✅ `prisma/schema.prisma` の generator に `runtime = "deno"` が設定済み  
  - 参照: `prisma/schema.prisma:8`
- `docs/tech/deno_deploy_sveltekit_注意点_2025.md` でも `runtime = "deno"` 必須を明記している  
  - 参照: `docs/tech/deno_deploy_sveltekit_注意点_2025.md:739`
- ✅ `meta_notes.category` は Prisma enum + DB enum で制約を実装済み（migration 適用後に DB 制約として有効）  
  - 参照: `prisma/schema.prisma:16`
- ✅ Prisma Client の出力先が `../generated/prisma`（= リポジトリにコミットしない想定）なので、`deno task dev` / `deno task build` の前段で `db:generate` を必須化済み  
  - 参照: `prisma/schema.prisma:7`、`deno.json:3`
- ✅ Prisma 7.1+ で schema の `datasource.url`（`env("DATABASE_URL")` 含む）が禁止になったため、DB URL は `prisma.config.ts` 側に移動済み（`DATABASE_URL` を読む）  
  - 参照: `prisma.config.ts:1`
- ⚠️ `.env` が無い状態だと `deno task db:generate` / `deno task db:migrate:*` が失敗しうる（`--env-file=.env` 前提）  
  - 参照: `deno.json:12`

影響:
- Prisma（Deno runtime）は成立したが、**`.env` とマイグレーション導線（初回 `migrate dev`）**が整っていないと、最初の生成/適用で詰まりやすい。

### 2) `deno task` から Prisma CLI を叩く前提が曖昧（PATH 依存）

- ✅ Prisma CLI は `deno run npm:prisma@...` 経由で実行するように統一（`prisma` が PATH に無くても動く）  
  - 参照: `deno.json:12`
- ✅ `docs/setup/DEVELOPMENT_SETUP.md` から Prisma のグローバルインストール前提を撤去  
  - 参照: `docs/setup/DEVELOPMENT_SETUP.md:1`

影響:
- PATH 依存は解消したが、初回は npm 互換の依存ダウンロードが走るため、ネットワーク制限環境では詰まりポイントになり得る。

### 3) ドキュメントが参照するタスクが `deno.json` に存在しない

- ✅ `deno.json` に `db:reset` と `db:migrate:status` を追加済み  
  - 参照: `deno.json:15`、`deno.json:16`

影響:
- セットアップ/トラブルシュート手順をそのままなぞるとコマンドが存在せず詰まる。

### 4) `hooks.server.ts` の認証が未実装で、暫定挙動が「認証済み扱い」を起こしうる

- ✅ Supabase Auth 実装が入るまで、`USE_MOCK_AUTH=false` 時は常に「未認証扱い」に固定（危険なフォールバック削除）  
  - 参照: `src/hooks.server.ts:32`
- cookie 名も暫定で `sb-access-token` を参照している  
  - 参照: `src/hooks.server.ts:24`
- `CLAUDE.md` はクライアント側の状態確認として `/api/auth/session` を前提にしているが、現状 `src/routes/api/` 自体が未作成で、該当エンドポイントも未実装  
  - 参照: `CLAUDE.md:171`
- `docs/setup/DEVELOPMENT_SETUP.md` は `/login` 画面で OAuth を試す手順を記載しているが、現状そのルーティング構造はまだ存在しない  
  - 参照: `docs/setup/DEVELOPMENT_SETUP.md:233`

影響:
- 認証まわりの検証/設計が固まっていない状態で API を実装すると、後で大きく作り直しになりやすい。
- 本番での「誤ってログイン扱い」リスクがあるので、デプロイ前チェック（`USE_MOCK_AUTH` の扱い含む）を厳密化する必要がある。

### 5) TypeScript 型（`locals.user`）の宣言が未整備

- ✅ `src/app.d.ts` に `App.Locals.user` を追加済み  
  - 参照: `src/app.d.ts:6`

影響:
- `event.locals.user` を使う API 実装を始めると、型エラー/型無し状態のどちらかになりがち。

---

## 矛盾/ズレ（早めに整理したい）

### 0) Prisma の命名（camelCase 前提）と現スキーマがズレている

- ✅ Prisma schema を「PascalCase モデル + camelCase フィールド（DB は snake_case に `@map`）」へ変更済み  
  - 参照: `prisma/schema.prisma:18`

影響:
- 今後 API 実装やサンプルコードをコピペすると、Prisma Client のモデル/フィールド名が一致せず混乱しやすい。

### 1) アダプタ表記が混在

- `svelte.config.js` は `@deno/svelte-adapter` を使用  
  - 参照: `svelte.config.js:1`
- ✅ `CLAUDE.md` 側も `@deno/svelte-adapter` に統一済み  
  - 参照: `CLAUDE.md:166`

### 2) Tailwind の扱いが docs と設定で矛盾

- ✅ 現状は Tailwind 有効（`vite.config.ts` の Tailwind プラグイン + `src/routes/layout.css` の `@import 'tailwindcss';`）  
  - 参照: `src/routes/layout.css:1`

### 3) DB 方針の整理

- ✅ DB 方針は Deno Deploy Prisma Postgres（確定）  
  - 参照: `CLAUDE.md:11`、`prisma/schema.prisma:3`

### 3) Deno バージョン要件がドキュメント内で矛盾

- `docs/setup/DEVELOPMENT_SETUP.md` の前提条件は Deno v2.60+  
  - 参照: `docs/setup/DEVELOPMENT_SETUP.md:9`
- ✅ 同文書内の Deno 要件を v2.60+ に統一済み  
  - 参照: `docs/setup/DEVELOPMENT_SETUP.md:28`

### 4) README がテンプレのまま

- ✅ `README.md` をプロジェクト内容に更新済み  
  - 参照: `README.md:1`

---

## 現状「未着手/雛形」っぽい箇所（期待される構造との差分）

- ルーティング構造が仕様/ドキュメントの想定（`src/routes/(app)/`, `src/routes/api/` 等）に未到達  
  - 現状 `src/routes` は `+page.svelte` など最低限のみ
- DB の `prisma/migrations/` が存在しない（少なくともこの作業ツリーでは未作成）
- ✅ Phase 0 のユーティリティ（`db.ts`, `uuid.ts`, `date.ts`）は追加済み  
  - 参照: `src/lib/server/db.ts:1`、`src/lib/server/uuid.ts:1`、`src/lib/utils/date.ts:1`

---

## 実行系（ツールチェーン）まわりの注意

- ✅ `deno.json` の `vite` / `vitest` / `prisma` は `deno run npm:<pkg>@<major>` 経由で実行するように統一済み（グローバル Node / バイナリ依存を避ける）  
  - 参照: `deno.json:2`
- ⚠️ 初回は npm 互換の依存ダウンロードが走るため、ネットワーク制限環境では詰まりポイントになり得る
- `package.json` の scripts も同様に存在し、**deno と npm の二重導線**になっている  
  - 参照: `package.json:6`
- `.npmrc` に `engine-strict=true` があるので、npm を使う場合は Node バージョン差で詰まる可能性がある（特に Windows 開発）  
  - 参照: `.npmrc:1`
- `Makefile` は POSIX シェル前提のコマンド（`if [ ... ]`, `cp`, `sleep`, `read -p`, `rm -rf`）を含む  
  - 参照: `Makefile:33`、`Makefile:35`、`Makefile:43`、`Makefile:72`、`Makefile:109`  
  - Windows でそのまま `make setup` を叩くと環境によっては動かない（Git Bash / WSL の前提整理が必要）
- E2E は v0.1 では未導入
- ✅ `Makefile` 相当の操作は `deno task setup`, `deno task db:up`, `deno task db:down`, `deno task clean` などに寄せた  
  - 参照: `deno.json:1`, `scripts/setup.ts:1`, `scripts/clean.ts:1`

---

## 最新情報チェック（Deno / JSR）

- Deno の推奨は「HTTP import より `jsr:` / `npm:` を使う」方向（Std は JSR 側に移行しつつある）
- このリポジトリは現状 Deno Std をほぼ使っていないため、今すぐの置換は不要（今後入れるなら `deno add jsr:@std/...@^1` を採用）
- SvelteKit / Prisma などは npm エコシステムなので、`deno run npm:<pkg>@<major>` 方針で問題ない

---

## メモ（追記ログ）

### 2025-12-14

- リポジトリの全体構造を確認し、セットアップ文書・タスク・Prisma/認証まわりの矛盾点を一次抽出。
- 明確に直せるズレを修正（`deno task` への導線統一、`scripts/setup.ts` / `scripts/clean.ts` 追加、`@deno/svelte-adapter` のバージョン修正、Prisma 命名の整理、`MetaNoteCategory` の enum 化、Prisma 7.1+ 対応の `prisma.config.ts` 追加、`src/app.d.ts` の `Locals` 追加、`hooks.server.ts` の危険なフォールバック削除、`docs/setup/DEVELOPMENT_SETUP.md` 更新、`README.md` 更新）。

---

## 次にやること（提案：まず「決める/確認する」）

- **実行導線の動作確認**: `.env` を用意 → `deno task db:generate` / `deno task build` / `deno task test:unit` が通るか（初回の依存DL含む）
- **ローカルDB導線の確定**: `docker compose up -d postgres` → `deno task db:migrate:dev` で `prisma/migrations/` が生成されるか
- **認証の段階方針**: モック継続の間も「本番で絶対にモックへフォールバックしない」条件を明文化（`hooks.server.ts` の暫定挙動が危険域）
- **ルーティング構造の着手タイミング**: `src/routes/(app)/` と `src/routes/api/` をいつ作るか（Phase 1 の最初に寄せる）
