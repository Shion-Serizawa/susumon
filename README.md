# susumon（Learning Log / Meta Note）

個人学習の継続と振り返りを目的としたログ管理アプリ（v0.1）。

## 開発スタート

- セットアップ手順: `docs/setup/DEVELOPMENT_SETUP.md`
- モック認証: `docs/setup/MOCK_AUTH.md`
- 仕様書: `docs/spec/`

## よく使うコマンド

```bash
deno task dev
deno task test
deno task typecheck
deno task db:migrate:dev
deno task db:studio
```

## メモ

- ランタイム: Deno（Deploy は `@deno/svelte-adapter`）
- 認証: Supabase Auth（実装は段階的に追加）
