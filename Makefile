# Learning Log / Meta Note アプリ - 開発用Makefile

.PHONY: help setup dev db-up db-down db-reset db-migrate db-studio test lint format clean

# デフォルトターゲット
help:
	@echo "Learning Log / Meta Note - 開発コマンド"
	@echo ""
	@echo "セットアップ:"
	@echo "  make setup       - 初回セットアップ（DB起動 + マイグレーション）"
	@echo ""
	@echo "開発:"
	@echo "  make dev         - 開発サーバー起動"
	@echo "  make db-up       - PostgreSQL起動（Docker Compose）"
	@echo "  make db-down     - PostgreSQL停止"
	@echo "  make db-reset    - DB初期化（全データ削除）"
	@echo ""
	@echo "データベース:"
	@echo "  make db-migrate  - マイグレーション実行"
	@echo "  make db-studio   - Prisma Studio起動（DB GUI）"
	@echo ""
	@echo "テスト・品質:"
	@echo "  make test        - テスト実行"
	@echo "  make lint        - Linter実行"
	@echo "  make format      - コード整形"
	@echo ""
	@echo "その他:"
	@echo "  make clean       - ビルド成果物削除"

# 初回セットアップ
setup:
	@echo "📦 初回セットアップを開始..."
	@if [ ! -f .env ]; then \
		echo "⚙️  .env ファイルを作成中..."; \
		cp .env.example .env; \
		echo "✅ .env を作成しました。必要な値を設定してください。"; \
	else \
		echo "✅ .env は既に存在します。"; \
	fi
	@echo "🐳 Docker Compose で PostgreSQL を起動中..."
	docker compose up -d postgres
	@echo "⏳ PostgreSQL の起動を待機中（10秒）..."
	sleep 10
	@echo "🗄️  Prisma マイグレーションを実行中..."
	deno task db:migrate:dev
	@echo "✅ セットアップ完了！"
	@echo ""
	@echo "次のステップ:"
	@echo "  1. .env を編集して Supabase の設定を追加"
	@echo "  2. make dev で開発サーバーを起動"

# 開発サーバー起動
dev:
	@echo "🚀 開発サーバーを起動中..."
	deno task dev

# PostgreSQL 起動
db-up:
	@echo "🐳 PostgreSQL を起動中..."
	docker compose up -d postgres
	@echo "✅ PostgreSQL が起動しました（localhost:5432）"

# PostgreSQL 停止
db-down:
	@echo "🛑 PostgreSQL を停止中..."
	docker compose down
	@echo "✅ PostgreSQL を停止しました"

# DB リセット（開発環境のみ！）
db-reset:
	@echo "⚠️  警告: すべてのデータが削除されます"
	@read -p "本当に実行しますか？ (yes/no): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		echo "🔄 データベースをリセット中..."; \
		deno task db:reset; \
		echo "✅ リセット完了"; \
	else \
		echo "❌ キャンセルしました"; \
	fi

# マイグレーション実行
db-migrate:
	@echo "🗄️  Prisma マイグレーションを実行中..."
	deno task db:migrate:dev

# Prisma Studio 起動
db-studio:
	@echo "🎨 Prisma Studio を起動中..."
	deno task db:studio

# テスト実行
test:
	@echo "🧪 テストを実行中..."
	deno task test

# Linter 実行
lint:
	@echo "🔍 Linter を実行中..."
	deno task lint

# コード整形
format:
	@echo "✨ コードを整形中..."
	deno task format

# クリーンアップ
clean:
	@echo "🧹 ビルド成果物を削除中..."
	rm -rf .svelte-kit build .output
	@echo "✅ クリーンアップ完了"
