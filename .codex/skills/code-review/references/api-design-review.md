# API Design Review Reference

REST API design principles and conventions for code reviews.

## 1. REST Principles

### 1.1 Resource Naming
**Rules:**
- Use nouns, not verbs
- Use plural for collections
- Use lowercase with hyphens (kebab-case)

**Examples:**
```
✅ GOOD:
GET    /api/themes
POST   /api/themes
GET    /api/themes/{id}
PATCH  /api/themes/{id}
DELETE /api/themes/{id}

GET    /api/learning-logs
POST   /api/learning-logs

❌ BAD:
GET    /api/getThemes
POST   /api/createTheme
GET    /api/theme/{id}  (singular)
GET    /api/Themes      (uppercase)
```

**Susumon Resources:**
- `/api/themes` - テーマ
- `/api/logs` - ラーニングログ (not learning-logs for brevity)
- `/api/notes` - メタノート

### 1.2 HTTP Method Semantics
**GET** - Retrieve resource(s)
- Idempotent: ✅
- Safe: ✅ (no side effects)
- Cacheable: ✅
- Request body: ❌

**POST** - Create new resource
- Idempotent: ❌
- Safe: ❌
- Cacheable: ❌
- Request body: ✅
- Success status: 201 Created

**PATCH** - Partial update
- Idempotent: ✅ (in practice)
- Safe: ❌
- Request body: ✅
- Success status: 200 OK

**DELETE** - Remove resource
- Idempotent: ✅
- Safe: ❌
- Success status: 200 OK or 204 No Content

**Review Checklist:**
- [ ] GET has no side effects
- [ ] POST returns 201 with created resource
- [ ] PATCH accepts partial updates
- [ ] DELETE is idempotent
- [ ] Methods match semantic meaning

### 1.3 Status Code Consistency
**2xx Success:**
- 200 OK - GET, PATCH, DELETE success
- 201 Created - POST success (include Location header)
- 204 No Content - DELETE success (no body)

**4xx Client Errors:**
- 400 Bad Request - Invalid input, validation failure
- 401 Unauthorized - Authentication required or failed
- 403 Forbidden - Authenticated but insufficient permissions
- 404 Not Found - Resource doesn't exist
- 409 Conflict - Unique constraint violation
- 422 Unprocessable Entity - Business rule violation

**5xx Server Errors:**
- 500 Internal Server Error - Unexpected server error

**Susumon Pattern:**
```typescript
// 200 OK
return json({ items: themes, nextCursor });

// 201 Created
return json(createdTheme, { status: 201 });

// 400 Bad Request
return json(
  { error: { code: 'BadRequest', message: 'Invalid input' } },
  { status: 400 }
);

// 401 Unauthorized
return json(
  { error: { code: 'Unauthorized', message: 'Authentication required' } },
  { status: 401 }
);

// 404 Not Found
return json(
  { error: { code: 'NotFound', message: 'Theme not found' } },
  { status: 404 }
);

// 409 Conflict
return json(
  { error: { code: 'Conflict', message: 'Theme already exists for this date' } },
  { status: 409 }
);

// 500 Internal Server Error
return json(
  { error: { code: 'InternalServerError', message: 'Database error' } },
  { status: 500 }
);
```

## 2. Request/Response Design

### 2.1 Request Format
**Query Parameters** (GET):
```typescript
// Filtering
GET /api/themes?includeCompleted=true&includeArchived=false

// Pagination
GET /api/themes?limit=50&cursor=eyJjcmVhdGVkQXQiOiIuLi4ifQ==

// Sorting (if needed)
GET /api/logs?sortBy=date&order=desc
```

**Request Body** (POST/PATCH):
```json
{
  "name": "TypeScript Learning",
  "goal": "Master advanced types",
  "shortName": "TS",
  "isCompleted": false
}
```

**Review Checklist:**
- [ ] Query params use camelCase
- [ ] Required fields are documented
- [ ] Optional fields have defaults
- [ ] Date formats are consistent (YYYY-MM-DD)

