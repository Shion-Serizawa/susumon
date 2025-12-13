Check implementation against specification documents:

1. **Read Relevant Specs**
   - Functional Spec: `docs/spec/learning_log_meta_note_アプリ_機能仕様（draft_v_0.md`
   - Technical Spec: `docs/spec/learning_log_meta_note_アプリ_技術仕様（final_v_0.md`
   - DB Design: `docs/spec/learning_log_meta_note_アプリ_db設計（draft_v_0.md`

2. **Verify Domain Model**
   - Theme: name, shortName, goal, isCompleted
   - LearningLogEntry: id, themeId, date, summary, details, tags
   - MetaNote: id, category, body, themeIds, relatedLogId, noteDate

3. **Check Business Rules**
   - 1日1テーマ1ログ制約（`uq_log_per_day`）
   - category は '気づき' | '疑問' | '感情' のみ
   - isCompleted=true のテーマはラーニングログUIで非表示
   - noteDate はサーバー側自動生成

4. **Verify API Contracts**
   - OpenAPI spec adherence (paths, methods, schemas)
   - Pagination format: `{ items: [], nextCursor: string | null }`
   - Error format: `{ error: { code: string, message: string } }`

5. **Database Schema Alignment**
   - Table names, column names match spec
   - Constraints (unique, foreign key, check) are implemented
   - Indexes match performance requirements

6. **Report Discrepancies**
   - List any deviations from spec
   - Suggest updates to spec if implementation is intentionally different
   - Highlight missing features or incomplete implementations

Arguments: $ARGUMENTS (optional: specific feature or module to check)
