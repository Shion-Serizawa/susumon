---
name: sveltekit-component-builder
description: Create Svelte 5 components and pages following project conventions. Use when building UI components or page routes.
allowed-tools: [Read, Write, Edit, Grep]
---

# SvelteKit Component Builder Skill (Svelte 5)

**⚠️ IMPORTANT**: This project uses **Svelte 5** with the new Runes system. Always use Svelte 5 syntax!

## When to Activate
- User asks to create a Svelte component
- User mentions "page", "form", "UI", or ".svelte file"
- User wants to build frontend features

## Process

### 1. Understand Component Type

**Page Component** (`src/routes/(app)/[route]/+page.svelte`):
- Uses `+page.ts` or `+page.server.ts` for data loading
- Top-level route component

**Reusable Component** (`src/lib/components/[Component].svelte`):
- Standalone, reusable UI element
- Accepts props and emits events

**Layout** (`src/routes/(app)/+layout.svelte`):
- Wraps multiple pages
- Shared navigation, headers, footers

### 2. Component Structure

**Template** (Reusable Component - Svelte 5):
```svelte
<script lang="ts">
  // 1. Imports
  import type { Theme } from '$lib/types';

  // 2. Props (Svelte 5 syntax with $props())
  let { theme, readonly = false, onedit, ondelete }: {
    theme: Theme;
    readonly?: boolean;
    onedit?: (event: { id: string }) => void;
    ondelete?: (event: { id: string }) => void;
  } = $props();

  // 3. Local state (Svelte 5 syntax with $state())
  let isExpanded = $state(false);

  // 4. Derived values (Svelte 5 syntax with $derived())
  let displayName = $derived(theme.shortName ?? theme.name);

  // 5. Functions
  function handleEdit() {
    onedit?.({ id: theme.id });
  }

  function handleDelete() {
    ondelete?.({ id: theme.id });
  }
</script>

<!-- 6. Template -->
<div class="theme-card" class:readonly>
  <h3>{theme.name}</h3>
  {#if theme.shortName}
    <span class="short-name">{theme.shortName}</span>
  {:else}
    <span class="short-name">...</span>
  {/if}

  {#if !readonly}
    <!-- Svelte 5: Use onclick instead of on:click -->
    <button onclick={handleEdit}>Edit</button>
    <button onclick={handleDelete}>Delete</button>
  {/if}
</div>

<!-- 7. Scoped styles -->
<style>
  .theme-card {
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 8px;
  }

  .theme-card.readonly {
    opacity: 0.6;
    pointer-events: none;
  }

  .short-name {
    font-size: 0.875rem;
    color: #666;
  }
</style>
```

**Template** (Page Component with Data Loading - Svelte 5):
```svelte
<!-- src/routes/(app)/themes/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import ThemeCard from '$lib/components/ThemeCard.svelte';

  // Svelte 5: Props use $props()
  let { data }: { data: PageData } = $props();

  // Svelte 5: Local reactive state with $state()
  let themes = $state(data.themes);

  async function handleDelete(event: { id: string }) {
    const response = await fetch(`/api/themes/${event.id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      themes = themes.filter(t => t.id !== event.id);
    }
  }
</script>

<h1>Themes</h1>

<div class="theme-list">
  {#each themes as theme (theme.id)}
    <!-- Svelte 5: Pass event handlers as props (onedit, ondelete) -->
    <ThemeCard {theme} ondelete={handleDelete} onedit={() => {}} />
  {/each}
</div>

<style>
  .theme-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }
</style>
```

**Template** (`+page.ts` - Client-side Data Loading):
```typescript
// src/routes/(app)/themes/+page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const response = await fetch('/api/themes');
  const data = await response.json();

  return {
    themes: data.items,
  };
};
```

**Template** (`+page.server.ts` - Server-side Data Loading):
```typescript
// src/routes/(app)/themes/+page.server.ts
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  const themes = await prisma.theme.findMany({
    where: { userId: locals.user.id },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });

  return { themes };
};
```

### 3. Form Handling

**Template** (Form with Validation - Svelte 5):
```svelte
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  // Svelte 5: Props use $props()
  let { form }: { form?: ActionData } = $props();

  // Svelte 5: Local state with $state()
  let name = $state('');
  let goal = $state('');
  let errors = $state<Record<string, string>>({});

  function validateForm() {
    errors = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (!goal.trim()) errors.goal = 'Goal is required';
    return Object.keys(errors).length === 0;
  }
</script>

