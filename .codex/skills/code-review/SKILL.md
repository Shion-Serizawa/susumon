---
name: code-review
description: Perform comprehensive code review of recent changes (diff/commit/PR). Analyze security, code quality, performance, reliability, and Susumon project conventions. Use when the user requests a review (e.g. "/review", "review this code"), before opening a PR, or after significant changes.
---

# Code Review Skill

Perform systematic code reviews covering security, quality, performance, reliability, and maintainability using computer science fundamentals and industry best practices.

## Quick Review Workflow (Default)

### 1. Identify Scope
```bash
# Get recent changes
git diff main...HEAD --name-only

# Or review specific files/commits
git show <commit-hash> --name-only
```

### 2. Analyze Changes
For each modified file:
- Read the full file to understand context
- Use `rg` to quickly locate relevant symbols/usages
- Check adjacent files (routes/services/types/tests) when behavior crosses boundaries

### 3. Apply Review Criteria
Run through systematic checks (see `references/review-checklist.md`):

**Critical (MUST fix before merge):**
- Security vulnerabilities (IDOR, injection, data leaks)
- Data integrity violations
- Breaking changes to API contracts

**High Priority (SHOULD fix):**
- Performance issues (N+1 queries, missing pagination)
- Missing error handling
- Type safety violations (`any` usage)

**Medium Priority (Good to fix):**
- Code duplication (DRY violations)
- Missing tests
- Inconsistent naming

**Low Priority (Optional):**
- Style improvements
- Documentation enhancements
- Refactoring opportunities

### 4. Report Findings
Structure review comments by severity:
```markdown
## Code Review Summary

### CRITICAL Issues
- [file.ts:42] IDOR vulnerability: Missing userId scope check

### HIGH Priority
- [api.ts:120] N+1 query problem in theme listing

### MEDIUM Priority
- [service.ts:80] Code duplication with logs service

### SUGGESTIONS
- [handler.ts:15] Consider using validateLimit utility
```

### 5. Validate Fixes (if changes made)
- Re-run review on updated files
- Verify all critical/high issues resolved
- Confirm no new issues introduced

## Project-Specific Focus Areas

### Susumon v0.2 Requirements
- **DB-1**: UUID generation MUST be DB-side (`uuid_v7()` function)
- **C-1**: All queries MUST include `userId: locals.user.id`
- **C-7**: Use shared libraries (validation, pagination, api-types)
- **C-8**: Service layer pattern (handlers delegate to services)
- **State Management**: Logical delete via `state = 'DELETED'`

### Common Violations to Check
❌ App-side UUID generation (should be DB-side)
❌ Missing `userId` scope restriction
❌ Direct Prisma usage in handlers (should use service layer)
❌ Skipping shared validation/pagination utilities
❌ Incorrect domain term usage (date_note vs noteDate)

## Deep Dive Reviews

For complex changes requiring detailed analysis:

- **Security Review**: See `references/security-review.md`
  - OWASP Top 10 checks
  - Authentication/Authorization flows
  - Input validation strategies

- **Performance Review**: See `references/performance-review.md`
  - Database query optimization
  - Algorithm complexity analysis
  - Caching opportunities

- **Architecture Review**: See `references/architecture-review.md`
  - SOLID principles adherence
  - Service layer pattern validation
  - Dependency management

- **API Design Review**: See `references/api-design-review.md`
  - REST principles compliance
  - Error response consistency
  - Pagination implementation

## Helper Scripts

### Quick Validation
```bash
# Run type checker
deno task typecheck

# Run tests
deno task test:unit

# Run linter
deno task lint
```

## References

- Full review guidelines: `docs/tech/code_review_guidelines.md`
- Security checklist: `references/security-review.md`
- Performance checklist: `references/performance-review.md`
- Architecture patterns: `references/architecture-review.md`
- API design rules: `references/api-design-review.md`
- Project conventions: `CLAUDE.md`
- Technical spec: `docs/spec/learning_log_meta_note_アプリ_技術仕様（final_v_0.md`

## Output Format

Provide actionable feedback with:
- **File:Line reference** for easy navigation
- **Severity level** (CRITICAL/HIGH/MEDIUM/LOW/SUGGESTION)
- **Clear explanation** of the issue
- **Specific fix recommendation** with code example when applicable
- **Reference to guidelines** for context

## CRITICAL: Review Report Location

**CRITICAL**: If you write the review result as a document, save it as a Markdown file under `./.tmp/` (e.g. `./.tmp/code-review-<scope>.md`).

Example:
```
[CRITICAL] src/routes/api/logs/+server.ts:45
Issue: Missing userId scope restriction in query
Impact: IDOR vulnerability - users can access other users' logs
Fix: Add userId to where clause:
  where: { userId: locals.user.id, date: queryDate }
Reference: C-1 in CLAUDE.md, OWASP A01:2021 Broken Access Control
```

## CRITICAL: Response Language

**CRITICAL**: Respond in Japanese (日本語). If the user explicitly requests English, respond in English.
