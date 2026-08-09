<script lang="ts">
  import { page } from '$app/state';
</script>

<div class="error-container">
  <h1>Error ({page.status})</h1>
  <p>Something went wrong...</p>
  <p>The server said: {page.error?.message}</p>
  <p>
    This incident is unlikely logged, so you will have to describe the exact steps you took to get
    here...
  </p>
  <p>Your user ID is: {page.data.user.id}</p>
</div>
