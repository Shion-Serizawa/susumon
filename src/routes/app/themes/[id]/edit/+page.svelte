<script lang="ts">
  import { enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let name = $state(form?.values?.name ?? data.theme.name);
  let shortName = $state(form?.values?.shortName ?? (data.theme.shortName ?? ""));
  let goal = $state(form?.values?.goal ?? data.theme.goal);
  let isCompleted = $state(form?.values?.isCompleted ?? data.theme.isCompleted);

  let fieldErrors = $state<Record<string, string>>(form?.fieldErrors ?? {});
  let formError = $state<string | null>(form?.formError ?? null);

  $effect(() => {
    name = form?.values?.name ?? data.theme.name;
    shortName = form?.values?.shortName ?? (data.theme.shortName ?? "");
    goal = form?.values?.goal ?? data.theme.goal;
    isCompleted = form?.values?.isCompleted ?? data.theme.isCompleted;
    fieldErrors = form?.fieldErrors ?? {};
    formError = form?.formError ?? null;
  });
</script>

<div class="mx-auto max-w-2xl">
  <div class="mb-6">
    <h1 class="text-2xl font-semibold">Edit Theme</h1>
    <p class="text-sm text-gray-600">{data.theme.name}</p>
  </div>

  {#if formError}
    <div class="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      {formError}
    </div>
  {/if}

  <form method="POST" use:enhance class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-900" for="name">Name</label>
      <input
        id="name"
        name="name"
        class="mt-1 w-full rounded-md border-gray-300"
        value={name}
        oninput={(e) => {
          name = (e.currentTarget as HTMLInputElement).value;
          if (fieldErrors.name) fieldErrors = { ...fieldErrors, name: "" };
        }}
        required
      />
      {#if fieldErrors.name}
        <p class="mt-1 text-sm text-red-700">{fieldErrors.name}</p>
      {/if}
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-900" for="shortName">Short name (optional)</label>
      <input
        id="shortName"
        name="shortName"
        class="mt-1 w-full rounded-md border-gray-300"
        value={shortName}
        oninput={(e) => {
          shortName = (e.currentTarget as HTMLInputElement).value;
          if (fieldErrors.shortName) fieldErrors = { ...fieldErrors, shortName: "" };
        }}
      />
      {#if fieldErrors.shortName}
        <p class="mt-1 text-sm text-red-700">{fieldErrors.shortName}</p>
      {/if}
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-900" for="goal">Goal</label>
      <textarea
        id="goal"
        name="goal"
        class="mt-1 w-full rounded-md border-gray-300"
        rows="4"
        value={goal}
        oninput={(e) => {
          goal = (e.currentTarget as HTMLTextAreaElement).value;
          if (fieldErrors.goal) fieldErrors = { ...fieldErrors, goal: "" };
        }}
        required
      />
      {#if fieldErrors.goal}
        <p class="mt-1 text-sm text-red-700">{fieldErrors.goal}</p>
      {/if}
    </div>

    <div class="flex items-center gap-2">
      <input
        id="isCompleted"
        name="isCompleted"
        type="checkbox"
        class="rounded border-gray-300"
        checked={isCompleted}
        onchange={(e) => {
          isCompleted = (e.currentTarget as HTMLInputElement).checked;
        }}
      />
      <label for="isCompleted" class="text-sm text-gray-900">Completed</label>
    </div>

    <div class="flex items-center justify-end gap-3 pt-2">
      <a href={`/app/themes/${data.theme.id}`} class="text-sm text-gray-700 hover:underline">Cancel</a>
      <button
        type="submit"
        class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Save
      </button>
    </div>
  </form>
</div>

