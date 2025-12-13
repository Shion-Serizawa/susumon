Run end-to-end tests for critical user flows:

1. **Setup Test Environment**
   - Ensure test database is available
   - Start development server if not running
   - Verify Playwright is installed

2. **Authentication Flow**
   - Test GitHub OAuth login redirect
   - Verify callback handling and session creation
   - Test logout and session cleanup

3. **Theme Management**
   - Create new theme
   - Edit theme (name, goal, shortName)
   - Mark theme as completed
   - Delete theme (verify cascade to logs)

4. **Learning Log Flow**
   - Select date and theme
   - Create new log entry
   - Edit existing log (same day, same theme)
   - Verify "1日1テーマ1ログ" constraint (should open existing entry)
   - Delete log entry

5. **Meta Note Flow**
   - Create note from log screen (auto-populate relatedLogId)
   - Create standalone note (no relatedLogId)
   - Filter by category, theme, date range
   - Edit and delete notes

6. **Contribution Heatmap**
   - Verify activity data fetching
   - Check color gradient calculation (0-9 levels)
   - Test date range filtering

7. **Error Scenarios**
   - Unauthorized access (no session)
   - Invalid data submission (validation errors)
   - Unique constraint violations
   - Foreign key violations

8. **Generate Report**
   - List passed/failed tests
   - Capture screenshots for failures
   - Provide reproduction steps for bugs

Arguments: $ARGUMENTS (optional: specific flow to test, e.g., "auth", "themes", "logs")