<form method="POST" use:enhance={() => {
  if (!validateForm()) return ({ update }) => update({ reset: false });
}}>
  <label>
    Name:
    <input name="name" bind:value={name} required />
    {#if errors.name}<span class="error">{errors.name}</span>{/if}
  </label>

  <label>
    Goal:
    <textarea name="goal" bind:value={goal} required />
    {#if errors.goal}<span class="error">{errors.goal}</span>{/if}
  </label>

  {#if form?.error}
    <div class="error">{form.error}</div>
  {/if}

  <button type="submit">Create Theme</button>
</form>

<style>
  .error {
    color: red;
    font-size: 0.875rem;
  }
</style>
```

**Corresponding Form Action** (`+page.server.ts`):
```typescript
import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const goal = formData.get('goal') as string;

    if (!name || !goal) {
      return fail(400, { error: 'Name and goal are required' });
    }

    try {
      await prisma.theme.create({
        data: {
          name,
          goal,
          userId: locals.user.id,
        },
      });
    } catch (error) {
      return fail(500, { error: 'Failed to create theme' });
    }

    return { success: true };
  },
};
```

## Critical Checks (Svelte 5)

✅ **MUST**:
- [ ] TypeScript types imported from `$lib/types` or `./$types`
- [ ] Props use `$props()` (NOT `export let`)
- [ ] Local state uses `$state()` (NOT plain variables)
- [ ] Derived values use `$derived()` (NOT `$:` reactive statements)
- [ ] Event handlers use `onclick`, `onchange`, etc. (NOT `on:click`, `on:change`)
- [ ] Events passed as props (e.g., `onedit`, `ondelete`) instead of `createEventDispatcher`
- [ ] Form submissions use `use:enhance` for progressive enhancement
- [ ] Error states handled gracefully

✅ **SHOULD**:
- [ ] Scoped styles (avoid global CSS pollution)
- [ ] Accessibility: ARIA labels, semantic HTML
- [ ] Loading states for async operations
- [ ] Responsive design (mobile-first)
- [ ] Use `$effect()` for side effects (NOT `$:` statements)

## Common Patterns (Svelte 5)

### Conditional Rendering
```svelte
{#if loading}
  <p>Loading...</p>
{:else if error}
  <p class="error">{error}</p>
{:else}
  <div>{data}</div>
{/if}
```

### List Rendering
```svelte
{#each items as item (item.id)}
  <div>{item.name}</div>
{:else}
  <p>No items found</p>
{/each}
```

### Reactive State and Derived Values (Svelte 5)
```svelte
<script lang="ts">
  // Reactive state
  let count = $state(0);

  // Derived value (auto-updates when count changes)
  let doubled = $derived(count * 2);

  // Side effects
  $effect(() => {
    console.log('Count changed:', count);
    // Cleanup function (runs when effect is destroyed)
    return () => {
      console.log('Cleanup');
    };
  });
</script>
```

### Event Handlers (Svelte 5)
```svelte
<script lang="ts">
  let count = $state(0);

  function increment() {
    count++;
  }
</script>

<!-- Use onclick, onchange, etc. (NOT on:click) -->
<button onclick={increment}>Count: {count}</button>
<button onclick={() => count++}>Inline increment</button>
```

### Passing Event Handlers to Child Components (Svelte 5)
```svelte
<!-- ParentComponent.svelte -->
<script lang="ts">
  import ChildComponent from './ChildComponent.svelte';

  function handleCustomEvent(data: { value: string }) {
    console.log('Received:', data.value);
  }
</script>

<!-- Pass as prop with 'on' prefix -->
<ChildComponent oncustom={handleCustomEvent} />

<!-- ChildComponent.svelte -->
<script lang="ts">
  // Receive event handler as prop
  let { oncustom }: {
    oncustom?: (data: { value: string }) => void;
  } = $props();

  function triggerEvent() {
    oncustom?.({ value: 'hello' });
  }
</script>

<button onclick={triggerEvent}>Trigger</button>
```

## Key Gotchas (Svelte 5)

1. **Props are NOT reactive by default**: Use `$state()` for local reactive state
   ```svelte
   <script>
     // ❌ Wrong: Not reactive
     let { data } = $props();
     let items = data.items; // Not reactive!

     // ✅ Correct: Reactive
     let { data } = $props();
     let items = $state(data.items); // Reactive!
   </script>
   ```

2. **Event handlers are lowercase**: `onclick`, NOT `onClick`

3. **Pass event handlers as props**: Use props with `on` prefix (e.g., `onedit`, `ondelete`)

4. **Use Runes for reactivity**: `$derived()` for computed values, `$effect()` for side effects

5. **Component types**: Use `Component` from `'svelte'` for TypeScript types

## References

- Svelte 5 Runes Documentation: https://svelte.dev/docs/svelte/$state
- SvelteKit Routing: https://kit.svelte.dev/docs/routing
- Form Actions: https://kit.svelte.dev/docs/form-actions
- Load Functions: https://kit.svelte.dev/docs/load
- Technical Documentation: `docs/tech/deno_deploy_sveltekit_注意点_2025.md`
