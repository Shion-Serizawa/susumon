# Learning Log / Meta Note アプリ DB設計（Final v0.2）

本ドキュメントは、PostgreSQL の論理/物理設計（DDL）を定義する。

**v0.2の主な変更:**
- UUIDv7のDB側採番（`uuid_v7()`関数）
- 論理削除をState Machine方式（ResourceState enum）に変更
- MetaNoteのcategoryを英語キー（TEXT + CHECK制約）に変更
- theme_ids配列を中間テーブル（meta_note_themes）に正規化
- Timestamptz(6)をTimestamptzに統一

---

## 0. 関連ドキュメント

- OpenAPI: `docs/spec/learning_log_meta_note_アプリ_OpenAPI_v0.2.yaml`
- 変更ログ: `docs/spec/CHANGELOG_v0.2.md`
- マイグレーション: `prisma/migrations/`

---

## 1. 設計前提

- 利用開始は **ユーザー1名**を想定するが、スキーマは **複数ユーザー対応**を前提とする
- 認証は Supabase Auth（GitHub OAuth）を想定し、`user_id` は **Supabase の `auth.users.id`（uuid）** を格納する（JWT の subject に相当）
- UI日付（`date`, `note_date`）は JST のローカル日付。DB では `DATE` として保持する（タイムゾーン変換はしない）
- `created_at`/`updated_at` は `timestamptz`（UTC想定）
- **v0.2 は State Machine による論理削除を採用**。`state` カラム（ACTIVE/ARCHIVED/DELETED）で状態管理
- **PostgreSQL 17以降を使用**
  - UUIDv7 は **DB側で `uuid_v7()` 関数により採番**する
  - `uuid_v7()` は PostgreSQL の組み込み関数ではなく、マイグレーションで定義する（`prisma/migrations/*/migration.sql`）

---

## 2. 推奨拡張

```sql
-- uuid_v7() はマイグレーションで定義する（RFC 9562準拠）
-- 乱数生成に pgcrypto を使用するため、拡張を有効化する
create extension if not exists pgcrypto;
```

---

## 3. テーブル定義（DDL）

### 3.1 リソース状態管理（ENUM）

```sql
-- リソースの状態を管理するENUM型
create type resource_state as enum ('ACTIVE', 'ARCHIVED', 'DELETED');
```

---

### 3.2 themes

```sql
create table if not exists themes (
  id uuid primary key default uuid_v7(),
  user_id uuid not null, -- Supabase auth.users.id

  name text not null,
  short_name text,
  goal text not null,
  is_completed boolean not null default false,

  state resource_state not null default 'ACTIVE',
  state_changed_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- マルチテナント境界 + 完了状態検索
create index if not exists idx_themes_user_completed on themes(user_id, is_completed);

-- 状態管理用インデックス
create index if not exists idx_themes_user_state on themes(user_id, state);
```

**備考**
- `short_name` が NULL の場合、UI 側で `...` 表示
- `state` で論理削除を管理（ACTIVE: 通常、ARCHIVED: アーカイブ、DELETED: 削除済み）
- アプリケーション層では通常 `state != 'DELETED'` でフィルタリング

---

### 3.3 learning_log_entries

```sql
create table if not exists learning_log_entries (
  id uuid primary key default uuid_v7(),
  user_id uuid not null, -- Supabase auth.users.id

  theme_id uuid not null references themes(id) on delete cascade,
  date date not null,

  summary text not null,
  details text,

  tags text[] not null default array[]::text[],

  state resource_state not null default 'ACTIVE',
  state_changed_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_log_per_day unique (user_id, theme_id, date)
);

-- 日付範囲検索用（追加）
create index if not exists idx_logs_user_date on learning_log_entries(user_id, date);

-- テーマ別ログ検索用
create index if not exists idx_logs_user_theme_date on learning_log_entries(user_id, theme_id, date);

-- 状態管理用インデックス
create index if not exists idx_logs_user_state on learning_log_entries(user_id, state);

-- tags 検索用（将来）
create index if not exists gin_logs_tags on learning_log_entries using gin (tags);
```

**備考**
- 「1日1テーマ1ログ」を DB 制約（`uq_log_per_day`）で担保
- tags は v0.1 では UI 最小（または非表示）だが、DB に保持
- `state` で論理削除を管理

---

### 3.4 meta_notes

```sql
create table if not exists meta_notes (
  id uuid primary key default uuid_v7(),
  user_id uuid not null, -- Supabase auth.users.id

  category text not null,
  body text not null,

  -- 関連ログ（任意）
  related_log_id uuid references learning_log_entries(id) on delete set null,

  note_date date not null,

  state resource_state not null default 'ACTIVE',
  state_changed_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_meta_category check (category in ('INSIGHT', 'QUESTION', 'EMOTION'))
);

create index if not exists idx_notes_user_date on meta_notes(user_id, note_date);
create index if not exists idx_notes_user_category_date on meta_notes(user_id, category, note_date);
create index if not exists idx_notes_user_state on meta_notes(user_id, state);
```

**備考**
- `category` は英語キー（'INSIGHT', 'QUESTION', 'EMOTION'）をDB値として使用
  - UI表示: INSIGHT→「気づき」、QUESTION→「疑問」、EMOTION→「感情」
  - 国際化対応が容易（アプリ側で翻訳テーブル管理）
