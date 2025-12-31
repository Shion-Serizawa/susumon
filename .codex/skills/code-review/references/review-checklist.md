# Code Review Checklist

Quick reference checklist for systematic code reviews.

## Critical Issues (MUST Fix)

### Security
- [ ] All queries include `userId: locals.user.id` scope restriction
- [ ] No raw SQL queries with user input
- [ ] Authentication check exists (`if (!locals.user)`)
- [ ] Error messages don't leak sensitive information
- [ ] No XSS vulnerabilities (`@html` is sanitized)
- [ ] Cookie flags set correctly (HttpOnly, Secure, SameSite)

### Data Integrity
- [ ] Multi-table operations use `prisma.$transaction`
- [ ] Foreign key constraints are preserved
- [ ] Unique constraints are enforced
- [ ] State transitions are validated (ACTIVE → ARCHIVED → DELETED)
- [ ] `stateChangedAt` updated on state changes

### Breaking Changes
- [ ] API response format unchanged (backward compatible)
- [ ] Required fields not added to existing endpoints
- [ ] Existing field types not changed
- [ ] Error response format preserved

## High Priority (SHOULD Fix)

### Performance
- [ ] No N+1 queries (check loops with Prisma calls)
- [ ] Pagination implemented for list endpoints
- [ ] Only necessary columns selected (`select` clause)
- [ ] Proper indexes exist for queried columns
- [ ] Batch operations used where applicable

### Error Handling
- [ ] Try-catch blocks around Prisma operations
- [ ] Prisma errors mapped to appropriate HTTP status
  - P2002 → 409 Conflict
  - P2003 → 400 Bad Request
  - P2025 → 404 Not Found
- [ ] Unexpected errors logged and return 500
- [ ] Error responses use standard format `{ error: { code, message } }`

### Type Safety
- [ ] No `any` type usage (use `unknown` or specific types)
- [ ] Prisma-generated types used (`Prisma.ThemeWhereInput`, etc.)
- [ ] Function parameters have explicit types
- [ ] Return types are declared
- [ ] Shared types from `api-types.ts` are used

## Medium Priority (Good to Fix)

### Code Quality
- [ ] Shared validation utilities used (`validateLimit`, etc.)
- [ ] Shared pagination utilities used (`decodeCursor`, `buildPaginatedResponse`)
- [ ] Service layer handles business logic (not handlers)
- [ ] No code duplication (DRY principle)
- [ ] Functions have single responsibility

### Testing
- [ ] Unit tests added for new functionality
- [ ] Integration tests for API endpoints
- [ ] Test cases cover error scenarios
- [ ] Test data is properly cleaned up
- [ ] Tests are isolated (no interdependencies)

### API Design
- [ ] REST principles followed (nouns, plural, HTTP methods)
- [ ] Appropriate HTTP status codes used
  - 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 409 Conflict, 500 Internal Server Error
- [ ] Pagination cursor is opaque (Base64 encoded)
- [ ] Limit validated (1-200, default 50)
- [ ] Stable sort order (includes `id` as tiebreaker)

### Project Conventions
- [ ] Domain terms are consistent (`theme`, `log`, `note`)
- [ ] Field names use camelCase (`noteDate` not `date_note`)
- [ ] Category values use English keys (`INSIGHT`, `QUESTION`, `EMOTION`)
- [ ] UUID generation is DB-side only (no app-side `uuidv7()`)
- [ ] Logical delete uses `state = 'DELETED'` (no physical delete)

## Low Priority (Optional)

### Documentation
- [ ] Handler has JSDoc comment with endpoint description
- [ ] Query parameters documented
- [ ] Response codes documented
- [ ] Complex logic has inline comments
- [ ] README updated if structure changed

### Code Style
- [ ] Variable names are descriptive
- [ ] Function names use verb-noun pattern
- [ ] Constants use UPPER_SNAKE_CASE
- [ ] Files use kebab-case naming
- [ ] Consistent indentation and formatting

### Refactoring Opportunities
- [ ] Long functions split into smaller helpers
- [ ] Deep nesting reduced (early returns)
- [ ] Magic numbers extracted to constants
- [ ] Complex conditionals extracted to named functions
- [ ] Repeated logic extracted to utilities

## Suggestions (Nice to Have)

### Architecture
- [ ] Service methods are focused and cohesive
- [ ] Private helpers extract complexity
- [ ] Dependencies flow in correct direction (Handler → Service → DB)
- [ ] No circular dependencies

### Maintainability
- [ ] Code is self-documenting
- [ ] Complexity is justified
- [ ] Edge cases are handled
- [ ] Future extensibility considered

## Quick Severity Guide

### CRITICAL
Security vulnerabilities, data corruption risks
→ Block merge, fix immediately

Examples:
- Missing `userId` scope
- SQL injection vulnerability
- IDOR vulnerability
- Data integrity violation

### HIGH
Significant bugs, major performance issues
→ Fix before release

Examples:
- N+1 query problem
- Missing error handling
- Breaking API changes
- Memory leaks

### MEDIUM
Code quality issues, moderate bugs
→ Fix soon

Examples:
- Code duplication
- Missing tests
- Type safety violations
- Inconsistent naming

### LOW
Minor issues, style improvements
→ Fix when time permits

Examples:
- Missing documentation
- Variable naming
- Minor refactoring
- Formatting issues

### SUGGESTION
Best practices, optimization ideas
→ Optional

Examples:
- Alternative implementations
- Performance optimizations
- Code organization improvements
- Future enhancements

## Review Process

1. **Identify Scope**: `git diff main...HEAD --name-only`
2. **Read Changes**: Understand context before reviewing
3. **Run Checklist**: Go through critical → high → medium
4. **Test Changes**: Run tests, try manually
5. **Provide Feedback**: File:line references, severity, specific fixes
6. **Verify Fixes**: Re-review after changes

## Tools

```bash
# Type check
deno task typecheck

# Run tests
deno task test:unit

# Lint
deno task lint

# Format
deno task format

# Git diff
git diff main...HEAD
git show <commit-hash>
```

## References

- Full Guidelines: `docs/tech/code_review_guidelines.md`
- Security Review: `references/security-review.md`
- Performance Review: `references/performance-review.md`
- Architecture Review: `references/architecture-review.md`
- API Design Review: `references/api-design-review.md`
- Project Conventions: `CLAUDE.md`
