# Performance Review Reference

Performance analysis for code reviews focusing on database, algorithms, and runtime efficiency.

## 1. Database Performance

### 1.1 N+1 Query Problem
**Critical Performance Issue**: Most common database anti-pattern

**Detection Pattern:**
```typescript
// ❌ BAD: N+1 queries (1 + N queries)
const themes = await prisma.theme.findMany({ where: { userId } });
for (const theme of themes) {
  // Each iteration executes a separate query
  const logCount = await prisma.learningLogEntry.count({
    where: { themeId: theme.id }
  });
  theme.logCount = logCount;
}

// ✅ GOOD: Single query with aggregation
const themes = await prisma.theme.findMany({
  where: { userId },
  include: {
    _count: {
      select: { learningLogEntries: true }
    }
  }
});
```

**Review Checklist:**
- [ ] Loops contain no Prisma queries
- [ ] Related data uses `include` or `select`
- [ ] Aggregations use Prisma's `_count`, `_sum`, etc.

### 1.2 Query Efficiency
**Principle**: Fetch only what you need

**Column Selection:**
```typescript
// ❌ BAD: Fetches all columns
const themes = await prisma.theme.findMany({
  where: { userId }
});

// ✅ GOOD: Select specific columns
const themes = await prisma.theme.findMany({
  where: { userId },
  select: {
    id: true,
    name: true,
    shortName: true,
    isCompleted: true
  }
});
```

### 1.3 Index Usage
**Rule**: WHERE and ORDER BY columns should be indexed

**Review Pattern:**
```prisma
// Check schema.prisma for indexes
model Theme {
  id        String   @id @default(dbgenerated("uuid_v7()"))
  userId    String   @map("user_id")
  createdAt DateTime @default(now()) @map("created_at")

  // ✅ Composite index for common query pattern
  @@index([userId, createdAt, id])
  @@index([userId, isCompleted])
}
```

### 1.4 Pagination
**Critical**: Never fetch unbounded result sets

**Check Pattern:**
```typescript
// ❌ BAD: No pagination
const allThemes = await prisma.theme.findMany({
  where: { userId }
});

// ✅ GOOD: Cursor-based pagination
const themes = await prisma.theme.findMany({
  where: { userId, /* cursor logic */ },
  orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  take: limit + 1
});
```

### 1.5 Batch Operations
**Principle**: Bulk operations over loops

**Check Pattern:**
```typescript
// ❌ BAD: Loop with individual creates
for (const item of items) {
  await prisma.resource.create({ data: item });
}

// ✅ GOOD: Batch create
await prisma.resource.createMany({
  data: items,
  skipDuplicates: true
});
```

## 2. Algorithm Complexity

### 2.1 Time Complexity Analysis
**Common Complexities:**
- O(1): Hash map lookup
- O(log n): Binary search
- O(n): Single loop
- O(n log n): Efficient sorting
- O(n²): Nested loops (often avoidable)

**Review Checklist:**
- [ ] Nested loops are justified
- [ ] Array operations are appropriate
- [ ] Sorting is necessary and efficient

## 3. Performance Checklist

### Database
- [ ] No N+1 queries
- [ ] Proper indexes on queried columns
- [ ] Pagination implemented for lists
- [ ] Only necessary columns selected
- [ ] Batch operations used where applicable

### Algorithms
- [ ] Time complexity is reasonable
- [ ] No unnecessary nested loops
- [ ] Appropriate data structures

### Frontend
- [ ] API calls are parallelized
- [ ] Large lists use virtual scrolling
- [ ] Images are lazy-loaded

## References
- Prisma Performance: https://www.prisma.io/docs/guides/performance-and-optimization
- Database Indexing: https://use-the-index-luke.com/
- Project Pagination: `docs/spec/learning_log_meta_note_アプリ_技術仕様（final_v_0.md:759`
