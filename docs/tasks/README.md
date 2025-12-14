# タスク計画 - 学習ログ/メタノートアプリ (v0.1)

このディレクトリには、プロジェクトの段階的な開発タスク計画が含まれています。

## 📋 タスク計画ドキュメント

| Phase | ドキュメント | 目的 | 前提条件 | 並列実行 |
|-------|------------|------|---------|---------|
| **Phase 0** | [00_環境構築.md](./00_環境構築.md) | 開発環境とインフラ基盤の構築 | なし | - |
| **Phase 1-BE** | [01_バックエンド開発.md](./01_バックエンド開発.md) | REST API実装 | Phase 0 完了 | ✅ Phase 1-FE と並列可 |
| **Phase 1-FE** | [02_フロントエンド開発.md](./02_フロントエンド開発.md) | UI/UXコンポーネント実装 | Phase 0 完了 | ✅ Phase 1-BE と並列可 |

---

## 🚀 開発フロー

```
Phase 0: 環境構築
    ↓
    ├─→ Phase 1-BE: バックエンド開発 (並列)
    │       ├─ Theme API
    │       ├─ LearningLog API
    │       └─ MetaNote API
    │
    └─→ Phase 1-FE: フロントエンド開発 (並列)
            ├─ Theme UI
            ├─ LearningLog UI
            └─ MetaNote UI
```

---

## 📝 各フェーズの概要

### Phase 0: 環境構築

**目的**: ローカル開発環境とデプロイ環境の基盤を構築

**主なタスク**:
- SvelteKit + Deno プロジェクト初期化
- Prisma スキーマ定義とマイグレーション
- モック認証システム構築
- 共通ユーティリティ作成

**完了条件**:
- ✅ 開発サーバーが起動できる
- ✅ データベース接続が確立できる
- ✅ ビルドが成功する

**所要時間**: 約1-2日

---

### Phase 1-BE: バックエンド開発

**目的**: REST APIエンドポイントの実装とビジネスロジックの構築

**主なタスク**:
- **Theme API** (5タスク): CRUD操作
- **LearningLog API** (5タスク): CRUD操作 + 制約処理
- **MetaNote API** (5タスク): CRUD操作 + noteDate自動生成

**実装規約**:
- ユーザースコープ制限必須（`userId` フィルタ）
- UUID v7 生成（アプリ側）
- カーソルページネーション
- 統一エラーフォーマット

**完了条件**:
- ✅ 全エンドポイントがOpenAPI仕様に準拠
- ✅ ユーザースコープ制限が機能
- ✅ エラーハンドリングが統一

**所要時間**: 約3-5日

---

### Phase 1-FE: フロントエンド開発

**目的**: Svelte 5 を使用したUIコンポーネントとページの実装

**主なタスク**:
- **Theme UI** (5タスク): テーマ管理画面
- **LearningLog UI** (5タスク): 学習ログ画面
- **MetaNote UI** (5タスク): メタノート画面
- **共通コンポーネント** (5タスク): Navigation, Pagination等
- **レイアウト** (3タスク): ルーティング設定

**実装規約**:
- Svelte 5 Runes必須（`$state`, `$props`, `$derived`）
- イベントハンドラは `onclick` 形式
- TypeScript型安全性確保

**完了条件**:
- ✅ 全ページがSvelte 5構文で実装
- ✅ TypeScript型エラーなし
- ✅ モバイル対応完了

**所要時間**: 約3-5日

---

## 🔄 並列開発のポイント

### Phase 1-BE と Phase 1-FE の並列実行

**成功の鍵**:

1. **API契約の事前確定**
   - OpenAPI定義: `docs/spec/learning_log_meta_note_アプリ_技術仕様（final_v_0.md`
   - 型定義: `src/lib/types/index.ts`（Phase 0で作成）

2. **セクションごとの並列実行**
   ```
   バックエンド Theme API → フロントエンド Theme UI (並列)
   バックエンド Log API   → フロントエンド Log UI (並列)
   バックエンド Note API  → フロントエンド Note UI (並列)
   ```

3. **モックデータの活用**
   - バックエンドAPI未完成時は、フロントエンドでモックデータを使用
   - `+page.ts` で一時的にハードコードされたデータを返す

4. **Git Worktreeでの隔離**（推奨）
   ```bash
   # バックエンド開発用
   git worktree add ../susumon-backend -b feature/backend-api

   # フロントエンド開発用
   git worktree add ../susumon-frontend -b feature/frontend-ui
   ```

