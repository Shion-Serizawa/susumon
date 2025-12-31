# Code Review Guidelines - 専門的観点の明文化

## 1. Security (セキュリティ)

### 1.1 Authentication & Authorization (認証・認可)
- **IDOR (Insecure Direct Object Reference)**: すべてのリソースアクセスで`userId`スコープ制限が必須
- **Session Management**: セッショントークンの適切な管理（HttpOnly, Secure, SameSite属性）
- **CSRF Protection**: State-changing操作（POST/PATCH/DELETE）でのCSRF対策
- **Privilege Escalation**: 権限昇格の可能性がないか検証

### 1.2 Input Validation (入力検証)
- **Injection Attacks**: SQL Injection, NoSQL Injection, Command Injection の防止
  - Prismaの型安全なクエリビルダーを使用（raw queryは避ける）
- **XSS (Cross-Site Scripting)**: ユーザー入力のサニタイゼーション
- **Path Traversal**: ファイルパス操作での相対パス攻撃の防止
- **Schema Validation**: リクエストボディ/クエリパラメータの型・形式検証

### 1.3 Data Exposure (データ露出)
- **Sensitive Data Leakage**: エラーメッセージでの機密情報の漏洩防止
- **Mass Assignment**: 許可されていないフィールドの更新防止
- **Information Disclosure**: スタックトレース、内部パスの露出防止

### 1.4 Cryptography (暗号化)
- **Secure Random**: 予測可能な乱数生成の回避（セッションIDなど）
- **Password Storage**: パスワードのハッシュ化（本プロジェクトではSupabase Auth使用）
- **Encryption at Rest**: 機密データの暗号化（DB側で実装）

## 2. Code Quality (コード品質)

### 2.1 Type Safety (型安全性)
- **Static Typing**: TypeScriptの型システムを最大限活用
- **Type Inference**: 明示的な型注釈が必要な箇所の特定
- **Any Type Avoidance**: `any`型の使用を最小化（unknown, 具体型を優先）
- **Prisma Type Generation**: Prisma生成型（`Prisma.*Input`, `Prisma.*Output`）の活用
- **Discriminated Unions**: 状態管理での判別可能なユニオン型の使用

### 2.2 Error Handling (エラー処理)
- **Exception Safety**: すべての例外を適切にキャッチ・処理
- **Error Propagation**: エラーの適切な伝播（throw vs return）
- **Graceful Degradation**: 部分的な失敗時の継続可能性
- **Transaction Rollback**: トランザクション内でのエラー時のロールバック保証
- **Error Context**: デバッグに必要な情報の保持（ログ出力）

### 2.3 DRY (Don't Repeat Yourself)
- **Code Duplication**: 重複コードの抽出（関数、共通ライブラリ）
- **Magic Numbers/Strings**: マジックナンバー・文字列の定数化
- **Service Layer Pattern**: ビジネスロジックのサービス層への集約
- **Utility Functions**: 共通処理の抽出（validation, pagination, etc.）

### 2.4 SOLID Principles
- **Single Responsibility**: 単一責任の原則（関数・クラスは1つの責任のみ）
- **Open/Closed**: 拡張に開き、修正に閉じる設計
- **Liskov Substitution**: サブタイプの置換可能性
- **Interface Segregation**: インターフェースの適切な分割
- **Dependency Inversion**: 抽象への依存（具象への依存を避ける）

### 2.5 Code Readability (可読性)
- **Naming Conventions**: 意味のある変数名・関数名（本プロジェクトのドメイン用語統一）
- **Function Length**: 関数の適切な長さ（1画面内に収まる）
- **Complexity Metrics**: Cyclomatic Complexity の低減（条件分岐の最小化）
- **Comment Quality**: コメントの質（Why > What）
- **Code Organization**: ファイル・ディレクトリ構造の論理的な配置

## 3. Performance (パフォーマンス)

### 3.1 Database Optimization (データベース最適化)
- **N+1 Query Problem**: N+1クエリ問題の検出と解決（`include`, `select`の活用）
- **Index Usage**: 適切なインデックスの使用（WHERE, ORDER BY対象カラム）
- **Query Efficiency**: 不要なカラムの取得回避（`select`での絞り込み）
- **Connection Pooling**: コネクションプールの適切な設定
- **Batch Operations**: 一括操作の活用（`createMany`, `updateMany`）

### 3.2 Algorithm Complexity (アルゴリズム計算量)
- **Time Complexity**: アルゴリズムの時間計算量（O(n), O(n log n), O(n²)など）
- **Space Complexity**: メモリ使用量の評価
- **Pagination**: 大量データ処理でのページネーション必須
- **Lazy Loading**: 遅延ロードによるメモリ効率化

