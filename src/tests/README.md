# 自動テストガイド

## テストの実行

```bash
# すべてのテストを実行
deno task test:unit

# ウォッチモードで実行（ファイル変更を監視）
deno run -A npm:vitest@4 --config vitest.config.ts

# 特定のテストファイルのみ実行
deno run -A npm:vitest@4 --config vitest.config.ts src/tests/api/themes/get.test.ts
```

## テスト構成

### ディレクトリ構造

```
src/tests/
├── api/
│   └── themes/
│       └── get.test.ts       # GET /api/themes のテスト
└── README.md                  # このファイル
```

### テストユーティリティ

`src/lib/server/test-utils.ts`には以下のヘルパーがあります:

- `mockUser` - テスト用のモックユーザー
- `mockUser2` - ユーザー分離テスト用の2人目のモックユーザー
- `cleanupDatabase()` - テストデータベースをクリーンアップ
- `createTestTheme()` - テスト用のテーマを作成

### テスト作成例

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GET } from '../../../routes/api/themes/+server';
import { cleanupDatabase, mockUser, createTestTheme } from '$lib/server/test-utils';

describe('GET /api/themes', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  it('should return themes for authenticated user', async () => {
    // Arrange
    await createTestTheme(mockUser.id, {
      name: 'TypeScript学習',
      goal: 'TypeScriptの基礎を習得する'
    });

    const event = {
      request: new Request('http://localhost:5173/api/themes'),
      locals: { user: mockUser },
      url: new URL('http://localhost:5173/api/themes'),
      params: {},
      route: { id: '/api/themes' }
    } as any;

    // Act
    const response = await GET(event);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].name).toBe('TypeScript学習');
  });
});
```

## テストのベストプラクティス

### 1. テストの分離

各テストは独立して実行できるようにする:

```typescript
beforeEach(async () => {
  await cleanupDatabase(); // テスト前にクリーンアップ
});

afterEach(async () => {
  await cleanupDatabase(); // テスト後にクリーンアップ
});
```

### 2. ユーザースコープのテスト

必ずユーザー分離をテストする:

```typescript
it('should only return themes for the authenticated user', async () => {
  await createTestTheme(mockUser.id, { name: 'User1 Theme', goal: 'Goal' });
  await createTestTheme(mockUser2.id, { name: 'User2 Theme', goal: 'Goal' });

  const event = {
    locals: { user: mockUser }, // mockUserとしてアクセス
    // ...
  };

  const response = await GET(event);
  const body = await response.json();

  expect(body.items).toHaveLength(1); // mockUserのテーマのみ
  expect(body.items[0].name).toBe('User1 Theme');
});
```

### 3. エラーケースのテスト

正常系だけでなく、エラーケースもテストする:

```typescript
it('should return 401 when user is not authenticated', async () => {
  const event = {
    locals: {}, // userなし
    // ...
  };

  const response = await GET(event);
  const body = await response.json();

  expect(response.status).toBe(401);
  expect(body.error.code).toBe('Unauthorized');
});

it('should validate limit parameter', async () => {
  const event = {
    locals: { user: mockUser },
    url: new URL('http://localhost:5173/api/themes?limit=300'), // 範囲外
    // ...
  };

  const response = await GET(event);
  const body = await response.json();

  expect(response.status).toBe(400);
  expect(body.error.message).toContain('limit must be between 1 and 200');
});
```

### 4. AAA パターン

テストは Arrange-Act-Assert パターンで書く:

```typescript
it('should do something', async () => {
  // Arrange: テストデータの準備
  await createTestTheme(mockUser.id, { name: 'Test', goal: 'Goal' });
  const event = { /* ... */ };

  // Act: テスト対象の実行
  const response = await GET(event);
  const body = await response.json();

  // Assert: 結果の検証
  expect(response.status).toBe(200);
  expect(body.items).toHaveLength(1);
});
```

## 既知の制約事項

### Prisma Client Extensions

テストでは`createTestTheme`などのヘルパー関数が**Raw SQL**を使用してPrisma Client Extensionsのセキュリティガードをバイパスします。これは意図的な設計です:

- テストデータ作成時にセキュリティガードがあると不便
- 実際のAPI呼び出しではPrisma Client Extensionsが正しく機能する

### SvelteKitの制約

- テストファイルは`src/routes/`内に置けません（`+`で始まるファイル名が予約されているため）
- テストは`src/tests/`ディレクトリに配置する必要があります

## 次のステップ

1. **POST /api/themes のテスト追加**
   - テーマ作成の正常系
   - バリデーションエラー
   - 一意制約違反

2. **その他のエンドポイントのテスト**
   - GET /api/themes/[id]
   - PATCH /api/themes/[id]
   - DELETE /api/themes/[id]
   - Log API
   - Note API

3. **カバレッジレポート**
   ```bash
   deno run -A npm:vitest@4 --config vitest.config.ts --coverage
   ```

## トラブルシューティング

### データベース接続エラー

PostgreSQLコンテナが起動しているか確認:

```bash
docker compose ps
```

起動していない場合:

```bash
docker compose up -d postgres
```

### テストが失敗する

1. データベースをクリーンアップ:
   ```bash
   docker compose down -v
   docker compose up -d postgres
   deno task db:migrate:deploy
   ```

2. Prisma Clientを再生成:
   ```bash
   deno task db:generate
   ```

### インポートエラー

`$lib`エイリアスが解決されない場合、`vitest.config.ts`を確認:

```typescript
resolve: {
  alias: {
    $lib: path.resolve('./src/lib')
  }
}
```
