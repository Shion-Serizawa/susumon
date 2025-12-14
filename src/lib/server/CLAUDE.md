# Backend - SvelteKit + Deno Deploy + Prisma

**Scope**: `src/lib/server/`, `src/routes/api/`

型安全・セキュリティ・保守性・テスタビリティ重視。

---

## 1. Type Safety (TS)

### TS-1 (MUST): Strict Mode
- `strict: true`, `noImplicitAny: true`
- **`any` 禁止** → `unknown` + narrowing
- Generics/Union/Utility types活用

### TS-2 (MUST): Prisma Generated Types
```typescript
import type { Prisma, Theme } from '@prisma/client';
async function createTheme(data: Prisma.ThemeCreateInput): Promise<Theme> {
  return prisma.theme.create({ data });
}
```

### TS-3 (MUST): Explicit Return Types
```typescript
export async function getThemes(userId: string): Promise<Theme[]> {
  return prisma.theme.findMany({ where: { userId } });
}
```

### TS-4 (MUST): Runtime Validation (Zod)
```typescript
import { z } from 'zod';
const CreateThemeSchema = z.object({
  name: z.string().min(1).max(100),
  goal: z.string().min(1),
});
const validated = CreateThemeSchema.parse(body);
```

---

## 2. Architecture (CQ)

### CQ-1 (SHOULD): SRP
- 1モジュール = 1責務

### CQ-2 (SHOULD): DIP
```typescript
interface IThemeRepository {
  findById(id: string, userId: string): Promise<Theme | null>;
}
class ThemeService {
  constructor(private repo: IThemeRepository) {}
}
```

### CQ-3 (SHOULD): Layer Separation
```
src/lib/server/
├── domain/       # Pure logic (no I/O)
├── repositories/ # Prisma queries
├── services/     # Use cases
└── auth/

src/routes/api/   # HTTP controllers
```

### CQ-4 (MUST): Naming
- Files: `kebab-case.ts`
- Vars/Funcs: `camelCase`
- Classes/Types: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- API JSON: `camelCase`

---

## 3. API Design (REST)

### API-1 (MUST): Resource URIs
```
GET    /api/themes
POST   /api/themes
GET    /api/themes/:id
PATCH  /api/themes/:id
DELETE /api/themes/:id
```

### API-2 (MUST): HTTP Status
- 200 OK, 201 Created, 204 No Content
- 400 Bad Request, 401 Unauthorized, 403 Forbidden
- 404 Not Found, 409 Conflict, 422 Unprocessable
- 500 Internal Server Error

### API-3 (MUST): Error Format
```typescript
return json({
  error: { code: 'VALIDATION_ERROR', message: '...', details: {...} }
}, { status: 400 });
```

### API-4 (MUST): Content-Type
- POST/PUT/PATCH: `application/json` 必須
- 415 for invalid Content-Type

### API-5 (MUST): Cursor Pagination
```typescript
const cursor = url.searchParams.get('cursor');
const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 200);
const decoded = cursor ? JSON.parse(atob(cursor)) : null;

const items = await prisma.theme.findMany({
  where: {
    userId,
    ...(decoded && {
      OR: [
        { createdAt: { gt: decoded.createdAt } },
        { createdAt: decoded.createdAt, id: { gt: decoded.id } }
      ]
    })
  },
  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  take: limit + 1
});

const hasMore = items.length > limit;
const data = hasMore ? items.slice(0, -1) : items;
const nextCursor = hasMore
  ? btoa(JSON.stringify({ createdAt: data[data.length - 1].createdAt, id: data[data.length - 1].id }))
  : null;

return json({ items: data, nextCursor });
```

---

## 4. Security (SEC)

### SEC-1 (MUST): User Scoping
**全クエリで `userId` フィルタ必須**

```typescript
// ✅ CRITICAL
const themes = await prisma.theme.findMany({ where: { userId: locals.user.id } });

// ❌ NEVER (cross-user leak)
const themes = await prisma.theme.findMany();
```

### SEC-2 (MUST): Validate All Inputs
```typescript
const ParamsSchema = z.object({ id: z.string().uuid() });
const params = ParamsSchema.parse({ id: request.params.id });
```

### SEC-3 (MUST): Secure Sessions (Supabase)
- HttpOnly cookies (not localStorage)
- `SameSite=Lax`, `Secure=true`
- PKCE flow (`@supabase/ssr`)
- `getUser()` for verification

```typescript
// hooks.server.ts
export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('sb-access-token');
  if (token) {
    const { data: { user } } = await supabase.auth.getUser(token);
    event.locals.user = user;
  }
  return resolve(event);
};
```

