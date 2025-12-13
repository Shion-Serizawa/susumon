# Learning Log / Meta Note アプリ - 開発準備まとめ

このドキュメントは、Claude Code を活用したフルスタック開発のために準備した設定・ドキュメントの全体像をまとめたものです。

---

## 📋 準備完了項目

### 1. **CLAUDE.md（プロジェクトメモリ）**

**場所**: `CLAUDE.md`（プロジェクトルート）

**内容**:
- プロジェクトの目的・アーキテクチャ
- ディレクトリ構造
- コーディング規約（150ルール以内に厳選）
- 重要な仕様書へのポインタ
- よく使うコマンド
- 重要な制約・ゴッチャ

**ベストプラクティス**:
- ✅ 簡潔（150指示以内）
- ✅ ポインタ優先（`file:line`形式）
- ✅ コードスニペットは最小限
- ✅ 時代遅れの情報は削除

---

### 2. **MCP サーバー設定**

**ドキュメント**: `docs/setup/MCP_SETUP.md`

**推奨サーバー**:

| サーバー | 用途 | 優先度 |
|---------|------|--------|
| **GitHub** | PR・Issue・CI/CD 管理 | 必須 |
| **Context7** | 最新ドキュメント検索 | 推奨 |
| **Serena** | セマンティックなコード編集 | 推奨 |
| **Playwright** | E2E テスト | 推奨 |


詳細: `docs/setup/MCP_SETUP.md`

---

### 3. **カスタム Skills**

**場所**: `.claude/skills/`

**作成した Skills**:

#### 3.1 `api-endpoint-builder`
- **用途**: SvelteKit API エンドポイント（+server.ts）の作成
- **自動起動条件**: "API route", "+server.ts", "create endpoint" 等
- **主な機能**:
  - OpenAPI 仕様に準拠したエンドポイント生成
  - 認証チェック・user_id スコープ制限の自動挿入
  - Pagination（cursor 方式）のテンプレート
  - エラーハンドリングのベストプラクティス

#### 3.2 `prisma-schema-manager`
- **用途**: Prisma スキーマ・マイグレーション管理
- **自動起動条件**: "migration", "Prisma model", "database table" 等
- **主な機能**:
  - DB設計仕様に基づくスキーマ生成
  - マイグレーション手順の提示
  - CHECK 制約・GIN インデックスの手動追加ガイド

#### 3.3 `sveltekit-component-builder`
- **用途**: Svelte コンポーネント・ページの作成
- **自動起動条件**: "component", ".svelte file", "page" 等
- **主な機能**:
  - Page/Component/Layout のテンプレート
  - TypeScript 型安全なコンポーネント構造
  - Form Actions との連携パターン
  - アクセシビリティ対応のガイド

---

### 4. **スラッシュコマンド**

**場所**: `.claude/commands/`

**作成したコマンド**:

| コマンド | 用途 | 使用例 |
|---------|------|--------|
| `/review` | コード品質・セキュリティレビュー | `/review` |
| `/spec-check` | 仕様書との整合性チェック | `/spec-check themes` |
| `/test-e2e` | E2E テスト実行 | `/test-e2e auth` |
| `/deploy-prep` | デプロイ前チェックリスト | `/deploy-prep production` |

---

### 5. **開発環境セットアップドキュメント**

**ドキュメント**: `docs/setup/DEVELOPMENT_SETUP.md`

**内容**:
- 前提条件（Deno, PostgreSQL, Node.js）
- リポジトリクローン〜依存関係インストール
- 環境変数設定（`.env`, Supabase, GitHub OAuth）
- データベースセットアップ（Neon or ローカル PostgreSQL）
- 開発サーバー起動・動作確認
- Claude Code 設定（MCP, Skills, コマンド）
- 開発ワークフロー
- トラブルシューティング

---

## 🚀 開発開始のステップ

### Step 1: 環境構築

```bash
# 1. リポジトリをクローン
git clone https://github.com/YOUR_USERNAME/susumon.git
cd susumon

# 2. 環境変数を設定
cp .env.example .env
# .env を編集して必要な値を設定

# 3. データベースをセットアップ
deno task db:migrate:dev

# 4. 開発サーバーを起動
deno task dev
```

詳細: `docs/setup/DEVELOPMENT_SETUP.md`

### Step 2: Claude Code の設定

```bash
# 1. MCP サーバーをインストール
# （docs/setup/MCP_SETUP.md の手順に従う）

# 2. Claude Code を起動
claude

# 3. プロジェクトメモリを確認
# CLAUDE.md が自動読み込みされます

# 4. Skills の確認
# .claude/skills/ 内の Skills が自動起動可能になります

# 5. コマンドの確認
/help  # 利用可能なコマンドを表示
```

### Step 3: 仕様書の確認

```bash
# Claude Code で仕様書を確認
/spec-check

# または手動で確認
cat docs/spec/learning_log_meta_note_アプリ_機能仕様（draft_v_0.md
cat docs/spec/learning_log_meta_note_アプリ_技術仕様（final_v_0.md
cat docs/spec/learning_log_meta_note_アプリ_db設計（draft_v_0.md
```

