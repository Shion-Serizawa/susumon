# Migration Guide: v0.1 → v0.2

## 概要

このドキュメントは、既存のv0.1データベースをv0.2スキーマに移行する手順を説明します。

**重要**: このマイグレーションには破壊的変更が含まれます。必ずバックアップを取得してから実行してください。

---

## 前提条件

1. ✅ PostgreSQL 17がインストールされている
2. ✅ 既存データのバックアップを取得済み
3. ✅ Prismaスキーマがv0.2に更新済み（`prisma/schema.prisma`）
4. ✅ ローカル開発環境で動作確認済み

---

## マイグレーション方法

### オプション A: 新規データベースで開始（推奨）

既存データがない、または少量の場合は、新規にデータベースを作成することを推奨します。

```bash
# 1. 既存のDockerコンテナを停止・削除
docker compose down -v  # -v でボリュームも削除

# 2. PostgreSQL 17イメージを取得
docker compose pull

# 3. 新しいコンテナを起動
docker compose up -d postgres

# 4. Prismaマイグレーションを実行
deno task db:migrate:dev --name v0.2_state_machine_and_normalization

# 5. Prisma Clientを再生成
deno task db:generate
```

---

### オプション B: 既存データを保持して移行

既存データを保持する場合は、手動でマイグレーションSQLを実行します。

#### ステップ1: PostgreSQL 17へのアップグレード

```bash
# 1. 既存データをバックアップ
docker exec susumon-postgres pg_dump -U susumon susumon_dev > backup_v0.1.sql

# 2. コンテナを停止
docker compose down

# 3. docker-compose.ymlを編集（postgres:17-alpineに変更）
# → 既に変更済みの場合はスキップ

# 4. 既存のボリュームを削除（データは失われます）
docker volume rm susumon_postgres_data

# 5. 新しいコンテナを起動
docker compose up -d postgres

# 6. バックアップを復元
docker exec -i susumon-postgres psql -U susumon susumon_dev < backup_v0.1.sql
```

#### ステップ2: スキーマ変更の適用

以下のSQLを手動で実行します。

```sql
-- ========================================
-- v0.1 → v0.2 マイグレーション SQL
-- ========================================

BEGIN;

-- 1. 新しいENUM型を作成
CREATE TYPE resource_state AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- 2. themes テーブルの変更
ALTER TABLE themes
  -- UUID型に変更
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid,
  -- デフォルト値を設定（新規レコード用）
  ALTER COLUMN id SET DEFAULT uuid_v7(),
  -- 状態管理カラムを追加
  ADD COLUMN state resource_state NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN state_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Timestamptz精度を変更
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at,
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at;

-- deleted_at から state への移行
UPDATE themes SET state = 'DELETED', state_changed_at = deleted_at
WHERE deleted_at IS NOT NULL;

-- 旧カラムを削除
ALTER TABLE themes DROP COLUMN deleted_at;

-- 新しいインデックスを追加
CREATE INDEX idx_themes_user_state ON themes(user_id, state);

-- 3. learning_log_entries テーブルの変更
ALTER TABLE learning_log_entries
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid,
  ALTER COLUMN theme_id TYPE UUID USING theme_id::uuid,
  ALTER COLUMN id SET DEFAULT uuid_v7(),
  ADD COLUMN state resource_state NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN state_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at,
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at;

UPDATE learning_log_entries SET state = 'DELETED', state_changed_at = deleted_at
WHERE deleted_at IS NOT NULL;

ALTER TABLE learning_log_entries DROP COLUMN deleted_at;

CREATE INDEX idx_logs_user_state ON learning_log_entries(user_id, state);

-- 4. meta_notes テーブルの変更

-- categoryの値を変換（日本語 → 英語キー）
UPDATE meta_notes SET category =
  CASE category::text
    WHEN '気づき' THEN 'INSIGHT'
    WHEN '疑問' THEN 'QUESTION'
    WHEN '感情' THEN 'EMOTION'
  END::text;

-- ENUM型を削除してTEXT型に変更
ALTER TABLE meta_notes
  ALTER COLUMN category TYPE TEXT USING category::text,
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid,
  ALTER COLUMN related_log_id TYPE UUID USING related_log_id::uuid,
  ALTER COLUMN id SET DEFAULT uuid_v7(),
  ADD COLUMN state resource_state NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN state_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at,
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at;

-- CHECK制約を追加
ALTER TABLE meta_notes
  ADD CONSTRAINT chk_meta_category CHECK (category IN ('INSIGHT', 'QUESTION', 'EMOTION'));

UPDATE meta_notes SET state = 'DELETED', state_changed_at = deleted_at
WHERE deleted_at IS NOT NULL;

ALTER TABLE meta_notes DROP COLUMN deleted_at;

-- 古いGINインデックスを削除
DROP INDEX IF EXISTS gin_notes_theme_ids;

CREATE INDEX idx_notes_user_state ON meta_notes(user_id, state);

-- 5. 中間テーブルの作成
CREATE TABLE meta_note_themes (
  meta_note_id UUID NOT NULL REFERENCES meta_notes(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (meta_note_id, theme_id)
);

CREATE INDEX idx_meta_note_themes_theme_id ON meta_note_themes(theme_id);

-- theme_ids配列から中間テーブルへデータ移行
INSERT INTO meta_note_themes (meta_note_id, theme_id)
SELECT
  id,
  unnest(theme_ids::uuid[])
FROM meta_notes
WHERE array_length(theme_ids, 1) > 0;

-- 旧カラムを削除
ALTER TABLE meta_notes DROP COLUMN theme_ids;

-- 6. 古いENUM型を削除
DROP TYPE IF EXISTS "MetaNoteCategory";

COMMIT;
```

