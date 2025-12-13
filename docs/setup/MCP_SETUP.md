# MCP サーバー セットアップガイド

本プロジェクトで推奨する MCP (Model Context Protocol) サーバーの設定手順。

---

## 必須 MCP サーバー

### 1. **GitHub (リポジトリ管理・PR・Issue)**

```bash
# インストール
claude mcp add --transport http github https://mcp.github.com/mcp \
  --header "Authorization: Bearer YOUR_GITHUB_PAT"
```

**取得手順**:
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token (classic)
3. スコープ: `repo`, `read:org`, `workflow`
4. 生成された Token を上記コマンドに使用

**用途**:
- Pull Request の作成・レビュー
- Issue の作成・管理
- CI/CD ステータスの確認

---

## 推奨 MCP サーバー

### 2. **Context7 (最新ドキュメント検索)**

SvelteKit、Deno、Prisma 等の最新ドキュメントを検索。

```bash
# インストール
claude mcp add --transport http context7 https://mcp.context7.dev/mcp
```

**用途**:
- SvelteKit の最新 API リファレンス
- Deno Deploy のベストプラクティス確認
- Prisma の Deno 対応ドキュメント
- Deno Deploy Prisma Postgres の設定方法

---

### 3. **Playwright (E2Eテスト)**

ブラウザ自動化・E2E テストの作成・実行。

```bash
# インストール
claude mcp add --transport stdio playwright -- npx -y @playwright/mcp
```

**用途**:
- ログイン〜ログアウトフローのテスト
- フォーム送信・バリデーションのテスト
- レスポンシブ UI の確認

---

### 4. **Serena (セマンティックコード検索・編集)**

IDE のような能力で、コードベースのセマンティック検索・リファクタリングを実現。

```bash
# インストール（プロジェクトディレクトリで実行）
cd /path/to/susumon

# uvx を使用（推奨）
claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server --context claude-code --project "$(pwd)"

# Windows の場合
# claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server --context claude-code --project "%cd%"
```

**特徴**:
- **無料・オープンソース**: サブスクリプション不要、API Key 不要
- **30以上の言語対応**: TypeScript, JavaScript, Python, Rust, Go など
- **Language Server 統合**: LSP によるインテリジェントなコード解析
- **大規模コードベース対応**: 複雑なリファクタリングに最適

**用途**:
- セマンティックコード検索（関数・クラス定義の検索）
- インテリジェントなリファクタリング
- 依存関係の解析
- コードベース全体の理解

**必要要件**:
- Claude Code v1.0.52 以上
- Python 環境（uvx が使用可能）

**参考リンク**:
- [GitHub Repository](https://github.com/oraios/serena)
- [公式ドキュメント](https://oraios.github.io/serena/)
- [セットアップガイド](https://smartscope.blog/en/generative-ai/claude/serena-mcp-implementation-guide/)

---

## オプション MCP サーバー

### 5. **PostgreSQL (ローカル開発用)**

ローカルの PostgreSQL（Docker）に直接接続。

```bash
# インストール
claude mcp add --transport stdio postgres -- \
  env POSTGRES_CONNECTION_STRING="postgresql://susumon:susumon_dev_password@localhost:5432/susumon_dev" \
  npx -y @modelcontextprotocol/server-postgres
```

**用途**:
- ローカル環境でのスキーマ確認
- 開発中のクエリ最適化
- Docker Compose で起動した PostgreSQL へのアクセス

**注意**:
- 本プロジェクトでは **Deno Deploy Prisma Postgres** を本番環境で使用します
- ローカル開発は Docker Compose の PostgreSQL で十分です
- Neon は使用しません

---

## データベースについて

### 本番環境: Deno Deploy Prisma Postgres

Deno Deploy でプロビジョニングできる Prisma Postgres を使用します。

**特徴**:
- Deno Deploy と統合された PostgreSQL
- 自動プロビジョニング
- Deno Deploy ダッシュボードから管理

**セットアップ**:
1. Deno Deploy でプロジェクトを作成
2. Database タブから Prisma Postgres をプロビジョニング
3. 接続文字列を取得して `.env` に設定

**MCP 不要**:
- Deno Deploy Prisma Postgres には専用の MCP サーバーがないため、ローカルで Prisma Studio を使用します
- 必要に応じて Deno Deploy ダッシュボードで直接管理

### ローカル開発: Docker Compose PostgreSQL

```bash
# Docker で起動
make db-up

# Prisma Studio で管理
make db-studio
```

---

## 設定の確認

```bash
# インストール済み MCP サーバーの一覧
claude mcp list

# 特定の MCP サーバーの設定確認
claude mcp get github
claude mcp get context7

# デバッグモード
claude --mcp-debug
```

---

## プロジェクト固有設定（`.mcp.json`）

チーム全体で共有する場合、プロジェクトルートに `.mcp.json` を作成:

```json
{
  "mcpServers": {
    "context7": {
      "transport": "http",
      "url": "https://mcp.context7.dev/mcp"
    }
  }
}
```

**注意**: API Key を含む設定は `.mcp.json` にコミットしない（個人の `~/.claude/config.json` に保存）。

---

## トラブルシューティング

### MCP サーバーが起動しない

```bash
# ログ確認
tail -f ~/.claude/logs/mcp-server-*.log

# サーバーの再起動
claude mcp restart github
```

### API Key エラー

```bash
# 設定の削除と再追加
claude mcp remove github
claude mcp add --transport http github https://mcp.github.com/mcp \
  --header "Authorization: Bearer NEW_GITHUB_PAT"
```

### PostgreSQL (ローカル) に接続できない

```bash
# Docker Compose で PostgreSQL が起動しているか確認
docker compose ps

# PostgreSQL が起動していなければ
make db-up

# 接続文字列を確認
echo $DATABASE_URL
# または
cat .env | grep DATABASE_URL
```

---

## セキュリティ上の注意

1. **API Key の管理**: 環境変数または `~/.claude/config.json` で管理し、リポジトリにコミットしない
2. **権限の最小化**: GitHub PAT は必要最小限のスコープのみ付与
3. **定期的なローテーション**: API Key は定期的に再生成

---

## まとめ

### 最小構成（開発開始に必要）

1. **GitHub**: PR/Issue 管理（必須）
2. **Context7**: ドキュメント検索（推奨）
3. **Playwright**: E2Eテスト（推奨）

### オプション

4. **Serena**: 高度なタスク管理（必要に応じて）
5. **PostgreSQL (local)**: ローカル DB 接続（Prisma Studio で十分な場合は不要）

---

以上で MCP サーバーのセットアップは完了です。
