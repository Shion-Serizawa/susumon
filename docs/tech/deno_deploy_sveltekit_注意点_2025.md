# Deno Deploy + SvelteKit 開発ガイド（2025年版）

最終更新: 2025-12-14

本ドキュメントは、Deno Deploy 上で SvelteKit + Svelte 5 + Prisma 7 を使用してアプリケーションを開発する際の技術情報と注意点をまとめたものです。

---

## 目次

1. [環境概要](#1-環境概要)
2. [Deno 2.0 の Node/npm 互換性](#2-deno-20-の-nodenpm-互換性)
3. [SvelteKit アダプター設定](#3-sveltekit-アダプター設定)
4. [既知の互換性問題と回避策](#4-既知の互換性問題と回避策)
5. [Svelte 5 の重要機能](#5-svelte-5-の重要機能)
6. [プロジェクトセットアップ手順](#6-プロジェクトセットアップ手順)
7. [フロントエンド開発の注意点](#7-フロントエンド開発の注意点)
8. [バックエンド開発の注意点](#8-バックエンド開発の注意点)
9. [デプロイ時の注意点](#9-デプロイ時の注意点)
10. [Prisma 使用時の追加注意点](#10-prisma-使用時の追加注意点)
11. [参考資料](#11-参考資料)

---

## 1. 環境概要

### 1.1 前提技術スタック

- **ランタイム**: Deno 2.x
- **デプロイ先**: Deno Deploy
- **フレームワーク**: SvelteKit 2.x (Svelte 5.x 対応)
- **データベース**: Deno Deploy の Prisma Postgres（自動プロビジョニング）
- **ORM**: Prisma ORM 7.x（Deno ネイティブサポート）
- **認証**: Supabase Auth (GitHub OAuth)

### 1.2 Deno 2.0 の主要機能

- **完全な Node.js/npm 互換性**: ESM 形式の npm パッケージをそのまま利用可能
- **package.json サポート**: npm workspaces、node_modules ディレクトリに対応
- **高速パッケージインストール**: `deno install` が npm より高速（cold cache で 15%、hot cache で 90% 高速）
- **長期サポート (LTS)**: 安定した本番運用が可能

---

## 2. Deno 2.0 の Node/npm 互換性

### 2.1 npm パッケージの利用

Deno 2.0 では `npm:` プレフィックスを使用して、200万以上の npm パッケージをそのまま利用できます。

```typescript
// npm パッケージのインポート例
import express from "npm:express@4";
import { Pool } from "npm:pg@8";
```

### 2.2 対応フレームワーク・ライブラリ

以下のような主要フレームワークが Deno 2.0 で動作確認されています：

- **Web フレームワーク**: Next.js, Astro, Remix, Qwik, Solid, SvelteKit
- **データベースクライアント**: mysql2, pg, pglite, duckdb, sqlite3
- **その他**: @grpc/grpc-js, @google-cloud/*, ssh2, esbuild

### 2.3 Node-API アドオン対応

Deno 2.0 は Node-API アドオンをサポートしているため、ネイティブモジュールを使う npm パッケージ（esbuild, sqlite3 など）も動作します。

### 2.4 package.json の扱い

Deno 2.0 は `package.json` を認識しますが、デフォルトでは `node_modules` ディレクトリを作成せず、グローバルキャッシュに依存関係をインストールします。

```json
// deno.json での設定例
{
  "tasks": {
    "dev": "deno task vite dev",
    "build": "deno task vite build",
    "preview": "deno task vite preview"
  },
  "imports": {
    // npm パッケージのエイリアス設定も可能
  }
}
```

**注意**: `npm run dev` を `deno task dev` に置き換えるだけで、多くの既存プロジェクトが動作します。

---

## 3. SvelteKit アダプター設定

SvelteKit を Deno Deploy で動作させるには、公式アダプター `@deno/svelte-adapter` を使用します。

Deno 公式のアダプターで、最も安定性が高く推奨されます。

**インストール**:
```bash
deno install -D npm:@deno/svelte-adapter
# または
npm install -D @deno/svelte-adapter
```

**設定** ([svelte.config.js]):
```javascript
import adapter from "@deno/svelte-adapter";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
  }
};

export default config;
```

---

## 4. 既知の互換性問題と回避策

Deno 2.0 と SvelteKit を組み合わせる際、いくつかの既知の問題が報告されています。

### 4.1 `deno compile` でのモジュール解決エラー

**問題**: SvelteKit アプリを `deno compile` でコンパイルすると、`Module not found runtime/control.js` エラーが発生する。

**影響バージョン**: Deno 2.0.0 以降

**回避策**:
- 現時点では `deno compile` の使用を避け、`deno run` で実行する
- Deno Deploy では直接デプロイするため、この問題は影響しない

**参考**: [denoland/deno#26155](https://github.com/denoland/deno/issues/26155)

### 4.2 handler.js の不整合なインポート文

**問題**: SvelteKit が生成する `handler.js` で、Node モジュールのインポートが一部 `node:` プレフィックスあり・なしが混在し、Deno 2 が "Relative import path not prefixed with / or ./ or ../" エラーを出す。

**影響バージョン**: Deno 2.x + SvelteKit 2.x

**回避策**:
- ビルド後に `handler.js` を手動修正（非推奨：メンテナンス性が悪い）
- 公式アダプター `@deno/svelte-adapter` を使用すると、この問題が回避される可能性が高い
- SvelteKit 側の修正を待つ（トラッキング: [sveltejs/kit#12783](https://github.com/sveltejs/kit/issues/12783)）

### 4.3 Deno 2.3.7 でのビルド失敗

**問題**: Deno 2.3.0 で動作していたアプリが、2.3.7 にアップグレード後にビルドエラー（"Module not found" for server nodes）が発生。

**影響バージョン**: Deno 2.3.7

**回避策**:
- Deno 2.3.0 に戻す、または最新の安定版（2.4.x以降）を試す
- 問題が解決されるまで Deno のバージョンを固定する

**参考**: [denoland/deno#29945](https://github.com/denoland/deno/issues/29945)

### 4.4 SvelteKit 生成型ファイル（$types）の解決失敗

**問題**: SvelteKit が生成する型ファイル（`./$types` など）を Deno が見つけられない。

**影響**: TypeScript 型チェックが動作しない

**回避策**:
- `deno.json` に `compilerOptions` を追加し、paths マッピングを設定
- SvelteKit の生成型ディレクトリ（`.svelte-kit/types`）を明示的に指定

```json
// deno.json
{
  "compilerOptions": {
    "paths": {
      "$lib/*": ["./src/lib/*"],
      "$app/*": ["./.svelte-kit/types/app.d.ts"]
    }
  }
}
```

**参考**: [denoland/deno#28599](https://github.com/denoland/deno/issues/28599)

### 4.5 HTTPS インポートの非対応

**問題**: Deno スタイルの HTTPS インポートを SvelteKit/Vite で使用すると、"Only file and data URLs are supported by the default ESM loader" エラーが発生。

**回避策**:
- SvelteKit/Vite プロジェクトでは、HTTPS インポートを使わず、`npm:` プレフィックスまたは `package.json` 経由でパッケージを管理
- どうしても必要な場合は、Vite プラグインでカスタムローダーを実装

**注意**: Deno Deploy 上では HTTPS インポートが使えますが、SvelteKit のビルドプロセス（Vite）では非対応です。

---

## 5. Svelte 5 の重要機能

本プロジェクトでは Svelte 5 を使用します。Svelte 5 は新しい Runes システムにより、より直感的で堅牢なリアクティビティを実現しています。

### 5.1 Runes（リアクティビティシステム）

Svelte 5 の Runes は、明示的で予測可能なリアクティビティを提供します。

```svelte
<script lang="ts">
  // リアクティブな状態
  let count = $state(0);

  // 派生値（自動的に再計算）
  let doubled = $derived(count * 2);

  // 副作用（自動的に再実行）
  $effect(() => {
    console.log(`Count is now: ${count}`);
  });
</script>
```

**主要 Runes**:
- `$state()`: リアクティブな状態
- `$derived()`: 派生値（computed values）
- `$effect()`: 副作用（side effects）
- `$props()`: コンポーネントのプロパティ

**メリット**:
- 依存関係の自動追跡が正確
- リファクタリング時に壊れにくい
- 手動での順序調整が不要

### 5.2 イベントハンドラ

Svelte 5 では、イベントハンドラは標準の DOM プロパティ形式で記述します。

```svelte
<button onclick={handleClick}>Click</button>
<input onchange={handleChange} />
<form onsubmit={handleSubmit}>...</form>
```

- `on:` ディレクティブではなく、`onclick`, `onchange` などを使用
- より標準的な HTML に近い記法

### 5.3 コンポーネントプロパティ

プロパティは `$props()` を使用して受け取ります。

```svelte
<script lang="ts">
  let { name, age = 0 }: { name: string; age?: number } = $props();
</script>

<p>{name} is {age} years old</p>
```

- 型安全なプロパティ定義
- デフォルト値の設定が簡潔

### 5.4 コンポーネント型

TypeScript でコンポーネント型を使用する場合：

```typescript
import { Component } from "svelte";

type MyComponentType = Component<{ name: string; age?: number }>;
```

### 5.5 CSS のスコープ

Svelte 5 では、スコープ付き CSS のセレクタが `:where(.svelte-xyz123)` 形式になっています。これにより、グローバルスタイルでの上書きが容易になります。

---

## 6. プロジェクトセットアップ手順

以下は、Deno Deploy + SvelteKit + Svelte 5 プロジェクトのセットアップ手順です。

### 6.1 プロジェクトの初期化

```bash
# SvelteKit プロジェクトを作成（npm 経由）
npx sv create my-sveltekit-app
cd my-sveltekit-app

# package.json を deno.json に変換
# - "scripts" → "tasks"
# - npm コマンドに "npm:" プレフィックスを追加
```

**deno.json の例**:
```json
{
  "tasks": {
    "dev": "npm:vite dev",
    "build": "npm:vite build",
    "preview": "npm:vite preview"
  },
  "compilerOptions": {
    "lib": ["deno.window"],
    "paths": {
      "$lib/*": ["./src/lib/*"]
    }
  }
}
```

### 6.2 Deno アダプターのインストール

```bash
deno install -D npm:@deno/svelte-adapter
```

### 6.3 svelte.config.js の設定

```javascript
import adapter from "@deno/svelte-adapter";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter()
  }
};

export default config;
```

### 6.4 開発サーバーの起動

```bash
deno task dev
```

### 6.5 ビルド

```bash
deno task build
```

### 6.6 ローカルでのプレビュー

```bash
# ビルド成果物を Deno で実行
deno run --allow-net --allow-read --allow-env build/index.js
```

---

## 7. フロントエンド開発の注意点

### 7.1 Svelte 5 の Runes を積極的に活用

- Svelte 5 の新しいリアクティビティシステム（Runes）は、依存関係の追跡がより正確で、リファクタリングに強い
- `$state()`, `$derived()`, `$effect()` を理解し、適切に使い分ける

### 7.2 型安全性の確保

SvelteKit は TypeScript をサポートしており、Deno も TypeScript ネイティブです。

**推奨**:
- `src/app.d.ts` で型定義を拡張
- `$lib` 配下のユーティリティは型付きで実装
- API レスポンスの型を厳密に定義（後述の OpenAPI との連携を推奨）

### 7.3 環境変数の扱い

**Vite の環境変数**:
- `VITE_` プレフィックスをつけた環境変数のみがフロントエンドに公開される
- 秘密情報（API キーなど）は `VITE_` プレフィックスをつけない

**Deno Deploy での環境変数**:
- Deno Deploy のダッシュボードで環境変数を設定
- サーバーサイドコードでは `Deno.env.get("VAR_NAME")` で取得

### 7.4 Supabase Auth との統合

本プロジェクトでは Supabase Auth（GitHub OAuth）を使用します。

**注意点**:
- コールバック URL を Deno Deploy のドメインに設定
- セッション管理は cookie ベースを推奨（CSR/SSR 両対応）
- `@supabase/supabase-js` を `npm:` プレフィックス経由でインポート

```typescript
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);
```

### 7.5 日付・時刻の扱い

仕様書によれば、UI 日付は JST ローカル日付として扱います。

**推奨ライブラリ**:
- `date-fns` または `day.js`（軽量）
- `npm:date-fns@3` または `npm:dayjs@1`

**注意**:
- DB の `date` 型は JST のローカル日付（タイムゾーン変換不要）
- `created_at`/`updated_at` は `timestamptz`（UTC）

```typescript
import { format, parseISO } from "npm:date-fns@3";

// JST ローカル日付の表示
const displayDate = format(parseISO(dateString), "yyyy-MM-dd");
```

---

## 8. バックエンド開発の注意点

### 8.1 データベース接続（Prisma Postgres 使用）

本プロジェクトでは **Deno Deploy の Prisma Postgres** を使用します。

#### Prisma のセットアップ

**1. Prisma のインストール**:
```bash
deno install npm:@prisma/client
deno install npm:@prisma/adapter-pg
deno install -D npm:prisma
```

**2. Prisma スキーマの設定** (`prisma/schema.prisma`):
```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
  runtime  = "deno"  // Deno ランタイムを明示
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model themes {
  id           String   @id @default(uuid())
  user_id      String
  name         String
  short_name   String?
  goal         String
  is_completed Boolean  @default(false)
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt
  deleted_at   DateTime?

  logs learning_log_entries[]

  @@index([user_id, is_completed], name: "idx_themes_user_completed")
}

model learning_log_entries {
  id         String    @id @default(uuid())
  user_id    String
  theme_id   String
  date       DateTime  @db.Date
  summary    String
  details    String?
  tags       String[]  @default([])
  created_at DateTime  @default(now())
  updated_at DateTime  @updatedAt
  deleted_at DateTime?

  theme      themes      @relation(fields: [theme_id], references: [id], onDelete: Cascade)
  meta_notes meta_notes[]

  @@unique([user_id, theme_id, date], name: "uq_log_per_day")
  @@index([user_id, date], name: "idx_logs_user_date")
  @@index([user_id, theme_id, date], name: "idx_logs_user_theme_date")
}

model meta_notes {
  id              String    @id @default(uuid())
  user_id         String
  category        String
  body            String
  theme_ids       String[]  @default([])
  related_log_id  String?
  note_date       DateTime  @db.Date
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  deleted_at      DateTime?

  related_log learning_log_entries? @relation(fields: [related_log_id], references: [id], onDelete: SetNull)

  @@index([user_id, note_date], name: "idx_notes_user_date")
  @@index([user_id, category, note_date], name: "idx_notes_user_category_date")
}
```

**注意**:
- Prisma では UUID v7 の自動生成がサポートされていないため、アプリケーション側で生成して渡す必要があります
- `@default(uuid())` は UUID v4 を生成します。UUID v7 を使用する場合は、アプリ側で生成してください

**3. Prisma Client の使用例**:
```typescript
import { PrismaClient } from "../generated/prisma/index.ts";

const prisma = new PrismaClient();

// テーマの取得
const themes = await prisma.themes.findMany({
  where: {
    user_id: userId,
    is_completed: false,
  },
  orderBy: {
    created_at: "desc",
  },
});

// ログの作成（UUID v7 を使用）
import { uuidv7 } from "npm:uuidv7@1";

const log = await prisma.learning_log_entries.create({
  data: {
    id: uuidv7(),
    user_id: userId,
    theme_id: themeId,
    date: new Date(dateString),
    summary: "今日の学習内容",
    details: "詳細な説明...",
  },
});
```

#### Deno Deploy での自動プロビジョニング

Deno Deploy は Prisma Postgres データベースを自動的にプロビジョニングします。

**主な機能**:
- **環境ごとの自動 DB 作成**: 本番、Git ブランチ、プレビュー環境で個別のデータベースが自動作成される
- **環境変数の自動注入**: `DATABASE_URL` と `PRISMA_ACCELERATE_URL` が自動的に設定される
- **自動マイグレーション**: ビルド後に指定したマイグレーションコマンドが自動実行される

**マイグレーション設定例**:
```json
// deno.json
{
  "tasks": {
    "dev": "npm:vite dev",
    "build": "npm:vite build && deno task db:migrate",
    "db:migrate": "prisma migrate deploy",
    "db:generate": "prisma generate",
    "db:push": "prisma db push"
  }
}
```

**代替案: 生 SQL を使用する場合**

Prisma ORM を使わず、生 SQL で開発したい場合は以下のライブラリも選択可能です：

- `npm:postgres@3`（汎用 PostgreSQL クライアント、Deno Deploy 対応）
- `npm:@neondatabase/serverless`（Neon Postgres 使用時のみ）

```typescript
import postgres from "npm:postgres@3";

const sql = postgres(Deno.env.get("DATABASE_URL")!);
const result = await sql`SELECT * FROM themes WHERE user_id = ${userId}`;
```

### 8.2 認証とユーザースコープ

仕様書の通り、すべての API は `user_id` でスコープ制限を行います。

**実装例**:
```typescript
// +server.ts (SvelteKit API route)
import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { getUser } from "$lib/auth"; // Supabase セッションから user_id を取得

export const GET: RequestHandler = async ({ request }) => {
  const user = await getUser(request);
  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const themes = await sql`
    SELECT * FROM themes WHERE user_id = ${user.id} AND is_completed = false
  `;

  return json({ themes });
};
```

### 8.3 UUID v7 の生成

仕様書では、主キーに UUID v7 を使用します（アプリ側で生成）。

**推奨ライブラリ**:
- `npm:uuidv7@1`

```typescript
import { uuidv7 } from "npm:uuidv7@1";

const themeId = uuidv7(); // UUID v7 を生成
```

### 8.4 エラーハンドリング

**推奨**:
- 4xx エラー: クライアント側の問題（バリデーションエラー、認証エラーなど）
- 5xx エラー: サーバー側の問題（DB 接続エラーなど）

```typescript
try {
  const result = await sql`INSERT INTO themes ...`;
  return json({ result }, { status: 201 });
} catch (error) {
  console.error("DB error:", error);
  return json({ error: "Internal server error" }, { status: 500 });
}
```

### 8.5 パフォーマンス最適化

**インデックスの活用**:
- 仕様書の DDL に記載されたインデックスを適切に設定
- `idx_themes_user_completed`, `idx_logs_user_date` など

**N+1 問題の回避**:
- 必要なデータを1回のクエリで取得
- `JOIN` や `IN` 句を活用

```typescript
// Good: 1回のクエリ
const themes = await sql`
  SELECT t.*, COUNT(l.id) as log_count
  FROM themes t
  LEFT JOIN learning_log_entries l ON t.id = l.theme_id
  WHERE t.user_id = ${userId}
  GROUP BY t.id
`;

// Bad: N+1
const themes = await sql`SELECT * FROM themes WHERE user_id = ${userId}`;
for (const theme of themes) {
  const logs = await sql`SELECT * FROM learning_log_entries WHERE theme_id = ${theme.id}`;
}
```

### 8.6 トランザクション管理

複数テーブルへの操作は、トランザクションで保護します。

```typescript
import postgres from "npm:postgres@3";

const sql = postgres(Deno.env.get("DATABASE_URL")!);

await sql.begin(async (tx) => {
  const [theme] = await tx`
    INSERT INTO themes (id, user_id, name, goal) VALUES (${themeId}, ${userId}, ${name}, ${goal})
    RETURNING *
  `;

  await tx`
    INSERT INTO learning_log_entries (id, user_id, theme_id, date, summary)
    VALUES (${logId}, ${userId}, ${themeId}, ${date}, ${summary})
  `;
});
```

---

## 9. デプロイ時の注意点

### 9.1 GitHub 連携

Deno Deploy は GitHub リポジトリと直接連携できます。

**手順**:
1. Deno Deploy ダッシュボードで新規プロジェクト作成
2. GitHub リポジトリを接続
3. ビルドコマンドとエントリーポイントを指定

**例**:
- **ビルドコマンド**: `deno task build`
- **エントリーポイント**: `build/index.js`（アダプターが生成）

### 9.2 環境変数の設定

Deno Deploy のダッシュボードで以下を設定：

- `DATABASE_URL`: Prisma Postgres の接続文字列（自動プロビジョニング時は自動設定）
- `PRISMA_ACCELERATE_URL`: Prisma Accelerate URL（自動プロビジョニング時は自動設定）
- `SUPABASE_URL`: Supabase プロジェクト URL
- `SUPABASE_ANON_KEY`: Supabase の匿名キー
- その他アプリ固有の環境変数

**注意**:
- 本番環境と開発環境で異なる値を設定
- secret 情報は絶対にコミットしない

### 9.3 プレビュー環境

Deno Deploy は、プルリクエストごとにプレビュー環境を自動生成できます。

**推奨設定**:
- プレビュー環境用の DB を別途用意（本番データを壊さないため）
- プレビュー環境の環境変数を分離

### 9.4 カスタムドメイン

Deno Deploy はカスタムドメインをサポートしています。

**手順**:
1. Deno Deploy ダッシュボードで「Domains」を選択
2. カスタムドメインを追加
3. DNS レコードを設定（CNAME または A レコード）

**HTTPS**:
- Deno Deploy は自動的に Let's Encrypt 証明書を発行

---

## 10. Prisma 使用時の追加注意点

### 10.1 Prisma 7 の主要変更点（2025年）

Prisma 7 では Rust エンジンが廃止され、完全に JavaScript/TypeScript で実装されました。

**主なメリット**:
- Deno サポートがシンプルになり、アダプターやカスタムビルドが不要に
- クライアントランタイムが高速化
- バンドルサイズの削減

### 10.2 Prisma の `runtime = "deno"` 設定

schema.prisma に必ず `runtime = "deno"` を設定してください。これがないと、生成されたクライアントが Node.js 向けになり、Deno で動作しません。

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
  runtime  = "deno"  // 必須
}
```

### 10.3 UUID v7 のサポート

Prisma は現時点で UUID v7 をネイティブサポートしていません。

**対処法**:
1. アプリケーション側で `uuidv7()` を生成
2. `create()` や `createMany()` の `data` に明示的に `id` を指定

```typescript
import { uuidv7 } from "npm:uuidv7@1";

const theme = await prisma.themes.create({
  data: {
    id: uuidv7(), // アプリ側で生成
    user_id: userId,
    name: "新しいテーマ",
    goal: "目標",
  },
});
```

### 10.4 配列型フィールド（tags, theme_ids）

PostgreSQL の配列型は Prisma で `String[]` として定義できます。

```prisma
model learning_log_entries {
  tags String[] @default([])
  // ...
}

model meta_notes {
  theme_ids String[] @default([])
  // ...
}
```

**使用例**:
```typescript
// タグの追加
await prisma.learning_log_entries.update({
  where: { id: logId },
  data: {
    tags: {
      push: "新しいタグ",
    },
  },
});

// 配列全体を設定
await prisma.meta_notes.create({
  data: {
    // ...
    theme_ids: [themeId1, themeId2],
  },
});
```

### 10.5 日付型の扱い

Prisma では `DateTime` 型に `@db.Date` 属性をつけることで、PostgreSQL の `DATE` 型にマッピングできます。

```prisma
model learning_log_entries {
  date DateTime @db.Date
  // ...
}
```

**注意**:
- JavaScript の `Date` オブジェクトを渡す際、時刻部分は無視される
- JST ローカル日付として扱う場合、タイムゾーン変換に注意

```typescript
// JST の日付文字列から Date オブジェクトを作成
const dateStr = "2025-12-13"; // YYYY-MM-DD
const date = new Date(dateStr + "T00:00:00.000Z");

await prisma.learning_log_entries.create({
  data: {
    date: date,
    // ...
  },
});
```

### 10.6 Prisma Migrate のワークフロー

**開発環境**:
```bash
# マイグレーションファイルを作成して適用
deno task prisma migrate dev --name add_new_feature

# スキーマ変更後にクライアントを再生成
deno task prisma generate
```

**本番環境（Deno Deploy）**:
```bash
# デプロイ時に自動実行されるコマンド
deno task prisma migrate deploy
```

**注意**:
- `migrate dev` は開発環境でのみ使用（DB をリセットする可能性がある）
- `migrate deploy` は本番環境で使用（適用済みマイグレーションのみ実行）

### 10.7 Prisma Studio（GUI）

Prisma Studio を使うと、ブラウザで DB の内容を確認・編集できます。

```bash
deno task prisma studio
```

**注意**: 本番環境の DB に対しては使用しないでください（データ破損のリスク）。

### 10.8 トランザクション

Prisma は複数の操作をトランザクションでまとめることができます。

**インタラクティブトランザクション**:
```typescript
await prisma.$transaction(async (tx) => {
  const theme = await tx.themes.create({
    data: {
      id: uuidv7(),
      user_id: userId,
      name: "新テーマ",
      goal: "目標",
    },
  });

  await tx.learning_log_entries.create({
    data: {
      id: uuidv7(),
      user_id: userId,
      theme_id: theme.id,
      date: new Date(),
      summary: "初日のログ",
    },
  });
});
```

**バッチトランザクション**:
```typescript
await prisma.$transaction([
  prisma.themes.update({ where: { id: themeId }, data: { is_completed: true } }),
  prisma.learning_log_entries.deleteMany({ where: { theme_id: themeId } }),
]);
```

### 10.9 N+1 問題の回避

Prisma の `include` や `select` を使って、リレーションデータを効率的に取得します。

**Bad（N+1 問題発生）**:
```typescript
const themes = await prisma.themes.findMany({ where: { user_id: userId } });
for (const theme of themes) {
  const logs = await prisma.learning_log_entries.findMany({ where: { theme_id: theme.id } });
  console.log(logs);
}
```

**Good（1回のクエリで取得）**:
```typescript
const themes = await prisma.themes.findMany({
  where: { user_id: userId },
  include: {
    logs: true,
  },
});
```

### 10.10 Prisma Client の初期化（シングルトンパターン）

Prisma Client は接続プールを管理するため、アプリケーション全体で1つのインスタンスを共有すべきです。

```typescript
// lib/prisma.ts
import { PrismaClient } from "../generated/prisma/index.ts";

let prisma: PrismaClient;

if (Deno.env.get("DENO_DEPLOYMENT_ID")) {
  // 本番環境（Deno Deploy）
  prisma = new PrismaClient();
} else {
  // 開発環境（ホットリロード対応）
  if (!globalThis.__prisma) {
    globalThis.__prisma = new PrismaClient();
  }
  prisma = globalThis.__prisma;
}

export default prisma;
```

### 10.11 Prisma と生 SQL の併用

複雑なクエリは `$queryRaw` で生 SQL を実行できます。

```typescript
import prisma from "$lib/prisma";

const result = await prisma.$queryRaw`
  SELECT t.*, COUNT(l.id) as log_count
  FROM themes t
  LEFT JOIN learning_log_entries l ON t.id = l.theme_id
  WHERE t.user_id = ${userId}
  GROUP BY t.id
`;
```

**注意**: SQL インジェクション対策のため、必ずタグ付きテンプレート（`` $queryRaw` `` ）を使用してください。

---

## 11. 参考資料

### 公式ドキュメント

- [Build a SvelteKit App - Deno Docs](https://docs.deno.com/examples/svelte_tutorial/)
- [Building a SvelteKit app with sv and Deno](https://docs.deno.com/examples/sveltekit_tutorial/)
- [Deno 2 Announcement](https://deno.com/blog/v2.0)
- [Node and npm Compatibility - Deno](https://docs.deno.com/runtime/fundamentals/node/)
- [Svelte 5 Documentation](https://svelte.dev/docs/svelte)
- [SvelteKit Documentation](https://kit.svelte.dev/docs)

### アダプター

- [@deno/svelte-adapter - GitHub](https://github.com/denoland/svelte-adapter) (公式)
- [@deno/svelte-adapter - npm](https://www.npmjs.com/package/@deno/svelte-adapter)

### Prisma 関連ドキュメント

- [Deploy to Deno Deploy - Prisma Documentation](https://www.prisma.io/docs/orm/prisma-client/deployment/edge/deploy-to-deno-deploy)
- [Connect to Prisma Postgres - Deno Docs](https://docs.deno.com/deploy/classic/prisma-postgres/)
- [Prisma Postgres - Deno Deploy Reference](https://docs.deno.com/deploy/reference/prisma_postgres/)
- [How to create a RESTful API with Prisma and Oak](https://docs.deno.com/examples/prisma_tutorial/)
- [Prisma 6.8.0 Release: Native Deno Support](https://www.prisma.io/blog/prisma-6-8-0-release)
- [Prisma 7 Release: Rust-Free, Faster, and More Compatible](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0)
- [Persist Data in Deno with npm using Prisma](https://deno.com/blog/persistent-data-npm)

### 既知の問題（GitHub Issues）

- [Deno 2 compile doesn't work on sveltekit - denoland/deno#26155](https://github.com/denoland/deno/issues/26155)
- [Unable to run SvelteKit apps using Deno 2 - sveltejs/kit#12783](https://github.com/sveltejs/kit/issues/12783)
- [SvelteKit app breaks on build with deno - denoland/deno#29945](https://github.com/denoland/deno/issues/29945)
- [SvelteKit and generated types - denoland/deno#28599](https://github.com/denoland/deno/issues/28599)
- [Prisma Deno support preview feature - prisma/prisma#15844](https://github.com/prisma/prisma/issues/15844)


---

## 12. まとめ

Deno Deploy + SvelteKit + Prisma Postgres の組み合わせは、2025年時点で実用レベルに達しており、特に Prisma 7 の Deno ネイティブサポートにより、開発体験が大幅に向上しています。

**重要なポイント**:

### 必須設定
1. **公式アダプター `@deno/svelte-adapter` を使用する**
2. **Prisma スキーマに `runtime = "deno"` を明記する**
3. **UUID v7 をアプリ側で生成する（`npm:uuidv7`）**

### フロントエンド
4. **Svelte 5 の Runes を理解し、適切に活用する**
5. **イベントハンドラは `onclick` 形式で記述**
6. **型安全性を確保（TypeScript の活用）**

### バックエンド
7. **Prisma ORM で型安全な DB アクセスを実現**
8. **N+1 問題を回避（`include` や `select` の活用）**
9. **トランザクションで複数操作をアトミックに実行**
10. **認証・ユーザースコープを API 層で確実に実装**

### インフラ・デプロイ
11. **Deno Deploy の自動プロビジョニング機能を活用**
12. **環境ごとに DB が自動分離される（本番・ブランチ・プレビュー）**
13. **自動マイグレーション機能でスキーマを同期**
14. **環境変数は Deno Deploy ダッシュボードで管理し、コミットしない**

### 既知の問題への対処
15. **既知の問題（handler.js のインポート、deno compile など）を認識し、回避策を講じる**
16. **Deno のバージョンを固定し、予期しない動作を防ぐ**

本ドキュメントは、プロジェクトの進行に応じて随時更新してください。