#### ステップ3: Prismaスキーマの同期

```bash
# Prismaマイグレーション履歴をリセット（既存DBに手動で変更を加えた場合）
deno task prisma -- migrate resolve --applied "v0.2_state_machine_and_normalization"

# Prisma Clientを再生成
deno task db:generate
```

---

## 検証手順

マイグレーション後、以下を確認してください。

```sql
-- 1. ENUMの確認
SELECT typname, enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname = 'resource_state';
-- 期待結果: ACTIVE, ARCHIVED, DELETED

-- 2. テーブル構造の確認
\d themes
\d learning_log_entries
\d meta_notes
\d meta_note_themes

-- 3. データ件数の確認
SELECT
  (SELECT count(*) FROM themes WHERE state = 'ACTIVE') as active_themes,
  (SELECT count(*) FROM learning_log_entries WHERE state = 'ACTIVE') as active_logs,
  (SELECT count(*) FROM meta_notes WHERE state = 'ACTIVE') as active_notes,
  (SELECT count(*) FROM meta_note_themes) as note_theme_relations;

-- 4. category値の確認
SELECT DISTINCT category FROM meta_notes;
-- 期待結果: INSIGHT, QUESTION, EMOTION

-- 5. UUIDv7が機能しているか確認
INSERT INTO themes (user_id, name, goal)
VALUES (gen_random_uuid(), 'Test Theme', 'Test Goal')
RETURNING id;
-- idがUUIDv7形式で生成されることを確認
```

---

## トラブルシューティング

### エラー: `uuid_v7() does not exist`

**原因**: PostgreSQL 16以下を使用している

**解決策**:
```bash
# PostgreSQLのバージョン確認
docker exec susumon-postgres psql -U susumon -c "SELECT version();"

# 17未満の場合は、コンテナを再作成
docker compose down -v
docker compose up -d postgres
```

### エラー: `type "resource_state" already exists`

**原因**: マイグレーションを複数回実行した

**解決策**:
```sql
-- ENUMを削除して再実行
DROP TYPE IF EXISTS resource_state CASCADE;
```

### エラー: `column "deleted_at" does not exist`

**原因**: 既にv0.2スキーマになっている

**解決策**: マイグレーションをスキップ

---

## ロールバック手順

万が一問題が発生した場合は、バックアップから復元してください。

```bash
# 1. コンテナを停止
docker compose down

# 2. ボリュームを削除
docker volume rm susumon_postgres_data

# 3. PostgreSQL 16に戻す（必要に応じて）
# docker-compose.ymlを編集: postgres:16-alpine

# 4. コンテナを起動
docker compose up -d postgres

# 5. バックアップを復元
docker exec -i susumon-postgres psql -U susumon susumon_dev < backup_v0.1.sql

# 6. Prismaスキーマをv0.1に戻す
git checkout HEAD~1 -- prisma/schema.prisma

# 7. Prisma Clientを再生成
deno task db:generate
```

---

## 本番環境へのデプロイ

Deno Deploy Prisma Postgresへのデプロイ手順：

1. ✅ ローカル環境でマイグレーションが成功していることを確認
2. ✅ Deno Deploy Prisma PostgresがPostgreSQL 17に対応していることを確認
3. ✅ 本番DBのバックアップを取得
4. ✅ メンテナンスモードに切り替え
5. ✅ `deno task db:migrate:deploy` を実行
6. ✅ 動作確認
7. ✅ メンテナンスモード解除

**注意**: Deno Deploy Prisma PostgresのPostgreSQL 17対応状況を事前に確認してください。

---

## チェックリスト

- [ ] バックアップを取得済み
- [ ] PostgreSQL 17に移行済み
- [ ] マイグレーションSQLを実行済み
- [ ] Prisma Clientを再生成済み
- [ ] データ検証を完了済み
- [ ] アプリケーションの動作確認済み
- [ ] 型定義ファイルを更新済み（`src/lib/types/index.ts`）
- [ ] API実装を更新済み（category値、themeIds対応）

---

以上でv0.1からv0.2への移行が完了です。