- `note_date` は UI 上の JST ローカル日付（自由入力不可、サーバー側で自動生成）
- `related_log_id` は「日次ログ画面にそのまま書く」要件を自然に満たす
- `state` で論理削除を管理

---

### 3.5 meta_note_themes（中間テーブル）

```sql
-- MetaNote <-> Theme の多対多リレーション
create table if not exists meta_note_themes (
  meta_note_id uuid not null references meta_notes(id) on delete cascade,
  theme_id uuid not null references themes(id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (meta_note_id, theme_id)
);

-- テーマ側からの検索用
create index if not exists idx_meta_note_themes_theme_id on meta_note_themes(theme_id);
```

**備考**
- v0.1の配列型（theme_ids uuid[]）を正規化
- 参照整合性をDB制約で保証
- テーマが削除されると自動的に関連レコードも削除（CASCADE）

---

## 4. updated_at 自動更新（推奨）

```sql
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_themes_updated_at on themes;
create trigger trg_themes_updated_at
before update on themes
for each row execute function set_updated_at();

drop trigger if exists trg_logs_updated_at on learning_log_entries;
create trigger trg_logs_updated_at
before update on learning_log_entries
for each row execute function set_updated_at();

drop trigger if exists trg_notes_updated_at on meta_notes;
create trigger trg_notes_updated_at
before update on meta_notes
for each row execute function set_updated_at();
```

**備考**
- Prismaの`@updatedAt`はPrisma経由の更新のみ有効
- 直接SQLで更新する場合に備えてトリガーも定義

---

## 5. CSV Export における表現

- `tags` は CSV では **1カラムに `;` 区切り**で出力
  - 例：`array_to_string(tags, ';')`
- `meta_note_themes` は結合して出力
  - 例：
  ```sql
  select array_to_string(
    array_agg(t.name order by t.name), ';'
  ) as theme_names
  from meta_note_themes mnt
  join themes t on t.id = mnt.theme_id
  where mnt.meta_note_id = $1
  ```

---

## 6. 権限制御（RLS / API層）

DB は **Deno Deploy の Prisma Postgres** を想定する。

- 基本方針：v0.1 は **API 層で必ず `user_id` によるスコープ制限**を実施する
  - Prisma Client Extensionsで自動的に`userId`の存在をチェック
  - さらに`state != 'DELETED'`を自動付与
- Postgres の RLS は将来的に導入可能（ただし JWT を DB 側に伝搬し `current_setting` 等で判定する設計が必要になるため、v0.1 では必須にしない）
- 直接SQLでクエリを実行する場合はマルチテナント境界を手動で確認する必要がある

（RLS を採用する場合の具体ポリシーは別ドキュメントで確定する）

---

## 7. 確定事項（v0.2）

1. **`user_id` 型**：uuid（Supabase `auth.users.id`）で確定
2. **削除方針**：State Machine方式を採用。`state` カラム（resource_state enum）で管理
3. **theme_ids の保持方法**：中間テーブル（meta_note_themes）で正規化
4. **related_log_id の参照方式**：`learning_log_entries.id`（uuid）を直接参照
5. **UUID生成**：PostgreSQL 17の`uuid_v7()`をDB側で使用
6. **Timestamptz精度**：明示的な精度指定なし（PostgreSQLデフォルトの6桁マイクロ秒）
7. **category値**：英語キー（'INSIGHT', 'QUESTION', 'EMOTION'）、UI側で多言語対応

---

## 8. マイグレーション戦略（v0.1→v0.2）

既存データがない場合は新規作成で問題ないが、既存データがある場合：

```sql
-- 1. 新しいENUM型を作成
CREATE TYPE resource_state AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- 2. 各テーブルに新カラム追加
ALTER TABLE themes
  ADD COLUMN state resource_state NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN state_changed_at timestamptz NOT NULL DEFAULT now();

-- 3. deleted_at から state へ移行（既存データがある場合）
UPDATE themes SET state = 'DELETED' WHERE deleted_at IS NOT NULL;

-- 4. 旧カラム削除
ALTER TABLE themes DROP COLUMN deleted_at;

-- 5. category値の変換（meta_notes）
UPDATE meta_notes SET category =
  CASE category
    WHEN '気づき' THEN 'INSIGHT'
    WHEN '疑問' THEN 'QUESTION'
    WHEN '感情' THEN 'EMOTION'
  END;

-- 6. 中間テーブル作成と配列からの移行
CREATE TABLE meta_note_themes (
  meta_note_id uuid NOT NULL REFERENCES meta_notes(id) ON DELETE CASCADE,
  theme_id uuid NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (meta_note_id, theme_id)
);

-- theme_ids配列から中間テーブルへデータ移行
INSERT INTO meta_note_themes (meta_note_id, theme_id)
SELECT id, unnest(theme_ids) FROM meta_notes WHERE array_length(theme_ids, 1) > 0;

-- 旧カラム削除
ALTER TABLE meta_notes DROP COLUMN theme_ids;
```

以上を DB 設計（Final v0.2）とする。