### 3.3 Caching Strategy (キャッシング戦略)
- **Cache Invalidation**: キャッシュ無効化のタイミング
- **Cache Key Design**: キャッシュキーの設計（一意性、衝突回避）
- **TTL Strategy**: Time-To-Liveの適切な設定

## 4. Reliability (信頼性)

### 4.1 Data Integrity (データ整合性)
- **ACID Properties**: トランザクションのACID特性保証
- **Referential Integrity**: 外部キー制約の適切な設定
- **Unique Constraints**: 一意制約の活用（1日1テーマ1ログなど）
- **Check Constraints**: CHECK制約によるドメインルール強制
- **State Machine Validation**: 状態遷移の妥当性検証

### 4.2 Concurrency Control (並行制御)
- **Race Conditions**: 競合状態の検出と防止
- **Optimistic Locking**: 楽観的ロック（バージョン番号、タイムスタンプ）
- **Pessimistic Locking**: 悲観的ロック（SELECT FOR UPDATE）
- **Transaction Isolation**: 適切な分離レベルの選択

### 4.3 Idempotency (冪等性)
- **Idempotent Operations**: 同じリクエストの複数回実行で同じ結果を保証
- **Retry Safety**: リトライ時の安全性
- **Duplicate Detection**: 重複リクエストの検出（v0.2ではスコープ外だが将来実装）

## 5. Maintainability (保守性)

### 5.1 Testability (テスタビリティ)
- **Unit Test Coverage**: ユニットテストのカバレッジ
- **Integration Test**: 統合テストの適切な配置
- **Test Isolation**: テストの独立性（他のテストに依存しない）
- **Mock/Stub Usage**: モック・スタブの適切な使用
- **Test Data Management**: テストデータの管理戦略

### 5.2 Modularity (モジュール性)
- **Loose Coupling**: 疎結合の設計
- **High Cohesion**: 高凝集性の実現
- **Dependency Direction**: 依存関係の方向性（上位→下位）
- **Layered Architecture**: レイヤードアーキテクチャの遵守

### 5.3 Documentation (ドキュメンテーション)
- **API Documentation**: APIの仕様ドキュメント（OpenAPI準拠）
- **Code Comments**: 複雑なロジックへのコメント
- **Type Annotations**: 型注釈による自己文書化
- **README Updates**: プロジェクト構成変更時のREADME更新

## 6. API Design (API設計)

### 6.1 REST Principles (REST原則)
- **Resource Naming**: リソース名の適切性（複数形、名詞）
- **HTTP Method Semantics**: HTTPメソッドのセマンティクス遵守
  - GET: 冪等、安全、キャッシュ可能
  - POST: 非冪等、リソース作成
  - PATCH: 部分更新
  - DELETE: リソース削除
- **Status Code Consistency**: HTTPステータスコードの一貫性
- **HATEOAS**: ハイパーメディアによる状態遷移（v0.2ではスコープ外）

### 6.2 Backward Compatibility (後方互換性)
- **API Versioning**: API バージョニング戦略（将来の考慮事項）
- **Deprecation Strategy**: 非推奨化の段階的な実施
- **Breaking Changes Avoidance**: 破壊的変更の回避

### 6.3 Error Response Design (エラーレスポンス設計)
- **Consistent Format**: 統一されたエラーフォーマット
- **Error Codes**: 機械可読なエラーコード
- **User-Friendly Messages**: ユーザーフレンドリーなメッセージ
- **Detailed Context**: デバッグに必要な詳細情報（開発環境のみ）

## 7. Project-Specific Rules (プロジェクト固有ルール)

### 7.1 Susumon DB Design v0.2
- **UUIDv7 Generation**: DB側でのUUID生成（`uuid_v7()`関数）、アプリ側生成は禁止
- **State Machine**: 論理削除はstate='DELETED'による状態管理
- **Prisma Extensions**: `userId`必須チェックとstate自動フィルタリング
- **Intermediate Table**: MetaNote-Theme間は中間テーブル管理（配列型は非推奨）

### 7.2 Naming Conventions
- **Domain Terms**: `theme`, `log`, `note`（URLやコード内）
- **Date Fields**: `noteDate`（camelCase）
- **Category Values**: DB値は英語キー（`'INSIGHT'`, `'QUESTION'`, `'EMOTION'`）