### 2.2 Response Format
**Single Resource:**
```json
{
  "id": "01933e7a-8b2c-7890-a123-0242ac120002",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "TypeScript Learning",
  "goal": "Master advanced types",
  "shortName": "TS",
  "isCompleted": false,
  "state": "ACTIVE",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z",
  "stateChangedAt": "2025-01-15T10:30:00Z"
}
```

**Collection with Pagination:**
```json
{
  "items": [
    { "id": "...", "name": "..." },
    { "id": "...", "name": "..." }
  ],
  "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI1LTAxLTE1VDEwOjMwOjAwWiIsImlkIjoiMDE5MzNlN2EtOGIyYy03ODkwLWExMjMtMDI0MmFjMTIwMDAyIn0="
}
```

**Error Response:**
```json
{
  "error": {
    "code": "BadRequest",
    "message": "Theme name is required",
    "details": {
      "field": "name",
      "constraint": "required"
    }
  }
}
```

**Review Checklist:**
- [ ] Response shape matches OpenAPI spec
- [ ] Dates are ISO 8601 format (RFC 3339)
- [ ] UUIDs are lowercase with hyphens
- [ ] Enums use consistent casing

### 2.3 Pagination Design
**Cursor-Based** (Susumon v0.2):
```typescript
// Request
GET /api/themes?limit=50&cursor=<opaque-token>

// Response
{
  "items": [...],
  "nextCursor": "eyJ..." // null if no more
}

// Cursor format (Base64 JSON)
{
  "createdAt": "2025-01-15T10:30:00.000Z",
  "id": "01933e7a-8b2c-7890-a123-0242ac120002"
}
```

**Implementation Pattern:**
```typescript
// Decode cursor
const cursorData = cursorParam
  ? JSON.parse(atob(cursorParam))
  : null;

// Build where clause
const where: Prisma.ThemeWhereInput = {
  userId: params.userId
};

if (cursorData) {
  where.OR = [
    { createdAt: { gt: new Date(cursorData.createdAt) } },
    {
      createdAt: new Date(cursorData.createdAt),
      id: { gt: cursorData.id }
    }
  ];
}

// Fetch limit + 1 for hasMore check
const themes = await prisma.theme.findMany({
  where,
  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  take: params.limit + 1
});

// Build response
const hasMore = themes.length > params.limit;
const items = hasMore ? themes.slice(0, params.limit) : themes;
const nextCursor = hasMore
  ? btoa(JSON.stringify({
      createdAt: items[params.limit - 1].createdAt.toISOString(),
      id: items[params.limit - 1].id
    }))
  : null;

return { items, nextCursor };
```

**Review Checklist:**
- [ ] Cursor is opaque (Base64 encoded)
- [ ] Limit is validated (1-200)
- [ ] Default limit is reasonable (50)
- [ ] Sort order is stable (includes id)
- [ ] hasMore detection uses limit + 1

## 3. Error Response Design

### 3.1 Consistent Error Format
**Susumon Standard:**
```typescript
interface ErrorResponse {
  error: {
    code: string;        // Machine-readable
    message: string;     // Human-readable
    details?: unknown;   // Optional context
  };
}
```

**Error Codes:**
- `BadRequest` - Invalid input (400)
- `Unauthorized` - Auth required (401)
- `Forbidden` - Insufficient permissions (403)
- `NotFound` - Resource not found (404)
- `Conflict` - Unique constraint (409)
- `UnprocessableEntity` - Business rule (422)
- `InternalServerError` - Server error (500)

### 3.2 Error Context
**Good:**
```json
{
  "error": {
    "code": "BadRequest",
    "message": "Validation failed",
    "details": {
      "field": "name",
      "constraint": "maxLength",
      "maxLength": 200,
      "actual": 250
    }
  }
}
```

**Bad:**
```json
{
  "error": "Invalid input" // No structure, no context
}
```

