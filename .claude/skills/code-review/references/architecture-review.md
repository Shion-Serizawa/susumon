# Architecture Review Reference

Architectural principles and patterns for code reviews.

## 1. SOLID Principles

### 1.1 Single Responsibility Principle (SRP)
**Definition**: A module should have one, and only one, reason to change

**Review Pattern:**
```typescript
// ❌ BAD: Handler does everything
export const POST: RequestHandler = async ({ locals, request }) => {
  const body = await request.json();

  // Validation logic
  if (!body.name || body.name.length > 200) {
    return json({ error: 'Invalid name' }, { status: 400 });
  }

  // Business logic
  const theme = await prisma.theme.create({
    data: {
      userId: locals.user.id,
      name: body.name,
      goal: body.goal
    }
  });

  // Side effects
  await sendNotification(theme.id);
  await logAuditEvent('theme_created', theme.id);

  return json(theme, { status: 201 });
};

// ✅ GOOD: Separated responsibilities
export const POST: RequestHandler = async ({ locals, request }) => {
  // 1. Authentication (SvelteKit hooks)
  if (!locals.user) {
    return json({ error: { code: 'Unauthorized' } }, { status: 401 });
  }

  // 2. Validation (shared utility)
  const body = await request.json();
  const validationResult = validateThemeCreate(body);
  if (validationResult.error) {
    return json(validationResult.error, { status: 400 });
  }

  // 3. Business logic (service layer)
  const theme = await themeService.createTheme({
    userId: locals.user.id,
    ...validationResult.data
  });

  return json(theme, { status: 201 });
};
```

**Check:**
- [ ] Handlers only do: auth check, validation, service call
- [ ] Services only do: business logic, DB operations
- [ ] Utilities only do: one specific task

### 1.2 Open/Closed Principle (OCP)
**Definition**: Open for extension, closed for modification

**Example:**
```typescript
// ✅ GOOD: Strategy pattern for extensibility
interface ExportStrategy {
  export(data: any[]): string;
}

class CsvExportStrategy implements ExportStrategy {
  export(data: any[]): string {
    // CSV export logic
  }
}

class JsonExportStrategy implements ExportStrategy {
  export(data: any[]): string {
    return JSON.stringify(data);
  }
}

// Add new formats without modifying existing code
class ExportService {
  constructor(private strategy: ExportStrategy) {}

  exportData(data: any[]): string {
    return this.strategy.export(data);
  }
}
```

### 1.3 Dependency Inversion Principle (DIP)
**Definition**: Depend on abstractions, not concretions

**Review Pattern:**
```typescript
// ❌ BAD: Direct dependency on Prisma
class ThemeService {
  async createTheme(data: ThemeData) {
    return prisma.theme.create({ data }); // Tight coupling
  }
}

// ✅ BETTER: Interface-based dependency
interface ThemeRepository {
  create(data: ThemeData): Promise<Theme>;
  findById(id: string): Promise<Theme | null>;
}

class PrismaThemeRepository implements ThemeRepository {
  async create(data: ThemeData) {
    return prisma.theme.create({ data });
  }

  async findById(id: string) {
    return prisma.theme.findFirst({ where: { id } });
  }
}

class ThemeService {
  constructor(private repo: ThemeRepository) {}

  async createTheme(data: ThemeData) {
    return this.repo.create(data);
  }
}
```

**Note**: For Susumon v0.2, direct Prisma usage is acceptable for simplicity. Consider abstractions if:
- Multiple data sources needed
- Testing requires extensive mocking
- Business logic becomes complex

## 2. Layered Architecture

### 2.1 Layer Responsibilities

**Presentation Layer** (Routes/Handlers):
- HTTP request/response handling
- Authentication check
- Input validation
- Call service layer
- Return formatted response

**Service Layer** (Business Logic):
- Domain operations
- Business rule enforcement
- Transaction management
- Call data layer

**Data Layer** (Prisma):
- Database queries
- Data transformation
- Relationship loading

