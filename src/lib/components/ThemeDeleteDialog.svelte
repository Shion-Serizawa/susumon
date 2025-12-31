<script lang="ts">
  let {
    themeName,
    cancelHref,
    formError = null,
  }: {
    themeName: string;
    cancelHref: string;
    formError?: string | null;
  } = $props();
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
  role="dialog"
  aria-modal="true"
  aria-label="テーマを削除"
>
  <div class="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
    <h2 class="text-lg font-semibold text-gray-900">テーマを削除</h2>

    <p class="mt-2 text-sm text-gray-700">
      <span class="font-medium">{themeName}</span> を削除しますか？
    </p>

    <div
      id="delete-warning"
      class="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
    >
      関連するラーニングログ/メタノートも削除されます（論理削除）。この操作は UI 上は取り消せない想定です。
    </div>

    {#if formError}
      <div class="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        {formError}
      </div>
    {/if}

    <div class="mt-5 grid grid-cols-2 gap-3">
      <a
        href={cancelHref}
        class="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50"
      >
        キャンセル
      </a>
      <button
        type="submit"
        aria-describedby="delete-warning"
        class="inline-flex w-full items-center justify-center rounded-md bg-red-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
      >
        削除する
      </button>
    </div>
  </div>
</div>
