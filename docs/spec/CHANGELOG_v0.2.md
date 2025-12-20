# 仕様変更ログ v0.1 → v0.2

## 概要

v0.2では、保守性と拡張性を重視した以下の重要な変更を実施しました。

---

## 主な変更点

### 1. PostgreSQL 17への移行とUUIDv7対応
**変更内容:**
- PostgreSQL 16 → 17にアップグレード
- UUIDv7をアプリ側採番からDB側採番（カスタム`uuid_v7()`関数）に変更

**実装方法:**
```sql
-- RFC 9562準拠のUUIDv7関数をPostgreSQLに実装
CREATE OR REPLACE FUNCTION uuid_v7() RETURNS uuid AS $$
  -- 48 bits: Unix timestamp (millisecond)
  -- 4 bits: Version (7)
  -- 12 bits: Random
  -- 2 bits: Variant (2)
  -- 62 bits: Random
$$ LANGUAGE plpgsql VOLATILE;
```

**影響箇所:**
- `docker-compose.yml`: `postgres:17-alpine`
- `prisma/schema.prisma`: `@default(dbgenerated("uuid_v7()"))`
- `prisma/migrations/*/migration.sql`: UUIDv7関数定義を含む
- 仕様書: DB設計書の「推奨拡張」セクション

**理由:**
- PostgreSQL 17にネイティブ`uuid_v7()`がまだない → カスタム関数で実装
- UUIDv7の利点（時系列ソート可能、created_atインデックス削減）を活用
- アプリ側の依存削減（uuidv7パッケージ不要）
- バッチ処理・SQL直接実行時の安全性向上

**注意:**
PrismaがPostgreSQL18に更新された場合は、カスタム関数を削除して組み込み関数に切り替え可能

---

### 2. 論理削除からState Machine方式への移行
**変更内容:**
- `deleted_at timestamptz` → `state resource_state`
- 新しいENUM: `resource_state ('ACTIVE', 'ARCHIVED', 'DELETED')`
- `state_changed_at timestamptz`カラムの追加

**影響箇所:**
- すべてのモデル（Theme, LearningLogEntry, MetaNote）
- インデックス追加: `idx_*_user_state`
- Prisma Client Extensions: 自動的に`state != 'DELETED'`をフィルタ

**理由:**
- 複数状態の管理が可能（将来のアーカイブ機能に対応）
- 状態遷移の明示化
- 監査要件への対応

**マイグレーションパス:**
```sql
-- deleted_at IS NOT NULL のレコードを DELETED に変換
UPDATE themes SET state = 'DELETED' WHERE deleted_at IS NOT NULL;
ALTER TABLE themes DROP COLUMN deleted_at;
```

---

### 3. MetaNoteのcategoryを英語キーに変更
**変更前:**
```sql
-- PostgreSQL ENUM
CREATE TYPE meta_note_category AS ENUM ('気づき', '疑問', '感情');
```

**変更後:**
```sql
-- TEXT + CHECK制約
category text not null,
CONSTRAINT chk_meta_category CHECK (category IN ('INSIGHT', 'QUESTION', 'EMOTION'))
```

**理由:**
- 国際化対応の容易化（DB値はキー、UI側で翻訳）
- Enum値の変更が容易（CHECK制約の変更のみ）
- マイグレーション時のダウンタイムリスク削減

**UI表示マッピング:**
```typescript
const CATEGORY_LABELS: Record<string, string> = {
  INSIGHT: '気づき',
  QUESTION: '疑問',
  EMOTION: '感情'
};
```

**マイグレーションパス:**
```sql
UPDATE meta_notes SET category =
  CASE category
    WHEN '気づき' THEN 'INSIGHT'
    WHEN '疑問' THEN 'QUESTION'
    WHEN '感情' THEN 'EMOTION'
  END;
```

---

### 4. theme_ids配列から中間テーブルへの正規化
**変更前:**
```prisma
model MetaNote {
  themeIds String[] @default([]) @map("theme_ids")
}
```

**変更後:**
```prisma
model MetaNote {
  metaNoteThemes MetaNoteTheme[]
}

model MetaNoteTheme {
  metaNoteId String @map("meta_note_id") @db.Uuid
  themeId    String @map("theme_id") @db.Uuid

  metaNote MetaNote @relation(...)
  theme    Theme    @relation(...)

  @@id([metaNoteId, themeId])
}
```

**理由:**
- 参照整合性をDB制約で保証
- 孤児参照の防止
- 将来的なクエリパフォーマンス向上

**マイグレーションパス:**
```sql
CREATE TABLE meta_note_themes (...);

INSERT INTO meta_note_themes (meta_note_id, theme_id)
SELECT id, unnest(theme_ids) FROM meta_notes WHERE array_length(theme_ids, 1) > 0;

ALTER TABLE meta_notes DROP COLUMN theme_ids;
```

---

### 5. Timestamptz精度の統一
**変更前:**
```prisma
createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
```

**変更後:**
```prisma
createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
```