**Review Pattern:**
```typescript
// ✅ CORRECT: Layered structure
// Handler (+server.ts)
export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const validation = validateThemeCreate(body);
  if (validation.error) return json(validation.error, { status: 400 });

  const theme = await themeService.createTheme({
    userId: locals.user.id,
    ...validation.data
  });

  return json(theme, { status: 201 });
};

// Service (theme.service.ts)
class ThemeService {
  async createTheme(data: CreateThemeData): Promise<Theme> {
    // Business logic here
    return prisma.theme.create({ data });
  }
}
```

**Check:**
- [ ] No DB queries in handlers
- [ ] No HTTP concerns in services
- [ ] Clear separation of concerns

### 2.2 Dependency Direction
**Rule**: Dependencies flow downward (Presentation → Service → Data)

```
┌─────────────────┐
│    Handlers     │ (HTTP, validation)
└────────┬────────┘
         │ depends on
         ▼
┌─────────────────┐
│    Services     │ (Business logic)
└────────┬────────┘
         │ depends on
         ▼
┌─────────────────┐
│  Data Layer     │ (Prisma)
└─────────────────┘
```

**Anti-Pattern:**
```typescript
// ❌ BAD: Service depends on handler
class ThemeService {
  async createTheme(request: Request) { // Handler concern leaking in
    const body = await request.json();
    // ...
  }
}
```

## 3. Service Layer Pattern

### 3.1 Service Structure
**Template:**
```typescript
export class ThemeService {
  /**
   * List themes with pagination
   */
  async listThemes(params: ListThemesParams): Promise<PaginatedResponse<Theme>> {
    // Build query
    const where = this.buildWhereClause(params);

    // Execute query
    const themes = await prisma.theme.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: params.limit + 1
    });

    // Build response
    return buildPaginatedResponse(themes, params.limit, (t) => ({
      createdAt: t.createdAt.toISOString(),
      id: t.id
    }));
  }

  /**
   * Helper: Build where clause
   */
  private buildWhereClause(params: ListThemesParams): Prisma.ThemeWhereInput {
    const where: Prisma.ThemeWhereInput = {
      userId: params.userId
    };

    if (!params.includeArchived) {
      where.state = 'ACTIVE';
    }

    if (!params.includeCompleted) {
      where.isCompleted = false;
    }

    return where;
  }
}

// Singleton export
export const themeService = new ThemeService();
```

**Check:**
- [ ] Service methods are focused and cohesive
- [ ] Private helpers extract complexity
- [ ] Service is exported as singleton
- [ ] Type-safe parameters and returns

### 3.2 Transaction Management
**Rule**: Services manage transactions, not handlers

**Pattern:**
```typescript
class ThemeService {
  /**
   * Delete theme and cascade to related resources
   */
  async deleteThemeById(params: { userId: string; themeId: string }): Promise<boolean> {
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // Delete theme
      const themeUpdate = await tx.theme.updateMany({
        where: { userId: params.userId, id: params.themeId, state: { not: 'DELETED' } },
        data: { state: 'DELETED', stateChangedAt: now }
      });

      if (themeUpdate.count === 0) {
        return { deleted: false };
      }

      // Cascade delete logs
      await tx.learningLogEntry.updateMany({
        where: { userId: params.userId, themeId: params.themeId },
        data: { state: 'DELETED', stateChangedAt: now }
      });

      // Cascade delete notes
      await tx.metaNote.updateMany({
        where: {
          userId: params.userId,
          metaNoteThemes: { some: { themeId: params.themeId } }
        },
        data: { state: 'DELETED', stateChangedAt: now }
      });

      return { deleted: true };
    });

    return result.deleted;
  }
}
```

**Check:**
- [ ] Multi-table operations use transactions
- [ ] Transaction scope is minimal
- [ ] No external I/O inside transactions
- [ ] Error handling preserves atomicity

## 4. Code Organization

### 4.1 File Structure
**Susumon v0.2 Structure:**
```
src/
├── lib/
│   ├── server/
│   │   ├── services/          # Business logic
│   │   │   ├── theme.service.ts
│   │   │   ├── log.service.ts
│   │   │   └── note.service.ts
│   │   ├── db.ts              # Prisma client
│   │   ├── api-types.ts       # Shared types
│   │   ├── validation.ts      # Validators
│   │   └── pagination.ts      # Pagination utils
│   └── types/                 # Frontend types
├── routes/
│   ├── api/                   # API endpoints
│   │   ├── themes/+server.ts
│   │   ├── logs/+server.ts
│   │   └── notes/+server.ts
│   └── app/                   # UI pages
└── tests/                     # Tests
```

