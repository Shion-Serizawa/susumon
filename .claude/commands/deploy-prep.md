Prepare application for deployment to Deno Deploy:

1. **Pre-deployment Checks**
   - Run all tests: `deno task test`
   - Run type checking: `deno task typecheck`
   - Run linter: `deno task lint`
   - Verify build succeeds: `deno task build`

2. **Environment Variables Verification**
   - Check required vars are documented in `.env.example`:
     - `DATABASE_URL` (auto-injected by Deno Deploy for Prisma Postgres)
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `APP_ORIGIN`
     - `USE_MOCK_AUTH="false"` (MUST be false in production!)
     - `NODE_ENV="production"`
   - Verify secrets are NOT in `.env` committed to repo
   - Confirm Deno Deploy environment variables are set in dashboard

3. **Database Migration Status**
   - List pending migrations: `deno task db:migrate:status`
   - Confirm production database is backed up
   - Plan migration execution window (downtime if needed)

4. **Deno Deploy Configuration**
   - Verify `deno.json` is correct (entry point, tasks, compilerOptions)
   - Check `@deno/svelte-adapter` is configured in `svelte.config.js`
   - Verify `prisma/schema.prisma` has `runtime = "deno"` in generator
   - Confirm Prisma Postgres is provisioned in Deno Deploy
   - Confirm build output in `.svelte-kit/build` is production-ready

5. **Performance Checks**
   - Review bundle size (target: < 500KB for critical paths)
   - Check for unused dependencies
   - Verify image optimization
   - Test load time on slow 3G connection

6. **Security Review**
   - Ensure all API endpoints require authentication
   - Verify `user_id` scoping in all queries
   - Check CORS settings (if applicable)
   - Review cookie settings (`HttpOnly`, `Secure`, `SameSite`)

7. **Monitoring Setup**
   - Confirm Deno Deploy logging is enabled
   - Set up error tracking (e.g., Sentry)
   - Plan health check endpoint (`/api/health`)

8. **Deployment Steps** (manual execution required)
   - Push to `main` branch (triggers Deno Deploy)
   - Run migrations: `deno task db:migrate:deploy`
   - Monitor deployment logs in Deno Deploy dashboard
   - Test critical flows on production URL
   - Verify Supabase OAuth callback URL is correct

9. **Rollback Plan**
   - Document rollback steps
   - Keep previous deployment version available
   - Database rollback strategy (if migration fails)

Arguments: $ARGUMENTS (environment: staging | production)