### Step 4: 実装開始

**推奨ワークフロー**:

1. **Plan Mode で計画**: `Shift + Tab` 2回押下 → 実装計画を立案
2. **仕様確認**: `CLAUDE.md` と `docs/spec/` を参照
3. **実装**: Skills が自動起動してテンプレート提供
4. **テスト**: `/test-e2e` または `deno task test`
5. **レビュー**: `/review` でコード品質チェック
6. **コミット**: `git commit -m "feat: 機能の説明"`

---

## 📁 ファイル構成（準備済み）

```
susumon/
├── CLAUDE.md                          # プロジェクトメモリ（最重要）
├── .claude/
│   ├── skills/
│   │   ├── api-endpoint-builder/
│   │   │   └── SKILL.md
│   │   ├── prisma-schema-manager/
│   │   │   └── SKILL.md
│   │   └── sveltekit-component-builder/
│   │       └── SKILL.md
│   └── commands/
│       ├── review.md
│       ├── spec-check.md
│       ├── test-e2e.md
│       └── deploy-prep.md
├── docs/
│   ├── spec/                          # 仕様書（既存）
│   │   ├── learning_log_meta_note_アプリ_機能仕様（draft_v_0.md
│   │   ├── learning_log_meta_note_アプリ_技術仕様（final_v_0.md
│   │   └── learning_log_meta_note_アプリ_db設計（draft_v_0.md
│   ├── setup/                         # セットアップガイド（新規作成）
│   │   ├── README.md                  # このファイル
│   │   ├── DEVELOPMENT_SETUP.md       # 開発環境構築手順
│   │   └── MCP_SETUP.md               # MCP サーバー設定
│   └── tech/                          # 技術ドキュメント（既存）
└── （その他プロジェクトファイル）
```

---

## 🎯 開発の優先順位（推奨）

### Phase 1: 基盤構築（最優先）

1. **データベーススキーマ実装**
   - Prisma スキーマ作成 → `prisma-schema-manager` Skill 使用
   - マイグレーション実行
   - 動作確認（Prisma Studio）

2. **認証フロー実装**
   - Supabase Auth + GitHub OAuth 設定
   - `hooks.server.ts` で Cookie セッション管理
   - `/api/auth/session` エンドポイント実装

### Phase 2: Core機能実装

3. **Theme API 実装**
   - `/api/themes` エンドポイント → `api-endpoint-builder` Skill 使用
   - CRUD 操作（GET, POST, PATCH, DELETE）
   - ユニットテスト作成

4. **Theme UI 実装**
   - テーマ一覧・作成・編集画面 → `sveltekit-component-builder` Skill 使用
   - フォームバリデーション
   - E2E テスト（`/test-e2e themes`）

5. **Learning Log API + UI 実装**
   - `/api/logs` エンドポイント
   - 日次ログ入力画面
   - 1日1テーマ1ログ制約の確認

6. **Meta Note API + UI 実装**
   - `/api/notes` エンドポイント
   - メタノート一覧・作成・編集画面
   - 関連ログとの紐付け

### Phase 3: 追加機能

7. **Contribution 可視化**
   - `/api/activity` エンドポイント
   - GitHub 風カレンダーコンポーネント

8. **CSV Export**
   - Export 機能実装（詳細仕様は実装時に確定）

### Phase 4: 品質向上

9. **テスト拡充**
   - `/test-e2e` で全フロー確認
   - カバレッジ向上

10. **デプロイ準備**
    - `/deploy-prep staging` でチェック
    - Deno Deploy へデプロイ

---

## 💡 ベストプラクティス Tips

### Claude Code 活用

1. **Plan Mode を活用**: 複雑な実装は必ず Plan Mode で設計
2. **仕様書を常に参照**: `/spec-check` で定期確認
3. **Skills を信頼**: 自動起動されたら提案に従う
4. **レビューを忘れずに**: `/review` で品質維持

### コーディング

1. **`user_id` スコープは必須**: すべての DB クエリで確認
2. **エラーハンドリングを統一**: `{ error: { code, message } }` 形式
3. **型安全性を最優先**: `any` は使わない
4. **テストファースト**: API 実装前にテストケースを考える

### チーム開発（将来）

1. **CLAUDE.md を最新に保つ**: 重要な決定事項を追記
2. **Skills を共有**: `.claude/skills/` をリポジトリにコミット
3. **MCP 設定は個別**: API Key は各自で設定（`.mcp.json` に secrets を入れない）

---

## 🔗 参考リンク

- **Claude Code ガイド**: https://docs.anthropic.com/claude/docs/claude-code
- **MCP 公式ドキュメント**: https://modelcontextprotocol.io/
- **SvelteKit**: https://kit.svelte.dev/
- **Prisma**: https://www.prisma.io/
- **Deno Deploy**: https://deno.com/deploy
- **Supabase**: https://supabase.com/

---

準備は完了しました。**開発を開始する際は `docs/setup/DEVELOPMENT_SETUP.md` から始めてください。**

Happy Coding! 🚀