### SEC-4 (MUST): Sanitize Errors
```typescript
// ❌ return json({ error: `User ${userId} not found` });
// ✅ return json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
```

### SEC-5 (MUST): Auth Guard
```typescript
export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ error: { code: 'UNAUTHORIZED', message: 'Auth required' } }, { status: 401 });
  }
  // ... use locals.user.id
};
```

---

## 5. Database (Prisma)

### DB-1 (MUST): Generated Types
```typescript
import type { Prisma } from '@prisma/client';
async function createTheme(data: Prisma.ThemeCreateInput) {}
```

### DB-2 (MUST): Prevent N+1
```typescript
// ✅ Single query
const logs = await prisma.learningLogEntry.findMany({
  include: { theme: true },
  relationLoadStrategy: 'join'
});
```

### DB-3 (SHOULD): Transactions
```typescript
await prisma.$transaction([
  prisma.theme.update({ where: { id }, data: { isCompleted: true } }),
  prisma.learningLogEntry.deleteMany({ where: { themeId: id } })
]);
```

### DB-4 (SHOULD): Selective Fields
```typescript
const themes = await prisma.theme.findMany({
  select: { id: true, name: true, createdAt: true }
});
```

### DB-5 (MUST): Index
```prisma
@@index([userId, createdAt])
@@unique([userId, themeId, date])
```

### DB-6 (MUST): UUIDv7
```typescript
import { uuidv7 } from 'npm:uuidv7@1';
const theme = await prisma.theme.create({
  data: { id: uuidv7(), userId, name: 'Test', goal: 'Learn' }
});
```

---

## 6. Error Handling (ERR)

### ERR-1 (MUST): Centralized Handler
```typescript
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) { super(message); }
}

export function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return json({ error: { code: error.code, message: error.message } }, { status: error.statusCode });
  }
  console.error('Unexpected:', error);
  return json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' } }, { status: 500 });
}
```

### ERR-2 (MUST): Prisma Errors
```typescript
import { Prisma } from '@prisma/client';
if (error instanceof Prisma.PrismaClientKnownRequestError) {
  if (error.code === 'P2002') return json({ error: { code: 'DUPLICATE' } }, { status: 409 });
  if (error.code === 'P2025') return json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
}
```

### ERR-3 (SHOULD): Structured Logging
```typescript
console.error(JSON.stringify({
  timestamp: new Date().toISOString(),
  userId: locals.user?.id,
  path: request.url,
  error: error.message
}));
```

---

## 7. Testing (TEST)

### TEST-1 (MUST): Three Layers
1. Unit (Vitest)
2. Integration (Vitest)
3. E2E (Playwright)

Coverage: 80%+ for business logic

### TEST-2 (MUST): Error Scenarios
- 400, 401, 404, 409
- Unique/FK violations

### TEST-3 (SHOULD): DB Isolation
```typescript
beforeEach(async () => { await prisma.$executeRaw`BEGIN`; });
afterEach(async () => { await prisma.$executeRaw`ROLLBACK`; });
```

---

## 8. SvelteKit Patterns

### SK-1 (MUST): Type-Safe Routes
```typescript
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) return json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  const themes = await prisma.theme.findMany({ where: { userId: locals.user.id } });
  return json({ items: themes });
};
```

### SK-2 (MUST): locals for User
```typescript
// src/app.d.ts
declare global {
  namespace App {
    interface Locals {
      user: { id: string; email: string } | null;
    }
  }
}
```

---

## 9. Performance (PERF)

### PERF-1 (SHOULD): Query Performance
- Target: <100ms per query
- Monitor with Prisma Optimize

### PERF-2 (SHOULD): Caching
- DB: Prisma Accelerate
- App: Deno KV
- CDN: Deno Deploy edge

### PERF-3 (SHOULD): Selective Includes
```typescript
// ✅ Only needed
const logs = await prisma.learningLogEntry.findMany({ include: { theme: true } });
```

---

## Common Pitfalls

### PITFALL-1: Missing User Scoping
**Code review**: "Every query filters by `userId`?"

### PITFALL-2: Trusting Client IDs
Always use `locals.user.id` (never from request body)

### PITFALL-3: N+1 Queries
Use `include` or `relationLoadStrategy: 'join'`

### PITFALL-4: localStorage for Tokens
HttpOnly cookies only (XSS防止)

---

## Metrics

- Query: <100ms avg
- API: <200ms (p95)
- Error: <0.1%
- Coverage: >80%
- Uptime: 99.9%

---

**Version**: v0.1 (2025-01-XX)
