# Learning Log / Meta Note アプリ DB設計（Final v0.1）

本ドキュメントは、技術仕様（Draft v0.1）に基づき、PostgreSQL の論理/物理設計（DDL）を定義する。

---

## 0. 先に明示：現時点で不足しているドキュメント

v0.1 実装を安定して進めるために、現状まだ未作成（または粒度不足）のドキュメントは以下。

1. **API スキーマ（OpenAPI正式版）**：現在は OpenAPI 風の叩き台。型・エラー仕様（4xx/5xx）・pagination・rate limit 等が未確定。
2. **デプロイ設計（Deno Deploy）**：単一リポジトリのビルド/デプロイ手順、環境変数、preview環境、secret管理の具体手順。
3. **認証実装詳細**：Supabase Auth（GitHub OAuth）のコールバックURL、セッション保持（cookie/local）方針、CSR/SSR時の扱い。
4. **RLS/権限制御設計**：Supabase を採用する場合、Row Level Security の有無、適用範囲、API側での担保との切り分け。
5. **CSV Export 仕様**：列定義、エクスポート単位、配列フィールドの表現（`;`）は確定済みだが、文字エスケープや改行/引用符ルール、日付/時刻フォーマットが未確定。
6. **運用ポリシー**：バックアップ、リストア、監視（最低限のログ）、データ削除（物理/論理）の採用判断。

本ドキュメントでは、まず DB スキーマを確定させる。

---

## 1. 設計前提

- v0.1 は **ユーザー1名**で利用開始するが、スキーマは **複数ユーザー対応**を前提とする
- 認証は Supabase Auth（GitHub OAuth）を想定し、`user_id` は **Supabase の `auth.users.id`（uuid）** を格納する（JWT の subject に相当）
- UI日付（`date`, `note_date`）は JST のローカル日付。DB では `DATE` として保持する（タイムゾーン変換はしない）
- `created_at`/`updated_at` は `timestamptz`（UTC想定）
- **v0.1 は物理削除を採用**。`deleted_at` カラムは定義するが、初期実装では使用しない（将来的に論理削除へ移行可能）

---

## 2. 推奨拡張

```sql
-- UUID生成
create extension if not exists pgcrypto;

-- UUIDv7 は Postgres 標準関数では生成しない前提（アプリ側で生成してINSERTする）
-- ※ 将来、DB側でUUIDv7生成が必要になった場合は拡張/関数導入を別途検討する
```

---

## 3. テーブル定義（DDL）

### 3.1 themes

```sql
create table if not exists themes (
  id uuid primary key, -- UUIDv7（アプリ側で生成）
  user_id uuid not null, -- Supabase auth.users.id

  name text not null,
  short_name text,
  goal text not null,
  is_completed boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- user_id 単体の検索は (user_id, is_completed) の左端プレフィックスで賄えるため、基本はこの1本で開始
create index if not exists idx_themes_user_completed on themes(user_id, is_completed);

-- もし user_id のみで頻繁に検索し、かつ is_completed を参照しないクエリが多くボトルネックになる場合のみ追加
-- create index if not exists idx_themes_user_id on themes(user_id);
```

**備考**
- `short_name` が NULL の場合、UI 側で `...` 表示
- `deleted_at` は v0.1 では使用しない（物理削除を採用）。将来の論理削除移行に備えて定義のみ

---

### 3.2 learning_log_entries

```sql
create table if not exists learning_log_entries (
  id uuid primary key, -- UUIDv7（アプリ側で生成）
  user_id uuid not null, -- Supabase auth.users.id

  theme_id uuid not null references themes(id) on delete cascade,
  date date not null,

  summary text not null,
  details text,

  tags text[] not null default array[]::text[],

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint uq_log_per_day unique (user_id, theme_id, date)
);

create index if not exists idx_logs_user_date on learning_log_entries(user_id, date);
create index if not exists idx_logs_user_theme_date on learning_log_entries(user_id, theme_id, date);

-- tags 検索用（将来）
create index if not exists gin_logs_tags on learning_log_entries using gin (tags);
```

**備考**
- 「1日1テーマ1ログ」を DB 制約（`uq_log_per_day`）で担保
- tags は v0.1 では UI 最小（または非表示）だが、DB に保持
- `deleted_at` は v0.1 では使用しない（物理削除を採用）

---

### 3.3 meta_notes

```sql
create table if not exists meta_notes (
  id uuid primary key, -- UUIDv7（アプリ側で生成）
  user_id uuid not null, -- Supabase auth.users.id

  category text not null,
  body text not null,

  -- 関連テーマ（0..N）。未設定は「雑記」扱い
  theme_ids uuid[] not null default array[]::uuid[],

  -- 関連ログ（任意）：DB内部では learning_log_entries.id を参照するのが安全
  related_log_id uuid references learning_log_entries(id) on delete set null,

  note_date date not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint chk_meta_category check (category in ('気づき', '疑問', '感情'))
);

create index if not exists idx_notes_user_date on meta_notes(user_id, note_date);
create index if not exists idx_notes_user_category_date on meta_notes(user_id, category, note_date);

-- theme_ids を含む検索（将来）
create index if not exists gin_notes_theme_ids on meta_notes using gin (theme_ids);
```

**備考**
- `note_date` は UI 上の JST ローカル日付（自由入力不可、サーバー側で自動生成）
- `related_log_id` は「日次ログ画面にそのまま書く」要件を自然に満たす
- `theme_ids` は配列で保持（v0.1 の実装を簡単にする）。将来、高度な検索・整合性が必要なら中間テーブル化を検討
- `deleted_at` は v0.1 では使用しない（物理削除を採用）

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

---

## 5. CSV Export における表現

- `tags` / `theme_ids` は CSV では **1カラムに `;` 区切り**で出力
  - 例：`array_to_string(tags, ';')`
  - 例：`array_to_string(theme_ids::text[], ';')`

---

## 6. 権限制御（RLS / API層）

DB は **Neon** または **Deno Deploy の Prisma Postgres** を想定する。

- 基本方針：v0.1 は **API 層で必ず `user_id` によるスコープ制限**を実施する
- Postgres の RLS は将来的に導入可能（ただし JWT を DB 側に伝搬し `current_setting` 等で判定する設計が必要になるため、v0.1 では必須にしない）

（RLS を採用する場合の具体ポリシーは別ドキュメントで確定する）

---

## 7. 確定事項（v0.1）

1. **`user_id` 型**：uuid（Supabase `auth.users.id`）で確定
2. **削除方針**：物理削除を採用。`deleted_at` カラムは将来の論理削除移行に備えて定義するが、v0.1 では使用しない
3. **theme_ids の保持方法**：配列型（uuid[]）で保持。将来、クエリパフォーマンスや整合性要件が厳しくなった場合に中間テーブル化を検討
4. **related_log_id の参照方式**：`learning_log_entries.id`（uuid）を直接参照。複合キー（themeId + date）による参照は行わない

以上を DB 設計（Final v0.1）とする。

