# Security Review Reference

Deep-dive security analysis for code reviews.

## 1. Authentication & Authorization

### 1.1 IDOR (Insecure Direct Object Reference)
**Critical**: Every resource access MUST be scoped to `userId`

**Check Pattern:**
```typescript
// ❌ CRITICAL: Missing userId scope
const theme = await prisma.theme.findFirst({
  where: { id: themeId }
});

// ✅ CORRECT: userId scope enforced
const theme = await prisma.theme.findFirst({
  where: {
    userId: locals.user.id,
    id: themeId
  }
});
```

**Automated Check:**
- Prisma Client Extensions (src/lib/server/db.ts) validates this
- Missing userId triggers SECURITY error

**Test Cases:**
```typescript
// Verify cross-user access prevention
it('prevents accessing other users resources', async () => {
  const user1Theme = await createTheme({ userId: 'user-1' });
  const response = await request
    .get(`/api/themes/${user1Theme.id}`)
    .set('Authorization', 'Bearer user-2-token');

  expect(response.status).toBe(404); // Not 200 or 403
});
```

### 1.2 Session Management
**Check Points:**
- HttpOnly: Prevents XSS token theft
- Secure: HTTPS-only transmission
- SameSite=Lax: CSRF mitigation

**Review Pattern:**
```typescript
// Check cookie settings in hooks.server.ts
const cookieOptions = {
  httpOnly: true,
  secure: true, // Must be true in production
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 7 // 7 days
};
```

### 1.3 CSRF Protection
**Scope**: State-changing operations (POST/PATCH/DELETE)

**SvelteKit Default:**
- CSRF protection is built-in for form submissions
- API calls require proper Origin/Referer headers

**Review Pattern:**
```typescript
// Verify CSRF token validation for critical operations
// In hooks.server.ts
if (request.method !== 'GET' && request.method !== 'HEAD') {
  // SvelteKit handles CSRF automatically
  // Verify origin matches expected domain
}
```

## 2. Input Validation

### 2.1 SQL/NoSQL Injection Prevention
**Rule**: Use Prisma's type-safe query builder, avoid raw queries

**Check Pattern:**
```typescript
// ❌ DANGEROUS: Raw query with user input
const results = await prisma.$queryRaw`
  SELECT * FROM themes WHERE name = '${userInput}'
`;

// ✅ SAFE: Parameterized query
const results = await prisma.$queryRaw`
  SELECT * FROM themes WHERE name = ${userInput}
`;

// ✅ BEST: Type-safe query builder
const results = await prisma.theme.findMany({
  where: { name: userInput }
});
```

### 2.2 XSS Prevention
**Frontend Concern**: Svelte auto-escapes by default

**Check Pattern:**
```svelte
<!-- ✅ SAFE: Auto-escaped -->
<div>{userInput}</div>

<!-- ❌ DANGEROUS: Bypasses escaping -->
<div>{@html userInput}</div>

<!-- ✅ SAFE: Sanitized before @html -->
<div>{@html sanitize(userInput)}</div>
```

### 2.3 Schema Validation
**Critical**: Validate all request bodies and query parameters

**Check Pattern:**
```typescript
// ❌ Missing validation
const body = await request.json();
await prisma.theme.create({ data: body });

// ✅ Proper validation
const body = await request.json();
const validationResult = validateThemeCreate(body);
if (validationResult.error) {
  return json(validationResult.error, { status: 400 });
}
await themeService.createTheme(validationResult.data);
```

**Use Shared Validators:**
- `validateLimit()` for pagination limits
- `validateThemeCreate()` for theme creation
- Add domain-specific validators as needed

## 3. Data Exposure

### 3.1 Sensitive Data Leakage
**Rule**: Never expose internal details in error messages

**Check Pattern:**
```typescript
// ❌ BAD: Exposes DB schema
catch (error) {
  return json({ error: error.message }, { status: 500 });
}

// ✅ GOOD: Generic message, log details server-side
catch (error) {
  console.error('[API Error]', error);
  return json(
    { error: { code: 'InternalServerError', message: 'Database operation failed' } },
    { status: 500 }
  );
}
```

### 3.2 Mass Assignment Prevention
**Rule**: Explicitly whitelist allowed fields

**Check Pattern:**
```typescript
// ❌ DANGEROUS: User can set any field
const updated = await prisma.theme.update({
  where: { id: themeId },
  data: requestBody // Could include userId, state, etc.
});

// ✅ SAFE: Explicit field mapping
const updated = await themeService.updateThemeById({
  userId: locals.user.id,
  themeId,
  data: {
    name: validatedData.name,
    goal: validatedData.goal,
    shortName: validatedData.shortName,
    isCompleted: validatedData.isCompleted
  }
});
```

### 3.3 Information Disclosure
**Common Leaks:**
- Stack traces in production
- File paths in error messages
- Database column names
- Internal IDs in URLs (acceptable for UUIDs)

**Check Pattern:**
```typescript
// Production error handling
if (process.env.NODE_ENV === 'production') {
  // Generic errors only
  return json({ error: { code: 'InternalServerError', message: 'Server error' } });
} else {
  // Detailed errors in development
  return json({ error: { code: 'InternalServerError', message: error.message, stack: error.stack } });
}
```

