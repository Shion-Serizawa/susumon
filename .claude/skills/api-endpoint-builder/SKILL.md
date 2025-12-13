---
name: api-endpoint-builder
description: Build SvelteKit API endpoints (+server.ts) following project conventions. Use when creating or modifying backend API routes.
allowed-tools: [Read, Write, Edit, Grep, Bash]
---

# API Endpoint Builder Skill

## When to Activate
- User requests to create a new API endpoint
- User asks to implement REST operations (GET/POST/PATCH/DELETE)
- User mentions "API route" or "+server.ts"

## Process

### 1. Understand Requirements
- Check OpenAPI spec: `docs/spec/learning_log_meta_note_アプリ_技術仕様（final_v_0.md:69`
- Review existing patterns in `src/routes/api/`
- Confirm HTTP method, path, request/response schema

### 2. Implement Endpoint Structure

**Template** (`src/routes/api/[resource]/+server.ts`):

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/db';
import { uuidv7 } from 'npm:uuidv7@1';

// GET /api/resource
export const GET: RequestHandler = async ({ locals, url }) => {
  // 1. Authentication check
  if (!locals.user) {
    return json(
      { error: { code: 'Unauthorized', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  // 2. Parse query parameters
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200);
  const cursor = url.searchParams.get('cursor');

  // 3. Query with user_id scope (MUST)
  const items = await prisma.resource.findMany({
    where: { userId: locals.user.id },
    take: limit + 1,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    // Add cursor logic here
  });

  // 4. Pagination logic
  const hasMore = items.length > limit;
  const results = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore
    ? btoa(JSON.stringify({
        createdAt: results[limit - 1].createdAt,
        id: results[limit - 1].id
      }))
    : null;

  return json({ items: results, nextCursor });
};

// POST /api/resource
export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) {
    return json(
      { error: { code: 'Unauthorized', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  const body = await request.json();

  // Validation (use Zod or manual)
  if (!body.requiredField) {
    return json(
      { error: { code: 'BadRequest', message: 'requiredField is required' } },
      { status: 400 }
    );
  }

  try {
    const created = await prisma.resource.create({
      data: {
        id: uuidv7(), // MUST: Generate UUID v7 app-side
        ...body,
        userId: locals.user.id, // MUST: Always set userId
      },
    });

    return json(created, { status: 201 });
  } catch (error) {
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return json(
        { error: { code: 'Conflict', message: 'Resource already exists' } },
        { status: 409 }
      );
    }
    throw error;
  }
};
```

### 3. Critical Checks

✅ **MUST**:
- [ ] `locals.user` 認証チェック
- [ ] `userId: locals.user.id` でスコープ制限
- [ ] `id: uuidv7()` を明示的に生成（Prisma は UUID v7 を自動生成しない）
- [ ] エラーレスポンスは統一フォーマット `{ error: { code, message } }`
- [ ] Pagination は cursor 方式（GET 一覧系）
- [ ] 適切な HTTP ステータスコード（200, 201, 400, 401, 404, 409）

✅ **SHOULD**:
- [ ] リクエストボディのバリデーション
- [ ] 一意制約違反 (P2002) のハンドリング
- [ ] 外部キー制約違反 (P2003) のハンドリング

### 4. Testing

```typescript
// Example test structure (place in src/routes/api/[resource]/+server.test.ts)
import { describe, it, expect } from 'vitest';

describe('GET /api/resource', () => {
  it('returns 401 if not authenticated', async () => {
    // Test implementation
  });

  it('returns user-scoped resources', async () => {
    // Test implementation
  });

  it('handles pagination correctly', async () => {
    // Test implementation
  });
});
```

## Common Patterns

### Pagination Cursor Decoding
```typescript
let whereClause = { userId: locals.user.id };

if (cursor) {
  const { createdAt, id } = JSON.parse(atob(cursor));
  whereClause = {
    ...whereClause,
    OR: [
      { createdAt: { gt: createdAt } },
      { createdAt: createdAt, id: { gt: id } }
    ]
  };
}
```

### Date Handling (JST Local Date)
```typescript
// For LearningLogEntry.date or MetaNote.noteDate
const jstDate = new Date().toLocaleDateString('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).replace(/\//g, '-'); // "2025-01-15"
```

## UUID v7 Generation

**IMPORTANT**: Prisma does NOT auto-generate UUID v7. You MUST generate it app-side.

```typescript
import { uuidv7 } from 'npm:uuidv7@1';

const newResource = await prisma.resource.create({
  data: {
    id: uuidv7(), // Required!
    userId: locals.user.id,
    // ... other fields
  },
});
```

## References

- OpenAPI Spec: `docs/spec/learning_log_meta_note_アプリ_技術仕様（final_v_0.md:69`
- Pagination Details: `docs/spec/learning_log_meta_note_アプリ_技術仕様（final_v_0.md:759`
- Error Handling: `docs/spec/learning_log_meta_note_アプリ_技術仕様（final_v_0.md:32`
- Deno Deploy + SvelteKit Guide: `docs/tech/deno_deploy_sveltekit_注意点_2025.md`
