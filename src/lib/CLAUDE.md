# Frontend - Svelte 5 + SvelteKit

**Svelte 5 Runes + SvelteKit 2.x** 専用。型安全・保守性・SRP重視。

---

## Core Principles (MUST)

### P-1: Svelte 5 Runes Only
- **禁止**: `$:`, `export let`, 暗黙的reactivity
- **必須**: `$state()`, `$derived()`, `$effect()`, `$props()`

### P-2: SRP (Single Responsibility)
- 1コンポーネント = 1責務
- 100行超 → 分割検討
- UI/ロジック/API分離

### P-3: Type Safety
- `any` 禁止 → `unknown` + narrowing
- Props/State/API全て型定義
- `src/lib/types/*.ts` で共通型管理

---

## Directory Structure

```
src/lib/
├── components/
│   ├── ui/              # 汎用（移植可）
│   ├── domain/          # theme/log/note
│   └── layout/          # Header/Footer
├── stores/              # .svelte.ts ($state runes)
├── utils/
└── types/               # api.ts, domain.ts

src/routes/
├── (app)/               # 認証後
├── (auth)/              # login/callback
└── api/                 # +server.ts
```

---

## Svelte 5 Runes

### R-1: $state (MUST)
```typescript
let count = $state(0);
let user = $state<User | null>(null);
// ❌ let count = 0; // Svelte 4
```

### R-2: $derived (MUST)
```typescript
let doubled = $derived(count * 2);
// ❌ $effect(() => doubled = count * 2); // 派生値には使わない
```
- 純粋関数のみ（副作用禁止）
- 90%は `$effect` より `$derived`

### R-3: $effect (慎重)
```typescript
$effect(() => {
  document.title = `Count: ${count}`;
  return () => clearup(); // cleanup
});
```
- DOM操作/localStorage同期/ログのみ

### R-4: $props (MUST)
```typescript
interface Props { title: string; onUpdate?: (v: number) => void; }
let { title, count = 0, onUpdate }: Props = $props();
// ❌ export let title; // Svelte 4
```
- callback: `on<Event>` 命名

---

## Component Design

### CD-1: 分割基準
1. UIパターン2回以上
2. 100行超
3. 複数責務

### CD-2: State Management
| 用途 | 手段 | 場面 |
|------|------|------|
| 親子 | Props | 1-2階層 |
| Global | Stores (`$state` runes) | 認証/テーマ |
| Deep nest | Context | 3階層以上 |

### CD-3: Event Handling
```svelte
<button onclick={handleClick}>Click</button>
// ❌ <button on:click={...}> // Svelte 4
```
- 標準DOM: `onclick`, `onsubmit`, `oninput`

---

## API Integration

### AI-1: Client Structure
```
lib/api/
├── client.ts    # fetch wrapper
├── themes.ts
├── logs.ts
└── notes.ts
```

```typescript
export const ThemeAPI = {
  async list(params?): Promise<PaginatedThemes> {
    return apiRequest(`/themes?${new URLSearchParams(params)}`);
  },
  async create(data: ThemeCreate): Promise<Theme> {
    return apiRequest('/themes', { method: 'POST', body: JSON.stringify(data) });
  },
};
```

### AI-2: Data Fetch
- **SSR**: `load` 関数優先（SEO/初期表示）
- **Dynamic**: コンポーネント内 + `$effect`
- エラーハンドリング必須

```typescript
// +page.ts
export const load: PageLoad = async ({ fetch }) => {
  const themes = await ThemeAPI.list();
  return { themes };
};
```

---

## Form Handling

```svelte
<script lang="ts">
  let formData = $state<ThemeCreate>({ name: '', goal: '' });
  let errors = $state<Record<string, string>>({});
  let submitting = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!validate()) return;
    submitting = true;
    try {
      await ThemeAPI.create(formData);
    } catch (e) {
      errors.general = e.message;
    } finally {
      submitting = false;
    }
  }
</script>

<form onsubmit={handleSubmit}>
  <input bind:value={formData.name} disabled={submitting} />
  {#if errors.name}<span>{errors.name}</span>{/if}
  <button type="submit" disabled={submitting}>送信</button>
</form>
```

---

## UI/UX Patterns

### Loading/Error/Empty
```svelte
{#if loading}<LoadingSpinner />
{:else if error}<div role="alert">{error}</div>
{:else if items.length === 0}<EmptyState />
{:else}{#each items as item}<Item {item} />{/each}
{/if}
```

---

## Testing (推奨)

### E2E
- v0.1 は未導入

---

## Performance

- `$derived` は自動memo化
- 1000件超 → 仮想スクロール検討

---

## Security

### XSS対策
```svelte
<p>{userInput}</p>  <!-- ✅ auto-escape -->
<!-- ❌ {@html userInput} -->
```

### Auth State
```typescript
// stores/auth.svelte.ts
export const currentUser = $state<User | null>(null);
export const isAuthenticated = $derived(currentUser !== null);
```

---

## Naming (MUST)

- Component: `PascalCase` (ThemeList.svelte)
- Utility: `camelCase` (formatDate.ts)
- Type: `PascalCase` (Theme)
- Route: `kebab-case` (/learning-logs)
- Handler: `handle<Event>` (handleClick)
- Callback: `on<Event>` (onClick)

---

## Accessibility

- Semantic HTML: `<button>`, `<nav>`, `<main>`
- ARIA: `role="alert"`, `aria-label`

---

## CSS

- Scoped `<style>` 優先
- Global: `+layout.svelte` の `layout.css`
- CSS変数: `:root` でテーマ管理

---

## Common Pitfalls

### ❌ Svelte 4構文
```svelte
<!-- Bad -->
export let title;  // ❌
$: doubled = count * 2;  // ❌

<!-- Good -->
let { title } = $props();  // ✅
let doubled = $derived(count * 2);  // ✅
```

### ❌ $effect で派生値
```typescript
// ❌ let doubled = $state(0); $effect(() => doubled = count * 2);
// ✅ let doubled = $derived(count * 2);
```

### ❌ Props直接変更
```typescript
// ❌ items.push(item);
// ✅ onItemsChange?.([...items, item]);
```

---

## Quick Reference

| 用途 | Rune | 例 |
|------|------|-----|
| 状態 | `$state()` | `let count = $state(0)` |
| 派生値 | `$derived()` | `let doubled = $derived(count * 2)` |
| 副作用 | `$effect()` | `$effect(() => console.log(count))` |
| Props | `$props()` | `let { title } = $props()` |

---

**Version**: v0.1 (2025-01-XX)