### 7.3 Service Layer Pattern
- **Handler Responsibilities**: 認証チェック、バリデーション、サービス呼び出しのみ
- **Service Layer**: ビジネスロジック、DB操作の集約
- **Transaction Management**: 複数テーブル操作は`prisma.$transaction`使用

### 7.4 Shared Libraries
- **Validation**: `src/lib/server/validation.ts`の共通関数を使用
- **Pagination**: `src/lib/server/pagination.ts`の共通関数を使用
- **Type Definitions**: `src/lib/server/api-types.ts`の型定義を参照

## 8. Common Anti-Patterns (アンチパターン)

### 8.1 Security Anti-Patterns
- ❌ `userId`なしでのクエリ実行
- ❌ ユーザー入力の直接的なSQL埋め込み
- ❌ エラーメッセージでの詳細な内部情報の露出
- ❌ Cookieの不適切な設定（Secure, HttpOnly, SameSite欠如）

### 8.2 Code Quality Anti-Patterns
- ❌ `any`型の過度な使用
- ❌ 深いネストによる複雑性の増大
- ❌ グローバル状態の濫用
- ❌ マジックナンバー・文字列の乱用

### 8.3 Performance Anti-Patterns
- ❌ N+1クエリ問題の放置
- ❌ 全カラム取得（`select`での絞り込み欠如）
- ❌ ページネーションなしの大量データ取得
- ❌ 不要なトランザクションの使用

### 8.4 Maintainability Anti-Patterns
- ❌ 神クラス（God Class）の作成
- ❌ テストの欠如
- ❌ ハードコードされた設定値
- ❌ ドキュメントの未更新

## 9. Review Checklist Template

以下は、コードレビュー時の具体的なチェックリストです。

### Security Checklist
- [ ] すべてのクエリに`userId`スコープ制限が存在する
- [ ] ユーザー入力は適切にバリデーションされている
- [ ] エラーメッセージで機密情報が漏洩していない
- [ ] 認証チェックが適切に実装されている

### Code Quality Checklist
- [ ] `any`型の使用が最小限である
- [ ] Prisma生成型を活用している
- [ ] 共通ライブラリ（validation, pagination）を使用している
- [ ] サービス層でビジネスロジックを分離している

### Performance Checklist
- [ ] N+1クエリ問題が発生していない
- [ ] 適切な`select`でカラムを絞り込んでいる
- [ ] ページネーションが実装されている（一覧系API）
- [ ] インデックスが適切に使用されている

### Reliability Checklist
- [ ] トランザクションが適切に使用されている
- [ ] 外部キー制約が保持されている
- [ ] 一意制約が適切に設定されている
- [ ] 状態遷移の妥当性が検証されている

### Maintainability Checklist
- [ ] テストが追加・更新されている
- [ ] 関数・変数名が意味を持っている
- [ ] コードの重複が最小限である
- [ ] ドキュメントが更新されている

### Project-Specific Checklist
- [ ] DB側でUUIDv7生成（アプリ側生成は禁止）
- [ ] 論理削除は`state='DELETED'`による状態管理
- [ ] ドメイン用語が統一されている（`theme`, `log`, `note`）
- [ ] エラーレスポンスが統一フォーマットである

## 10. Review Severity Levels

レビュー指摘の重要度レベル定義：

- **CRITICAL (致命的)**: セキュリティ脆弱性、データ破損リスク
  - 即座に修正が必要
  - 例: IDOR脆弱性、SQL Injection、データ整合性違反

- **HIGH (重大)**: 重大なバグ、パフォーマンス問題
  - リリース前に修正が必要
  - 例: N+1クエリ問題、メモリリーク、競合状態

- **MEDIUM (中程度)**: コード品質の問題、保守性の低下
  - 近いうちに修正すべき
  - 例: コード重複、型安全性の欠如、テスト不足

- **LOW (軽度)**: スタイル、ネーミング、ドキュメント
  - 時間があれば修正
  - 例: 変数名の改善、コメント追加、軽微なリファクタリング

- **SUGGESTION (提案)**: より良い実装方法の提案
  - オプショナル
  - 例: よりエレガントな実装、最新のベストプラクティス

## 11. References

### External Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [REST API Design Best Practices](https://restfulapi.net/)

### Project-Specific References
- `CLAUDE.md` - プロジェクト規約
- `docs/spec/learning_log_meta_note_アプリ_技術仕様（final_v_0.md` - 技術仕様
- `docs/spec/learning_log_meta_note_アプリ_db設計（draft_v_0.md` - DB設計
- `src/lib/server/db.ts` - Prisma Client Extensions（セキュリティルール）
- `src/routes/api/themes/+server.ts` - 参考実装
