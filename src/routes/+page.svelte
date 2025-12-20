<script lang="ts">
  // Root landing page - redirect to app or login based on auth status
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(async () => {
    // Check authentication status
    const response = await fetch('/api/auth/session');
    const data = await response.json();

    if (data.authenticated) {
      // User is logged in, redirect to app
      goto('/app');
    } else {
      // Not logged in, redirect to login
      goto('/login');
    }
  });
</script>

<div class="loading">
  <p>Loading...</p>
</div>

<style>
  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }
</style>