5. **定期的な統合**
   - 各セクション完了後に統合テストを実施
   - API仕様変更時はフロントエンドチームに通知

---

## 📊 進捗管理

### タスク完了の追跡

各ドキュメント内のチェックリストを使用：

```markdown
- [x] 1.1 GET /api/themes - テーマ一覧取得
- [ ] 1.2 POST /api/themes - テーマ作成
```

### Claude Codeでの進捗確認

```bash
# Plan Modeでタスク確認
claude --permission-mode plan

# メモリで進捗確認
/memory
```

### プロジェクトボード（任意）

GitHub Projects や Jira を使用して可視化も可能。

---

## 🧪 テスト戦略

### Phase 0 完了後

- [ ] 開発サーバー起動確認
- [ ] データベース接続確認
- [ ] ビルド成功確認

### Phase 1-BE 完了後

- [ ] API統合テスト（各エンドポイント）
- [ ] ユーザースコープ制限テスト
- [ ] エラーハンドリングテスト

### Phase 1-FE 完了後

- [ ] UI表示確認（全ページ）
- [ ] フォームバリデーションテスト
- [ ] レスポンシブ対応確認

### 統合テスト

- [ ] E2Eテスト: テーマ作成 → ログ作成 → ノート作成フロー
- [ ] パフォーマンステスト: ページネーション動作確認

**参照**: `.claude/commands/test-e2e.md`

---

## 📚 関連ドキュメント

### 仕様書

- [機能仕様](../spec/learning_log_meta_note_アプリ_機能仕様（draft_v_0.md)
- [技術仕様](../spec/learning_log_meta_note_アプリ_技術仕様（final_v_0.md)
- [DB設計](../spec/learning_log_meta_note_アプリ_db設計（draft_v_0.md)

### セットアップガイド

- [開発環境セットアップ](../setup/DEVELOPMENT_SETUP.md)
- [モック認証](../setup/MOCK_AUTH.md)
- [MCPサーバー設定](../setup/MCP_SETUP.md)

### 技術ガイド

- [Deno Deploy + SvelteKit開発ガイド](../tech/deno_deploy_sveltekit_注意点_2025.md)

### プロジェクトメモリ

- [CLAUDE.md](../../CLAUDE.md) - コーディング規約、制約、Gotchas

---

## 🛠️ Claude Code Skills

タスク実行時に利用可能なスキル：

| スキル | 用途 | タイミング |
|--------|-----|----------|
| `prisma-schema-manager` | Prismaスキーマ管理 | Phase 0, バックエンド開発 |
| `api-endpoint-builder` | APIエンドポイント実装 | バックエンド開発 |
| `sveltekit-component-builder` | Svelteコンポーネント作成 | フロントエンド開発 |

**使用方法**: Claude Codeが自動的に適切なスキルを起動します。

---

## 🚨 重要な注意事項

### 必須遵守事項

1. **ユーザースコープ制限**
   - すべてのAPIクエリに `where: { userId: locals.user.id }` を含める
   - データ越境を防ぐ

2. **UUID v7 生成**
   - Prismaは自動生成しない
   - 必ずアプリ側で `uuidv7()` を呼ぶ

3. **Svelte 5 構文**
   - `export let` は使わない → `$props()` を使用
   - `on:click` は使わない → `onclick` を使用

4. **noteDate 自動生成**
   - MetaNote作成時、`noteDate` はサーバー側で設定
   - フロントエンドから送信しない

### 既知の問題

- **Deno Deploy + SvelteKit**: `deno compile` は使用不可
- **Prisma + Deno**: `runtime = "deno"` 必須
- **Svelte 5**: CSS スコープが `:where()` 形式に変更

**詳細**: `docs/tech/deno_deploy_sveltekit_注意点_2025.md`

---

## 📞 サポート

### 困ったときは

1. **各タスクドキュメントの「トラブルシューティング」セクションを確認**
2. **CLAUDE.md の「Gotchas & Pitfalls」を参照**
3. **技術ガイドの既知の問題セクションを確認**

### Claude Codeの活用

```bash
# Plan Modeで詳細計画
claude --permission-mode plan

# スキルを使用してタスク実行
# (自動的に適切なスキルが起動されます)
```

---

## 🎯 次のステップ

1. **Phase 0 (環境構築)** から開始
2. Phase 0 完了後、**Phase 1-BE** と **Phase 1-FE** を並列実行
3. 各セクション完了後、統合テストを実施
4. 全Phase完了後、デプロイ準備（`.claude/commands/deploy-prep.md`）

**Let's build! 🚀**
