<script lang="ts">
  import { goto } from '$app/navigation';
  import type { PageData } from './$types';
  import type { ApiErrorResponse } from '$lib/types';
  import { getMockThemesPage, type ThemeListItem } from '$lib/mocks/themes';

  let { data }: { data: PageData } = $props();

  let source = $state(data.source);
  let includeCompleted = $state(data.includeCompleted);
  let includeArchived = $state(data.includeArchived);
  let limit = $state(data.limit);

  let items = $state<ThemeListItem[]>(data.items);
  let nextCursor = $state<string | null>(data.nextCursor);

  let isLoadingMore = $state(false);
  let loadError = $state<string | null>(null);

  let sentinel: HTMLDivElement | null = $state(null);

  function updateQuery(next: { includeCompleted: boolean; includeArchived: boolean }) {
    const sp = new URLSearchParams();
    if (next.includeCompleted) sp.set('includeCompleted', 'true');
    if (next.includeArchived) sp.set('includeArchived', 'true');
    goto(`/app/themes?${sp.toString()}`, { replaceState: true });
  }

  function buildThemesUrl(params: {
    includeCompleted: boolean;
    includeArchived: boolean;
    limit: number;
    cursor: string | null;
  }): string {
    const sp = new URLSearchParams();
    if (params.includeCompleted) sp.set('includeCompleted', 'true');
    if (params.includeArchived) sp.set('includeArchived', 'true');
    sp.set('limit', String(params.limit));
    if (params.cursor) sp.set('cursor', params.cursor);
    return `/api/themes?${sp.toString()}`;
  }

  async function loadMore() {
    if (isLoadingMore) return;
    if (!nextCursor) return;

    isLoadingMore = true;
    loadError = null;

    try {
      if (source === 'mock') {
        const page = getMockThemesPage({
          includeCompleted,
          includeArchived,
          limit,
          cursor: nextCursor,
        });
        items = [...items, ...page.items];
        nextCursor = page.nextCursor;
        return;
      }

      const res = await fetch(
        buildThemesUrl({ includeCompleted, includeArchived, limit, cursor: nextCursor })
      );
      if (!res.ok) {
        const contentType = res.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
          const body = (await res.json()) as ApiErrorResponse;
          loadError = body?.error?.message ?? `Failed to load (${res.status})`;
        } else {
          loadError = `Failed to load (${res.status})`;
        }
        return;
      }

      const body = (await res.json()) as { items: ThemeListItem[]; nextCursor: string | null };
      items = [...items, ...body.items];
      nextCursor = body.nextCursor;
    } catch (e) {
      loadError = e instanceof Error ? e.message : 'Failed to load';
    } finally {
      isLoadingMore = false;
    }
  }

  $effect(() => {
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '300px 0px' }
    );
    observer.observe(sentinel);
      return () => observer.disconnect();
  });

  $effect(() => {
    source = data.source;
    includeCompleted = data.includeCompleted;
    includeArchived = data.includeArchived;
    limit = data.limit;
    items = data.items;
    nextCursor = data.nextCursor;
    isLoadingMore = false;
    loadError = null;
  });
</script>

<div class="mx-auto max-w-4xl">
  <div class="mb-6 flex items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-semibold">Themes</h1>
      <p class="text-sm text-gray-600">Manage your learning themes.</p>
    </div>
    <a
      href="/app/themes/new"
      class="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
    >
      New Theme
    </a>
  </div>

  {#if source === 'mock'}
    <div class="mb-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      Theme API is not implemented yet. Showing mock data so you can continue UI work.
    </div>
  {/if}

  <div class="mb-4 flex flex-wrap items-center gap-3">
    <label class="inline-flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        class="rounded border-gray-300"
        checked={includeCompleted}
        onchange={(e) => {
          includeCompleted = (e.currentTarget as HTMLInputElement).checked;
          updateQuery({ includeCompleted, includeArchived });
        }}
      />
      Include completed
    </label>

    <label class="inline-flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        class="rounded border-gray-300"
        checked={includeArchived}
        onchange={(e) => {
          includeArchived = (e.currentTarget as HTMLInputElement).checked;
          updateQuery({ includeCompleted, includeArchived });
        }}
      />
      Include archived
    </label>
  </div>

  {#if items.length === 0}
    <div class="rounded-md border border-dashed p-6 text-center text-sm text-gray-600">
      No themes yet.
    </div>
  {:else}
    <div class="grid gap-3">
      {#each items as theme (theme.id)}
        <a
          href={`/app/themes/${theme.id}`}
          class="block rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-base font-medium">{theme.name}</h2>
                {#if theme.shortName}
                  <span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                    {theme.shortName}
                  </span>
                {/if}
              </div>
              <p class="mt-1 text-sm text-gray-700">{theme.goal}</p>
            </div>
            <div class="flex items-center gap-2">
              {#if theme.state !== 'ACTIVE'}
                <span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{theme.state}</span>
              {/if}
              {#if theme.isCompleted}
                <span class="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">Completed</span>
              {/if}
            </div>
          </div>
        </a>
      {/each}
    </div>

    <div class="mt-6 flex flex-col items-center gap-2">
      {#if loadError}
        <div class="text-sm text-red-700">{loadError}</div>
      {/if}

      {#if nextCursor}
        <button
          class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          onclick={loadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? 'Loading…' : 'Load more'}
        </button>
      {:else}
        <div class="text-sm text-gray-500">No more themes.</div>
      {/if}

      <div bind:this={sentinel} class="h-1 w-full" />
    </div>
  {/if}
</div>
