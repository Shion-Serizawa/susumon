<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  let theme = $derived(data.theme);
  let recentLogs = $derived(data.recentLogs);
  let logsSource = $derived(data.logsSource);
</script>

<div class="mx-auto max-w-3xl">
  <div class="mb-6 flex items-start justify-between gap-4">
    <div>
      <div class="flex flex-wrap items-center gap-2">
        <h1 class="text-2xl font-semibold">{theme.name}</h1>
        {#if theme.shortName}
          <span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{theme.shortName}</span>
        {/if}
        {#if theme.isCompleted}
          <span class="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">達成済み</span>
        {/if}
        {#if theme.state !== "ACTIVE"}
          <span class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{theme.state}</span>
        {/if}
      </div>
      <p class="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{theme.goal}</p>
    </div>

    <div class="flex items-center gap-2">
      <a
        href={`/app/themes/${theme.id}/edit`}
        class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
      >
        編集
      </a>
      <a
        href={`/app/themes/${theme.id}/delete`}
        class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 hover:bg-red-100"
      >
        削除
      </a>
    </div>
  </div>

  <section class="rounded-lg border border-gray-200 bg-white p-4">
    <div class="mb-3 flex items-center justify-between gap-3">
      <h2 class="text-base font-medium">関連ログ（直近）</h2>
      <a href="/app/logs" class="text-sm text-blue-700 hover:underline">一覧へ</a>
    </div>

    {#if logsSource === "unavailable"}
      <div class="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        ログ API は未実装です。バックエンドの logs エンドポイント実装後に表示されます。
      </div>
    {/if}

    {#if recentLogs.length === 0}
      <div class="text-sm text-gray-600">ログがまだありません。</div>
    {:else}
      <ul class="divide-y divide-gray-100">
        {#each recentLogs as log (log.id)}
          <li class="py-3">
            <div class="flex items-center justify-between gap-3">
              <div class="text-sm font-medium">{log.date}</div>
              <a href={`/app/logs/${log.id}`} class="text-sm text-blue-700 hover:underline">開く</a>
            </div>
            <div class="mt-1 text-sm text-gray-700">{log.summary}</div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <div class="mt-6">
    <a href="/app/themes" class="text-sm text-gray-700 hover:underline">← テーマ一覧へ戻る</a>
  </div>
</div>