## 4. OWASP Top 10 Checklist

### A01:2021 – Broken Access Control
- [ ] All queries include userId scope
- [ ] Cross-user resource access is prevented
- [ ] updateMany/deleteMany use userId filter
- [ ] File uploads (if any) validate ownership

### A02:2021 – Cryptographic Failures
- [ ] Passwords are hashed (Supabase handles this)
- [ ] HTTPS enforced in production
- [ ] Secure cookie flags set
- [ ] No sensitive data in logs

### A03:2021 – Injection
- [ ] No raw SQL queries with user input
- [ ] Prisma query builder used exclusively
- [ ] Command injection prevented (no exec with user input)
- [ ] LDAP/NoSQL injection N/A

### A04:2021 – Insecure Design
- [ ] Logical delete prevents referential integrity issues
- [ ] State machine prevents invalid transitions
- [ ] Business constraints enforced at DB level
- [ ] Rate limiting considered (v0.2 out of scope)

### A05:2021 – Security Misconfiguration
- [ ] Error messages don't leak details
- [ ] Default credentials not used
- [ ] CORS properly configured
- [ ] Security headers set (CSP, X-Frame-Options, etc.)

### A06:2021 – Vulnerable Components
- [ ] Dependencies up to date (`deno outdated`)
- [ ] No known vulnerabilities (`deno audit` equivalent)
- [ ] Minimal dependency tree

### A07:2021 – Identification & Authentication
- [ ] Supabase Auth integration correct
- [ ] Session timeout configured
- [ ] No password storage in app (Supabase handles)
- [ ] MFA support (Supabase feature, out of scope)

### A08:2021 – Software & Data Integrity
- [ ] No unsigned code execution
- [ ] CI/CD pipeline integrity (future)
- [ ] Dependency integrity checks

### A09:2021 – Logging & Monitoring
- [ ] Security events logged
- [ ] Failed auth attempts logged
- [ ] No sensitive data in logs
- [ ] Log aggregation (production concern)

### A10:2021 – Server-Side Request Forgery (SSRF)
- [ ] No user-controlled URLs fetched
- [ ] URL validation if external requests needed
- [ ] Network segmentation (deployment concern)

## 5. Common Security Patterns

### Pattern: Secure Query Builder
```typescript
// Service layer method
async getResourceById(params: { userId: string; resourceId: string }) {
  return prisma.resource.findFirst({
    where: {
      userId: params.userId, // Always required
      id: params.resourceId,
      // state != 'DELETED' added automatically by Prisma Extensions
    }
  });
}
```

### Pattern: Safe Update Operation
```typescript
// Use updateMany for automatic userId scoping
async updateResource(params: { userId: string; resourceId: string; data: UpdateData }) {
  const result = await prisma.resource.updateMany({
    where: {
      userId: params.userId,
      id: params.resourceId,
      state: { not: 'DELETED' }
    },
    data: params.data
  });

  if (result.count === 0) {
    return null; // Not found or deleted
  }

  // Return updated record
  return this.getResourceById({ userId: params.userId, resourceId: params.resourceId });
}
```

### Pattern: Transaction Safety
```typescript
// Ensure atomicity for related operations
async deleteTheme(params: { userId: string; themeId: string }) {
  return prisma.$transaction(async (tx) => {
    // Delete theme
    await tx.theme.updateMany({
      where: { userId: params.userId, id: params.themeId },
      data: { state: 'DELETED', stateChangedAt: new Date() }
    });

    // Cascade delete related logs
    await tx.learningLogEntry.updateMany({
      where: { userId: params.userId, themeId: params.themeId },
      data: { state: 'DELETED', stateChangedAt: new Date() }
    });

    // Cascade delete related notes
    await tx.metaNote.updateMany({
      where: {
        userId: params.userId,
        metaNoteThemes: { some: { themeId: params.themeId } }
      },
      data: { state: 'DELETED', stateChangedAt: new Date() }
    });
  });
}
```

## 6. Security Testing

### Unit Test Examples
```typescript
describe('Security: Access Control', () => {
  it('prevents cross-user resource access', async () => {
    const user1 = await createUser();
    const user2 = await createUser();
    const theme = await themeService.createTheme({
      userId: user1.id,
      name: 'User 1 Theme',
      goal: 'Private goal'
    });

    // User 2 attempts to access User 1's theme
    const result = await themeService.getThemeById({
      userId: user2.id,
      themeId: theme.id
    });

    expect(result).toBeNull();
  });

  it('prevents privilege escalation via mass assignment', async () => {
    const user = await createUser();
    const maliciousData = {
      name: 'Updated Theme',
      userId: 'attacker-id', // Attempt to change ownership
      state: 'ACTIVE'
    };

    await expect(
      themeService.updateThemeById({
        userId: user.id,
        themeId: theme.id,
        data: maliciousData
      })
    ).rejects.toThrow(); // Should reject invalid fields
  });
});
```

## 7. References

- OWASP Top 10 2021: https://owasp.org/Top10/
- OWASP API Security: https://owasp.org/www-project-api-security/
- Prisma Security Best Practices: https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance
- Project Security Rules: `CLAUDE.md` C-1, DB-2
