<script lang="ts">
  import { enhance } from "$app/forms";
  import ThemeDeleteDialog from "$lib/components/ThemeDeleteDialog.svelte";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let formError = $derived(form?.formError ?? null);
</script>

<form method="POST" use:enhance>
  <ThemeDeleteDialog
    themeName={data.theme.name}
    cancelHref={`/app/themes/${data.theme.id}`}
    formError={formError}
  />
</form>