**Check:**
- [ ] Related code is colocated
- [ ] Shared utilities are extracted
- [ ] Clear separation of client/server code

### 4.2 Module Coupling
**Principle**: Loose coupling, high cohesion

**Metrics:**
- **Coupling**: Number of dependencies
- **Cohesion**: How related responsibilities are

**Good:**
- Service depends on: Prisma, shared types
- Handler depends on: Service, validation, types

**Bad:**
- Service depends on: Handler, HTTP libs
- Circular dependencies

### 4.3 Shared Libraries
**Susumon Pattern:**

**Validation** (`src/lib/server/validation.ts`):
```typescript
export function validateLimit(limitParam: string | null): ValidationResult<number> {
  const limit = parseInt(limitParam ?? '50');
  if (isNaN(limit) || limit < 1 || limit > 200) {
    return { error: { error: { code: 'BadRequest', message: 'Invalid limit' } } };
  }
  return { value: limit };
}
```

**Pagination** (`src/lib/server/pagination.ts`):
```typescript
export function buildPaginatedResponse<T, C>(
  items: T[],
  limit: number,
  getCursor: (item: T) => C
): PaginatedResponse<T> {
  const hasMore = items.length > limit;
  const results = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore
    ? btoa(JSON.stringify(getCursor(results[limit - 1])))
    : null;

  return { items: results, nextCursor };
}
```

**Check:**
- [ ] Utilities are reusable across services
- [ ] No business logic in utilities
- [ ] Clear, focused responsibilities

## 5. State Management

### 5.1 State Machine (v0.2)
**Susumon State Transitions:**
```
ACTIVE ──────────┐
  ↑              │
  │              ↓
  └────── ARCHIVED ──→ DELETED
                       (final)
```

**Review Pattern:**
```typescript
// ✅ State transition validation
async archiveTheme(themeId: string): Promise<Theme | null> {
  return prisma.theme.updateMany({
    where: {
      id: themeId,
      state: 'ACTIVE' // Only ACTIVE → ARCHIVED
    },
    data: {
      state: 'ARCHIVED',
      stateChangedAt: new Date()
    }
  });
}

async deleteTheme(themeId: string): Promise<boolean> {
  const result = await prisma.theme.updateMany({
    where: {
      id: themeId,
      state: { not: 'DELETED' } // ACTIVE/ARCHIVED → DELETED
    },
    data: {
      state: 'DELETED',
      stateChangedAt: new Date()
    }
  });

  return result.count > 0;
}
```

**Check:**
- [ ] State transitions are validated
- [ ] `stateChangedAt` is updated
- [ ] Invalid transitions are rejected
- [ ] Final states (DELETED) are terminal

## 6. Error Handling Architecture

### 6.1 Error Propagation
**Pattern:**
```typescript
// Service layer: Throw domain errors
class ThemeService {
  async getThemeById(params: GetThemeParams): Promise<Theme> {
    const theme = await prisma.theme.findFirst({
      where: { userId: params.userId, id: params.themeId }
    });

    if (!theme) {
      throw new NotFoundError('Theme not found');
    }

    return theme;
  }
}

// Handler layer: Catch and convert to HTTP responses
export const GET: RequestHandler = async ({ locals, params }) => {
  try {
    const theme = await themeService.getThemeById({
      userId: locals.user.id,
      themeId: params.id
    });
    return json(theme);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return json({ error: { code: 'NotFound', message: error.message } }, { status: 404 });
    }
    throw error; // Let SvelteKit handle unexpected errors
  }
};
```

### 6.2 Error Consistency
**Check:**
- [ ] All 4xx/5xx use standard format
- [ ] Error codes are consistent
- [ ] Messages are user-friendly
- [ ] Internal errors are logged

## 7. References

- SOLID Principles: https://en.wikipedia.org/wiki/SOLID
- Clean Architecture: https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html
- Service Layer Pattern: https://martinfowler.com/eaaCatalog/serviceLayer.html
- Project Structure: `CLAUDE.md` Key Directories
- Service Example: `src/lib/server/services/theme.service.ts`