**理由:**
- PostgreSQLのデフォルト精度（6桁マイクロ秒）を使用
- スキーマの冗長性削減

---

### 6. インデックスの追加
**追加されたインデックス:**
```sql
-- 日付範囲検索用（元々仕様書にはあったがPrismaスキーマに欠如していた）
CREATE INDEX idx_logs_user_date ON learning_log_entries(user_id, date);

-- State Machine用
CREATE INDEX idx_themes_user_state ON themes(user_id, state);
CREATE INDEX idx_logs_user_state ON learning_log_entries(user_id, state);
CREATE INDEX idx_notes_user_state ON meta_notes(user_id, state);

-- 中間テーブル用
CREATE INDEX idx_meta_note_themes_theme_id ON meta_note_themes(theme_id);
```

---

### 7. マルチテナント境界保護の強化
**追加内容:**
`src/lib/server/db.ts`にPrisma Client Extensionsを実装

```typescript
const prisma = new PrismaClient().$extends({
  name: 'multiTenantGuard',
  query: {
    theme: {
      async findMany({ args, query }) {
        // userId必須チェック
        if (!args.where?.userId) {
          throw new Error('SECURITY: Theme.findMany requires userId');
        }
        // 削除済みを自動フィルタ
        if (args.where.state === undefined) {
          args.where = { ...args.where, state: { not: 'DELETED' } };
        }
        return query(args);
      }
    }
    // ... 他のモデルも同様
  }
});
```

**効果:**
- アプリケーション層でのユーザー境界違反を防止
- 削除済みレコードの自動除外
- 直接SQLクエリ実行時は手動チェックが必要（意図的な設計）

---

## OpenAPI仕様への影響

### MetaNoteCategory
**変更前:**
```yaml
MetaNoteCategory:
  type: string
  enum: ['気づき', '疑問', '感情']
```

**変更後:**
```yaml
MetaNoteCategory:
  type: string
  enum: ['INSIGHT', 'QUESTION', 'EMOTION']
```

### MetaNote スキーマ
**変更前:**
```yaml
MetaNote:
  properties:
    themeIds:
      type: array
      items: { type: string, format: uuid }
```

**変更後:**
```yaml
MetaNote:
  properties:
    themes:  # 展開される場合
      type: array
      items:
        type: object
        properties:
          id: { type: string, format: uuid }
          name: { type: string }
```

**注意:**
- API応答で`themeIds`を含めるか、`themes`オブジェクトを展開するかは実装次第
- パフォーマンスを考慮し、一覧取得では`themeIds`のみ、詳細取得で展開を推奨

---

## TypeScript型定義への影響

### 新しい型定義が必要
```typescript
// src/lib/types/meta-note.ts
export const META_NOTE_CATEGORIES = ['INSIGHT', 'QUESTION', 'EMOTION'] as const;
export type MetaNoteCategory = typeof META_NOTE_CATEGORIES[number];

export function isValidCategory(value: string): value is MetaNoteCategory {
  return META_NOTE_CATEGORIES.includes(value as MetaNoteCategory);
}

export const CATEGORY_LABELS: Record<MetaNoteCategory, string> = {
  INSIGHT: '気づき',
  QUESTION: '疑問',
  EMOTION: '感情'
};

// src/lib/types/resource.ts
export const RESOURCE_STATES = ['ACTIVE', 'ARCHIVED', 'DELETED'] as const;
export type ResourceState = typeof RESOURCE_STATES[number];
```

---

## 今後の作業

### 即座に必要
1. ✅ Prismaマイグレーションの作成と適用
2. ✅ 型定義ファイルの作成
3. ⚠️ API実装の更新（category値、themeIds→metaNoteThemes）
4. ⚠️ フロントエンドのカテゴリ表示更新

### 将来的に検討
1. RLS（Row Level Security）の導入
2. ARCHIVED状態の活用（アーカイブ機能UI）
3. 状態遷移の制約追加（例: DELETED→ACTIVEを禁止）
4. 監査ログテーブルの追加（state変更履歴）

---

## 破壊的変更の確認

### データ互換性
- ❌ 既存のcategory値（日本語）は使用不可 → マイグレーション必須
- ❌ themeIds配列は削除 → 中間テーブルへの移行必須
- ✅ UUIDv7は互換性あり（生成方法の変更のみ）

### API互換性
- ⚠️ `POST /notes` のリクエストボディ: `category`の値が変更
- ⚠️ レスポンスの`themeIds`フィールドが変更される可能性

### 運用互換性
- ⚠️ PostgreSQL 16→17への移行が必要
- ⚠️ 既存のDocker Volumeデータは手動マイグレーション必要

---

## チェックリスト

- [x] Prismaスキーマ更新
- [x] DB設計書更新
- [x] Docker構成更新
- [x] Prisma Client Extensions実装
- [ ] マイグレーションSQLの作成
- [ ] 型定義ファイルの作成
- [ ] API実装の更新
- [ ] フロントエンド実装の更新
- [ ] テストの更新

---

以上がv0.1からv0.2への主な変更内容です。
