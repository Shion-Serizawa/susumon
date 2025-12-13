Perform comprehensive code review of recent changes:

1. **Code Quality**
   - Check TypeScript conventions (no `any`, proper types)
   - Verify SvelteKit and Prisma best practices
   - Ensure consistent naming (domain vocabulary)
   - **Svelte 5**: Verify components use `$props()`, `$state()`, `$derived()`, not `export let` or `$:`
   - **Svelte 5**: Verify event handlers use `onclick`, not `on:click`
   - **Deno**: Verify npm imports use `npm:` prefix where needed
   - **Prisma**: Verify `runtime = "deno"` in schema.prisma generator

2. **Security & Authorization**
   - Confirm all API endpoints check `locals.user`
   - Verify `userId` scope in all database queries
   - Check for potential SQL injection or XSS vulnerabilities

3. **Error Handling**
   - Ensure consistent error response format: `{ error: { code, message } }`
   - Verify proper HTTP status codes (400, 401, 404, 409, 500)
   - Check unique constraint and foreign key error handling

4. **Data Integrity**
   - Confirm adherence to DB constraints (1日1テーマ1ログ, category values)
   - Verify JST date handling for `date` and `noteDate`
   - Check UUIDv7 generation before `create()`

5. **Testing**
   - Review test coverage for new functionality
   - Ensure edge cases are tested (empty data, boundary values)
   - Check integration tests for API endpoints

6. **Documentation**
   - Confirm code comments are up-to-date
   - Verify CLAUDE.md is updated if standards changed
   - Check if spec documents need updates

7. **Performance**
   - Review query efficiency (N+1 queries, missing indexes)
   - Check pagination implementation
   - Verify proper use of database indexes

Use the established code quality checklist in CLAUDE.md.
