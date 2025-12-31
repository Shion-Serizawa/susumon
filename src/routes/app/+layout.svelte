<script lang="ts">
  // TODO: Add authentication check and redirect to /login if not authenticated
  // For now, relies on mock auth in hooks.server.ts
</script>

<div class="app-layout">
  <header>
    <nav>
      <h1><a href="/app">Susumon</a></h1>
      <!-- TODO: Add navigation links -->
    </nav>
  </header>

  <main>
    <slot />
  </main>
</div>

<style>
  .app-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  header {
    padding: 1rem;
    border-bottom: 1px solid #e0e0e0;
  }

  nav h1 {
    margin: 0;
  }

  nav a {
    color: inherit;
    text-decoration: none;
  }

  nav a:hover {
    text-decoration: underline;
  }

  main {
    flex: 1;
    padding: 2rem;
  }
</style>