### 3.3 Prisma Error Mapping
**Common Prisma Errors:**
```typescript
try {
  await prisma.theme.create({ data });
} catch (error) {
  // P2002: Unique constraint violation
  if (error.code === 'P2002') {
    return json(
      {
        error: {
          code: 'Conflict',
          message: 'Theme already exists',
          details: { fields: error.meta?.target }
        }
      },
      { status: 409 }
    );
  }

  // P2003: Foreign key constraint violation
  if (error.code === 'P2003') {
    return json(
      {
        error: {
          code: 'BadRequest',
          message: 'Invalid reference',
          details: { field: error.meta?.field_name }
        }
      },
      { status: 400 }
    );
  }

  // P2025: Record not found
  if (error.code === 'P2025') {
    return json(
      { error: { code: 'NotFound', message: 'Resource not found' } },
      { status: 404 }
    );
  }

  // Unexpected error
  console.error('[DB Error]', error);
  return json(
    { error: { code: 'InternalServerError', message: 'Database error' } },
    { status: 500 }
  );
}
```

## 4. API Versioning

### 4.1 Version Strategy (Future)
**Options:**
- URL Path: `/api/v1/themes`, `/api/v2/themes`
- Header: `Accept: application/vnd.susumon.v1+json`
- Query Param: `/api/themes?version=1`

**Susumon v0.2:**
- No versioning (initial version)
- Breaking changes avoided
- Additive changes only

### 4.2 Backward Compatibility
**Safe Changes:**
- ✅ Add new optional fields
- ✅ Add new endpoints
- ✅ Add new query parameters (optional)
- ✅ Add new error codes
- ✅ Relax validation rules

**Breaking Changes:**
- ❌ Remove fields
- ❌ Rename fields
- ❌ Change field types
- ❌ Make optional field required
- ❌ Change error response format

**Review Checklist:**
- [ ] New fields are optional
- [ ] Existing fields unchanged
- [ ] Response shape is consistent
- [ ] Error format is preserved

## 5. API Documentation

### 5.1 OpenAPI Compliance
**Check:**
- [ ] All endpoints documented in OpenAPI spec
- [ ] Request/response schemas defined
- [ ] Required fields marked
- [ ] Examples provided
- [ ] Error responses documented

**Location:**
`docs/spec/learning_log_meta_note_アプリ_技術仕様（final_v_0.md:69`

### 5.2 Code Comments
**Handler Documentation:**
```typescript
/**
 * GET /api/themes
 * テーマ一覧を取得
 *
 * Query Parameters:
 * - includeCompleted: boolean (default: false) - 完了済みテーマを含めるか
 * - limit: number (1-200, default: 50) - 取得件数
 * - cursor: string (optional) - ページネーションカーソル
 *
 * Response:
 * - 200: { items: Theme[], nextCursor: string | null }
 * - 401: Unauthorized
 * - 400: BadRequest
 * - 500: InternalServerError
 */
export const GET: RequestHandler = async ({ locals, url }) => {
  // Implementation
};
```

## 6. API Security

### 6.1 Authentication
**Check:**
- [ ] All endpoints require authentication (except public)
- [ ] `locals.user` is checked
- [ ] 401 returned if not authenticated

### 6.2 Authorization
**Check:**
- [ ] All queries include `userId` scope
- [ ] Cross-user access is prevented
- [ ] 403 returned if insufficient permissions

### 6.3 Input Validation
**Check:**
- [ ] All inputs are validated
- [ ] Validation happens before business logic
- [ ] Validation errors return 400
- [ ] Shared validators are used

## 7. Common API Anti-Patterns

### 7.1 Design Anti-Patterns
- ❌ Verbs in URLs (`/api/getThemes`)
- ❌ Inconsistent pluralization (`/api/theme`, `/api/notes`)
- ❌ Wrong HTTP methods (POST for retrieval)
- ❌ Missing status codes (always 200)
- ❌ Inconsistent error format

### 7.2 Implementation Anti-Patterns
- ❌ No pagination on lists
- ❌ Exposing internal IDs without scoping
- ❌ Missing validation
- ❌ Detailed errors in production
- ❌ No error logging

## 8. References

- REST API Best Practices: https://restfulapi.net/
- HTTP Status Codes: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
- OpenAPI Specification: https://swagger.io/specification/
- Project OpenAPI: `docs/spec/learning_log_meta_note_アプリ_技術仕様（final_v_0.md:69`
- Reference Implementation: `src/routes/api/themes/+server.ts`
